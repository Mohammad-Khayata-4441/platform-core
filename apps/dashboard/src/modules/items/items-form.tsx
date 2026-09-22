'use client';

import type { ItemsClient } from '@core/api-client/clients';
import {
  ResourceFormShell,
  RhfLocalizedTextField,
  RhfSelectField,
  RhfTextField,
} from '@core/ui/form';
import type { ResourceFormProps } from '@core/ui/data-view';
import { useResourceFormController } from '@core/ui/hooks/use-resource-form-controller';
import { itemsFormConfig, type ItemFormValues } from './items.config';
import type { AppApi } from '@/config/api';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export function ItemsForm({ resourceId, initialData, onSuccess, paramKey }: ResourceFormProps<ItemsClient>) {
  const ctrl = useResourceFormController<ItemsClient, ItemFormValues>({
    config: itemsFormConfig,
    getClient: (api) => (api as AppApi).items,
    entityLabel: 'Item',
    resourceId,
    initialData,
    paramKey,
    onSuccess,
  });

  return (
    <ResourceFormShell ctrl={ctrl}>
      <RhfLocalizedTextField
        name="name"
        label="Name"
        required
        disabled={ctrl.isBusy}
        placeholder={{ ar: 'الاسم', en: 'Name' }}
      />
      <RhfTextField name="sku" label="SKU" required disabled={ctrl.isBusy} />
      <RhfTextField name="price" label="Price" required disabled={ctrl.isBusy} />
      <RhfSelectField
        name="status"
        label="Status"
        options={STATUS_OPTIONS}
        disabled={ctrl.isBusy}
      />
    </ResourceFormShell>
  );
}
