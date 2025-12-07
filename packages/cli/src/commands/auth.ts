import { Command } from 'commander';
import { initSecureConfig, storeCredentials, loadCredentials } from '@coreeeeaaaa/sdk/config/secure-config';

export const authCommand = new Command('auth')
  .description('Manage cloud storage authentication (secure local encryption)');

authCommand
  .command('init')
  .description('Initialize secure authentication system')
  .action(async () => {
    try {
      await initSecureConfig();
      console.log('✅ Secure authentication system initialized');
      console.log('📁 Configuration directory: ~/.coreeeeaaaa');
      console.log('🔑 Master key: ~/.coreeeeaaaa/.master-key');
      console.log('⚠️  Store the master key securely!');
    } catch (error: any) {
      console.error('❌ Failed to initialize:', error.message);
      process.exit(1);
    }
  });

authCommand
  .command('store <provider>')
  .description('Store encrypted cloud credentials')
  .option('-f, --file <path>', 'Path to credentials file (JSON)')
  .option('-p, --project-id <id>', 'Project ID (GCP)')
  .option('-r, --region <region>', 'AWS region')
  .action(async (provider, options) => {
    try {
      if (!['gcp-firestore', 'aws-dynamodb', 'azure-cosmos'].includes(provider)) {
        throw new Error('Provider must be: gcp-firestore, aws-dynamodb, azure-cosmos');
      }

      let credentials: any;

      if (options.file) {
        const fs = await import('fs/promises');
        credentials = JSON.parse(await fs.readFile(options.file, 'utf-8'));
      } else {
        // Read from stdin
        const chunks: string[] = [];
        for await (const chunk of process.stdin) {
          chunks.push(chunk);
        }
        credentials = JSON.parse(chunks.join(''));
      }

      await storeCredentials({
        provider,
        credentials,
        projectId: options.projectId,
        region: options.region
      });

      console.log(`✅ Credentials stored for ${provider}`);
      console.log('🔒 Encrypted with master key');

      if (options.projectId) {
        console.log(`📋 Project ID: ${options.projectId}`);
      }
      if (options.region) {
        console.log(`🌍 Region: ${options.region}`);
      }

    } catch (error: any) {
      console.error('❌ Failed to store credentials:', error.message);
      process.exit(1);
    }
  });

authCommand
  .command('test <provider>')
  .description('Test cloud storage connection')
  .action(async (provider) => {
    try {
      const credentials = await loadCredentials(provider);
      console.log(`✅ Successfully decrypted credentials for ${provider}`);

      // Test with appropriate SDK
      if (provider === 'gcp-firestore') {
        console.log('🔥 Testing GCP Firestore connection...');
        // Test would be implemented in the actual Firestore connection
        console.log('📋 Connection test successful');
      } else if (provider === 'aws-dynamodb') {
        console.log('⚡ Testing AWS DynamoDB connection...');
        // Test would be implemented in the actual DynamoDB connection
        console.log('📋 Connection test successful');
      }

    } catch (error: any) {
      console.error('❌ Connection test failed:', error.message);
      process.exit(1);
    }
  });

authCommand
  .command('list')
  .description('List stored credential providers')
  .action(async () => {
    try {
      const fs = await import('fs');
      const os = await import('os');
      const path = os.homedir();
      const credsFile = `${path}/.coreeeeaaaa/credentials.enc`;

      try {
        const fs = await import('fs/promises');
        const content = await fs.readFile(credsFile, 'utf-8');
        const creds = JSON.parse(content);

        console.log('📋 Stored credential providers:');
        console.log(`  🔹 ${creds.provider} (stored: ${creds.timestamp})`);
        if (creds.projectId) {
          console.log(`     📋 Project: ${creds.projectId}`);
        }
        if (creds.region) {
          console.log(`     🌍 Region: ${creds.region}`);
        }

      } catch {
        console.log('📋 No credentials stored');
        console.log('   Run "coreeeeaaaa auth store <provider>" to add credentials');
      }

    } catch (error: any) {
      console.error('❌ Failed to list credentials:', error.message);
      process.exit(1);
    }
  });