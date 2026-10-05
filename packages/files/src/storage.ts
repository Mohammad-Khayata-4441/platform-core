import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Where a driver put an object. The File stores both values as the driver returned them. */
export interface StoredObject {
  path: string;
  url: string;
}

export interface StoredUpload {
  name: string;
  mediaType: string;
  bytes: Uint8Array;
}

/** The storage port. A local driver and an S3 driver both implement it. */
export interface StorageDriver {
  put(object: StoredUpload): Promise<StoredObject>;
  drop(path: string): Promise<void>;
}

/** The network call the S3 driver makes. Tests pass a fake. Production passes the AWS client. */
export interface ObjectClient {
  putObject(input: {
    bucket: string;
    key: string;
    body: Uint8Array;
    contentType: string;
  }): Promise<void>;
  deleteObject(input: { bucket: string; key: string }): Promise<void>;
}

export interface LocalStorageOptions {
  root: string;
  publicBaseUrl: string;
}

export interface S3StorageOptions {
  bucket: string;
  publicBaseUrl: string;
  client: ObjectClient;
}

/** Keep the original name recognizable and stop it from escaping the storage root. */
function storedName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'file';
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '');
  return `${randomUUID()}-${cleaned.length > 0 ? cleaned : 'file'}`;
}

function baseUrl(value: string): string {
  return value.replace(/\/$/, '');
}

/** Writes the bytes under `root` and returns that path plus a url under the public base. */
export function createLocalStorageDriver(options: LocalStorageOptions): StorageDriver {
  const urlBase = baseUrl(options.publicBaseUrl);
  return {
    async put(object) {
      const key = storedName(object.name);
      await mkdir(options.root, { recursive: true });
      const path = join(options.root, key);
      await writeFile(path, object.bytes);
      return { path, url: `${urlBase}/${key}` };
    },
    async drop(path) {
      await rm(path, { force: true });
    },
  };
}

/**
 * Puts the bytes through the object client. The path is `s3://bucket/key` and the url
 * is the deployment's public base plus that key.
 */
export function createS3StorageDriver(options: S3StorageOptions): StorageDriver {
  const urlBase = baseUrl(options.publicBaseUrl);
  const prefix = `s3://${options.bucket}/`;
  return {
    async put(object) {
      const key = storedName(object.name);
      await options.client.putObject({
        bucket: options.bucket,
        key,
        body: object.bytes,
        contentType: object.mediaType,
      });
      return { path: `${prefix}${key}`, url: `${urlBase}/${key}` };
    },
    async drop(path) {
      if (!path.startsWith(prefix)) {
        throw new Error(`Not an object in bucket ${options.bucket}`);
      }
      await options.client.deleteObject({ bucket: options.bucket, key: path.slice(prefix.length) });
    },
  };
}
