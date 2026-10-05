import { createLocalStorageDriver, createS3StorageDriver, type StorageDriver } from '@core/files';

export interface FilesConfig {
  driver: string;
  maxBytes: number;
  allowedTypes: string[];
  localRoot: string;
  localPublicUrl: string;
  s3: {
    bucket?: string;
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    publicUrl?: string;
    endpoint?: string;
  };
}

function required(name: string, value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) throw new Error(`${name} is required when STORAGE_DRIVER is s3`);
  return trimmed;
}

/** The environment picks the driver. The url stored on a File is the url that driver returns. */
export async function storageFromConfig(config: FilesConfig): Promise<StorageDriver> {
  if (config.driver === 's3') {
    const bucket = required('S3_BUCKET', config.s3.bucket);
    const region = required('S3_REGION', config.s3.region);
    const accessKeyId = required('S3_ACCESS_KEY_ID', config.s3.accessKeyId);
    const secretAccessKey = required('S3_SECRET_ACCESS_KEY', config.s3.secretAccessKey);
    const publicBaseUrl = required('S3_PUBLIC_URL', config.s3.publicUrl);
    const { createAwsObjectClient } = await import('@core/files/s3');
    return createS3StorageDriver({
      bucket,
      publicBaseUrl,
      client: createAwsObjectClient({
        region,
        accessKeyId,
        secretAccessKey,
        ...(config.s3.endpoint ? { endpoint: config.s3.endpoint } : {}),
      }),
    });
  }
  if (config.driver !== 'local') {
    throw new Error('STORAGE_DRIVER must be local or s3');
  }
  return createLocalStorageDriver({
    root: config.localRoot,
    publicBaseUrl: config.localPublicUrl,
  });
}
