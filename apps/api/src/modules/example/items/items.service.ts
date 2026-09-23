import { Injectable } from '@nestjs/common';
import { CrudService } from '@core/backend-core';
import { ItemsRepository, type ItemEntity } from './items.repository.js';
import { ItemsPresenter } from './items.presenter.js';
import type { CreateItemDto, ItemResponseDto, UpdateItemDto } from './dto/items.dto.js';

@Injectable()
export class ItemsService extends CrudService<
  ItemEntity,
  ItemResponseDto,
  CreateItemDto,
  UpdateItemDto
> {
  protected readonly resourceName = 'item';

  constructor(repository: ItemsRepository, presenter: ItemsPresenter) {
    super(repository, presenter);
  }
}
