import type { StorageDriver } from './storage.js';

/** A stored file. The delegate returns this row. There is no tenant column. */
export interface FileRecord {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  path: string;
  url: string;
  uploadedById: string;
  createdAt: Date;
}

/** What create, read, and delete return. `type` is the stored media type. */
export interface FileView {
  id: string;
  name: string;
  type: string;
  size: number;
  path: string;
  url: string;
  uploadedById: string;
}

export interface Upload {
  name: string;
  mediaType: string;
  bytes: Uint8Array;
}

/** Structural slice of `prisma.file`. This package does not import Prisma. */
export interface FileDelegate {
  create(args: {
    data: {
      name: string;
      mediaType: string;
      size: number;
      path: string;
      url: string;
      uploadedById: string;
    };
  }): Promise<FileRecord>;
  findFirst(args: { where: { id: string } }): Promise<FileRecord | null>;
  delete(args: { where: { id: string } }): Promise<FileRecord>;
}

export interface FileServiceOptions {
  files: FileDelegate;
  storage: StorageDriver;
  maxBytes: number;
  allowedTypes: readonly string[];
}

/** Raised by file use-cases. The Nest adapter turns it into an HTTP error. */
export class FileError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'FileError';
    this.status = status;
  }
}

function mediaTypeOf(value: string): string {
  return value.split(';')[0]?.trim().toLowerCase() ?? '';
}

function toView(row: FileRecord): FileView {
  return {
    id: row.id,
    name: row.name,
    type: row.mediaType,
    size: row.size,
    path: row.path,
    url: row.url,
    uploadedById: row.uploadedById,
  };
}

/**
 * Upload, read, and delete. Query shape lives here. The app supplies the Prisma
 * accessor and the driver the environment selected.
 */
export class FileService {
  private readonly allowed: Set<string>;

  constructor(private readonly options: FileServiceOptions) {
    if (!Number.isInteger(options.maxBytes) || options.maxBytes < 1) {
      throw new Error('File max size must be a positive integer');
    }
    this.allowed = new Set(options.allowedTypes.map((type) => type.toLowerCase()));
  }

  async upload(
    permissions: readonly string[],
    uploadedById: string,
    upload: Upload,
  ): Promise<FileView> {
    this.assertCan(permissions, 'files.create');
    const size = upload.bytes.byteLength;
    if (size === 0) throw new FileError('An empty file is not allowed', 400);
    if (size > this.options.maxBytes) throw new FileError('File is too large', 400);
    const mediaType = mediaTypeOf(upload.mediaType);
    if (!this.allowed.has(mediaType)) throw new FileError('This file type is not allowed', 400);

    const stored = await this.options.storage.put({
      name: upload.name,
      mediaType,
      bytes: upload.bytes,
    });
    try {
      const row = await this.options.files.create({
        data: {
          name: upload.name,
          mediaType,
          size,
          path: stored.path,
          url: stored.url,
          uploadedById,
        },
      });
      return toView(row);
    } catch (error) {
      await this.options.storage.drop(stored.path);
      throw error;
    }
  }

  async read(permissions: readonly string[], id: string): Promise<FileView> {
    this.assertCan(permissions, 'files.read');
    const row = await this.options.files.findFirst({ where: { id } });
    if (!row) throw new FileError('File not found', 404);
    return toView(row);
  }

  async delete(permissions: readonly string[], id: string): Promise<FileView> {
    this.assertCan(permissions, 'files.delete');
    const existing = await this.options.files.findFirst({ where: { id } });
    if (!existing) throw new FileError('File not found', 404);
    await this.options.files.delete({ where: { id } });
    await this.options.storage.drop(existing.path);
    return toView(existing);
  }

  private assertCan(permissions: readonly string[], key: string): void {
    if (!permissions.includes(key)) {
      throw new FileError('You do not have permission to do that', 403);
    }
  }
}
