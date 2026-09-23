import { Module } from '@nestjs/common';
import { ItemsService } from './items.service.js';
import { ItemsRepository } from './items.repository.js';
import { ItemsPresenter } from './items.presenter.js';
import { ItemsController } from './items.controller.js';

@Module({
  controllers: [ItemsController],
  providers: [ItemsService, ItemsRepository, ItemsPresenter],
})
export class ItemsModule {}
