import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import type { ObjectClient } from './storage.js';

export interface AwsObjectClientOptions {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** Set for a non-AWS endpoint. Path-style addressing is turned on with it. */
  endpoint?: string;
}

/** AWS object client for {@link createS3StorageDriver}. Only constructed when the deployment picks S3. */
export function createAwsObjectClient(options: AwsObjectClientOptions): ObjectClient {
  const client = new S3Client({
    region: options.region,
    credentials: {
      accessKeyId: options.accessKeyId,
      secretAccessKey: options.secretAccessKey,
    },
    ...(options.endpoint ? { endpoint: options.endpoint, forcePathStyle: true } : {}),
  });
  return {
    async putObject(input) {
      await client.send(
        new PutObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
          Body: input.body,
          ContentType: input.contentType,
        }),
      );
    },
    async deleteObject(input) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: input.bucket,
          Key: input.key,
        }),
      );
    },
  };
}
