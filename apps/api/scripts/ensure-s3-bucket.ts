import {
  CreateBucketCommand,
  HeadBucketCommand,
  S3Client,
} from '@aws-sdk/client-s3';

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function isNotFoundError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'NotFound' ||
    error.name === 'NoSuchBucket' ||
    error.name === 'UnknownEndpoint' ||
    error.message.includes('NotFound') ||
    error.message.includes('NoSuchBucket') ||
    error.message.includes('404')
  );
}

async function main(): Promise<void> {
  const endpoint = getRequiredEnv('S3_ENDPOINT');
  const bucket = getRequiredEnv('S3_BUCKET');
  const region = process.env.S3_REGION ?? 'auto';
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

  const client = new S3Client({
    endpoint,
    region,
    forcePathStyle,
    credentials: {
      accessKeyId: getRequiredEnv('S3_ACCESS_KEY_ID'),
      secretAccessKey: getRequiredEnv('S3_SECRET_ACCESS_KEY'),
    },
  });

  try {
    await client.send(
      new HeadBucketCommand({
        Bucket: bucket,
      }),
    );
    console.log(`S3 bucket already exists: ${bucket}`);
    return;
  } catch (error) {
    if (!isNotFoundError(error)) {
      throw error;
    }
  }

  await client.send(
    new CreateBucketCommand({
      Bucket: bucket,
    }),
  );
  console.log(`S3 bucket created: ${bucket}`);
}

void main().catch((error: unknown) => {
  console.error('Failed to ensure S3 bucket', error);
  process.exitCode = 1;
});
