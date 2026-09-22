import type { LocalizedString } from './i18n.dto';

export type ItemStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface ItemDto {
  id: string;
  name: LocalizedString;
  sku: string;
  price: number;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
}
