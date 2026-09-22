import { Module } from '@nestjs/common';
import { ItemsService } from './items.service';
import { ItemsRepository } from './items.repository';
import { ItemsPresenter } from './items.presenter';
import { ItemsController } from './items.controller';

@Module({
  controllers: [ItemsController],
  providers: [ItemsService, ItemsRepository, ItemsPresenter],
})
export class ItemsModule {}
