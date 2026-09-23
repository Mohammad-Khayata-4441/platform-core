import { Controller } from '@nestjs/common';
import { createCrudController } from '@core/backend-core';
import { ItemsService } from './items.service.js';
import { CreateItemDto, ItemResponseDto, UpdateItemDto } from './dto/items.dto.js';

const CrudBase = createCrudController<ItemResponseDto, CreateItemDto, UpdateItemDto>({
  responseDto: ItemResponseDto,
  createDto: CreateItemDto,
  updateDto: UpdateItemDto,
  filterSchema: [
    { field: 'sku', type: 'string' },
    { field: 'status', type: 'enum', enumValues: ['DRAFT', 'ACTIVE', 'ARCHIVED'] },
  ],
  openApi: {
    list: { operation: { summary: 'List items' } },
    show: { operation: { summary: 'Get an item' } },
    create: { operation: { summary: 'Create an item' } },
    update: { operation: { summary: 'Update an item' } },
    delete: { operation: { summary: 'Delete an item' } },
  },
  permissions: {
    view: 'items.view',
    create: 'items.create',
    update: 'items.update',
    delete: 'items.delete',
  },
});

@Controller('example/items')
export class ItemsController extends CrudBase {
  constructor(service: ItemsService) {
    super(service, 'Item');
  }
}
