import { Injectable } from '@nestjs/common';
import { CrudPresenter } from '@core/backend-core';
import type { ItemResponseDto } from './dto/items.dto.js';
import type { ItemEntity } from './items.repository.js';

@Injectable()
export class ItemsPresenter extends CrudPresenter<ItemEntity, ItemResponseDto> {
  toResponse(item: ItemEntity): ItemResponseDto {
    return {
      id: item.id,
      name: item.name as Record<string, string>,
      sku: item.sku,
      price: Number(item.price),
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
