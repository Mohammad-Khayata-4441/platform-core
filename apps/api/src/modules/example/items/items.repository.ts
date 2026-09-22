import { Injectable } from '@nestjs/common';
import { CrudRepository, type TenantEntity } from '@core/backend-core';
import type { Item, Prisma } from '@core/db-prisma';
import { PrismaService } from '@core/db-prisma/nest';

export type ItemEntity = Item & TenantEntity;

@Injectable()
export class ItemsRepository extends CrudRepository<ItemEntity, Prisma.ItemDelegate> {
  constructor(prisma: PrismaService) {
    super(prisma.item);
  }
}
