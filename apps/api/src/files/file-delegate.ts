import type { FileDelegate, FileRecord } from '@core/files';
import type { PrismaService } from '@core/db-prisma/nest';

/** Narrow Prisma accessor the files package is allowed to call. */
export function fileDelegate(prisma: PrismaService): FileDelegate {
  return {
    async create(args) {
      const row = await prisma.file.create({ data: args.data });
      return toRecord(row);
    },
    async findFirst(args) {
      const row = await prisma.file.findFirst({ where: { id: args.where.id } });
      return row ? toRecord(row) : null;
    },
    async delete(args) {
      const row = await prisma.file.delete({ where: { id: args.where.id } });
      return toRecord(row);
    },
  };
}

function toRecord(row: {
  id: string;
  name: string;
  mediaType: string;
  size: number;
  path: string;
  url: string;
  uploadedById: string;
  createdAt: Date;
}): FileRecord {
  return {
    id: row.id,
    name: row.name,
    mediaType: row.mediaType,
    size: row.size,
    path: row.path,
    url: row.url,
    uploadedById: row.uploadedById,
    createdAt: row.createdAt,
  };
}
