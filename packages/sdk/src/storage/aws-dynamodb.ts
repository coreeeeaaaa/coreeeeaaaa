import { StorageDriver, LogRecord, GateRecord, StatusSnapshot } from '../types';
import { StorageConfig } from '../config/storage-config';
import { loadCredentials } from '../config/secure-config';

interface DynamoDBItem {
  PK: string; // Partition Key
  SK: string; // Sort Key
  data: any;
  timestamp: string;
  metadata?: {
    source: string;
    version: string;
    encrypted?: boolean;
  };
  ttl?: number; // Time-to-live for automatic expiration
}

export class DynamoStorage implements StorageDriver {
  private docClient: any; // DynamoDB DocumentClient
  private region: string;
  private tableName: string;

  constructor(private cfg: StorageConfig) {
    if (!cfg.region) {
      throw new Error('region is required for AWS DynamoDB');
    }
    this.region = cfg.region;
    this.tableName = process.env.COREEEEAAAA_DYNAMODB_TABLE || 'coreeeeaaaa-storage';
  }

  /**
   * Initialize DynamoDB connection with secure credentials
   */
  private async initializeDynamoDB(): Promise<void> {
    if (this.docClient) return;

    try {
      // Load encrypted credentials
      const credentials = await loadCredentials('aws-dynamodb');

      // Import DynamoDB dynamically
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      const { DynamoDBDocumentClient } = await import('@aws-sdk/lib-dynamodb');

      const client = new DynamoDBClient({
        region: this.region,
        credentials: credentials
      });

      this.docClient = new DynamoDBDocumentClient({
        client,
        marshallOptions: {
          convertEmptyValues: true
        }
      });

      // Test connection
      await this.docClient.send({
        TableName: this.tableName,
        Limit: 1
      });

    } catch (error: any) {
      throw new Error(`Failed to initialize DynamoDB: ${error.message}`);
    }
  }

