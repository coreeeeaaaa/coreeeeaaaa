import { Storage } from '@google-cloud/storage';

const storage = new Storage();

async function setupImmutableBucket(bucketName: string) {
  const bucket = storage.bucket(bucketName);

  // Enable versioning
  await bucket.setMetadata({
    versioning: {
      enabled: true,
    },
  });

  // Set retention policy (Object Lock equivalent)
  const retentionPeriod = 365 * 24 * 60 * 60; // 1 year in seconds
  await bucket.setRetentionPeriod(retentionPeriod);

  console.log(`Immutable bucket ${bucketName} configured with versioning and retention.`);
  console.warn('Warning: Ensure no PII or secrets are stored in this bucket. Violations may lead to data exposure.');
}

if (require.main === module) {
  const bucketName = process.argv[2];
  if (!bucketName) {
    console.error('Usage: ts-node setup-immutable-bucket.ts <bucket-name>');
    process.exit(1);
  }
  setupImmutableBucket(bucketName).catch(console.error);
}