  /**
   * Create table if it doesn't exist
   */
  private async ensureTable(): Promise<void> {
    try {
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb');
      const { CreateTableCommand } = await import('@aws-sdk/client-dynamodb');

      const credentials = await loadCredentials('aws-dynamodb');
      const client = new DynamoDBClient({
        region: this.region,
        credentials: credentials
      });

      const createTableCommand = new CreateTableCommand({
        TableName: this.tableName,
        AttributeDefinitions: [
          { AttributeName: 'PK', AttributeType: 'S' },
          { AttributeName: 'SK', AttributeType: 'S' }
        ],
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' }
        ],
        BillingMode: 'PAY_PER_REQUEST',
        StreamSpecification: {
          StreamEnabled: false
        },
        TimeToLiveSpecification: {
          Enabled: true,
          AttributeName: 'ttl'
        },
        Tags: [
          { Key: 'Project', Value: 'coreeeeaaaa' },
          { Key: 'Environment', Value: 'production' }
        ]
      });

      await client.send(createTableCommand);
      console.log(`Created DynamoDB table: ${this.tableName}`);

    } catch (error: any) {
      // Table already exists or other non-fatal error
      if (error.name !== 'ResourceInUseException') {
        console.warn(`Table creation warning: ${error.message}`);
      }
    }
  }

  /**
   * Write log entry to DynamoDB
   * PK = LOG#<date>, SK = <timestamp>_<logId>
   */
  async writeLog(record: LogRecord): Promise<void> {
    await this.initializeDynamoDB();
    await this.ensureTable();

    const date = record.ts.slice(0, 10); // YYYY-MM-DD
    const item: DynamoDBItem = {
      PK: `LOG#${date}`,
      SK: `${record.ts}_${record.id}`,
      data: record,
      timestamp: record.ts,
      metadata: {
        source: 'coreeeeaaaa-sdk',
        version: '1.0.0'
      },
      ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
    };

    try {
      await this.docClient.send({
        TableName: this.tableName,
        Item: item
      });
    } catch (error: any) {
      throw new Error(`Failed to write log to DynamoDB: ${error.message}`);
    }
  }

  /**
   * Write gate validation result
   * PK = GATE#<gateId>, SK = <timestamp>
   */
  async writeGate(record: GateRecord): Promise<void> {
    await this.initializeDynamoDB();
    await this.ensureTable();

    const item: DynamoDBItem = {
      PK: `GATE#${record.gateId}`,
      SK: record.timestamp,
      data: record,
      timestamp: record.timestamp,
      metadata: {
        source: 'coreeeeaaaa-sdk',
        version: '1.0.0'
      },
      ttl: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60) // 1 year TTL
    };

    try {
      await this.docClient.send({
        TableName: this.tableName,
        Item: item
      });
    } catch (error: any) {
      throw new Error(`Failed to write gate to DynamoDB: ${error.message}`);
    }
  }

  /**
   * Write status snapshot
   * PK = STATUS#<snapshotId>, SK = <timestamp>
   */
  async writeStatus(record: StatusSnapshot): Promise<void> {
    await this.initializeDynamoDB();
    await this.ensureTable();

    const item: DynamoDBItem = {
      PK: `STATUS#${record.id}`,
      SK: record.timestamp,
      data: record,
      timestamp: record.timestamp,
      metadata: {
        source: 'coreeeeaaaa-sdk',
        version: '1.0.0'
      },
      ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days TTL
    };

    try {
      await this.docClient.send({
        TableName: this.tableName,
        Item: item
      });
    } catch (error: any) {
      throw new Error(`Failed to write status to DynamoDB: ${error.message}`);
    }
  }

  /**
   * Read status snapshot
   */
  async readStatus(snapshotId: string): Promise<StatusSnapshot | null> {
    await this.initializeDynamoDB();

    try {
      const result = await this.docClient.send({
        TableName: this.tableName,
        Key: {
          PK: `STATUS#${snapshotId}`
        },
        Limit: 1,
        ScanIndexForward: false // Get latest item
      });

      if (!result.Items || result.Items.length === 0) {
        return null;
      }

      const item = result.Items[0] as DynamoDBItem;
      return item.data as StatusSnapshot;

    } catch (error: any) {
      throw new Error(`Failed to read status ${snapshotId}: ${error.message}`);
    }
  }

  /**
   * Query logs by date range
   */
  async queryLogs(startDate: string, endDate: string, limit?: number): Promise<LogRecord[]> {
    await this.initializeDynamoDB();

    try {
      const startEpoch = new Date(startDate).getTime();
      const endEpoch = new Date(endDate).getTime();

      // Query multiple date partitions
      const logs: LogRecord[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= new Date(endDate)) {
        const dateStr = currentDate.toISOString().slice(0, 10);

        const result = await this.docClient.send({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk AND SK BETWEEN :start AND :end',
          ExpressionAttributeValues: {
            ':pk': `LOG#${dateStr}`,
            ':start': startDate,
            ':end': endDate
          },
          Limit: limit
        });

        if (result.Items) {
          const dateLogs = result.Items.map((item: DynamoDBItem) => item.data as LogRecord);
          logs.push(...dateLogs);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      return logs.slice(0, limit || logs.length);

    } catch (error: any) {
      throw new Error(`Failed to query logs: ${error.message}`);
    }
  }

  /**
   * Health check for DynamoDB connection
   */
  async healthCheck(): Promise<{ healthy: boolean; details: string }> {
    try {
      await this.initializeDynamoDB();

      const result = await this.docClient.send({
        TableName: this.tableName,
        Limit: 1
      });

      return {
        healthy: true,
        details: `DynamoDB connection healthy (table: ${this.tableName}, region: ${this.region})`
      };

    } catch (error: any) {
      return {
        healthy: false,
        details: `DynamoDB health check failed: ${error.message}`
      };
    }
  }

  /**
   * Close DynamoDB connection
   */
  async close(): Promise<void> {
    if (this.docClient) {
      this.docClient.destroy();
      this.docClient = null;
    }
  }
}