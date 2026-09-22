import { z } from 'zod';
import type { ResourceFormConfig } from '@core/ui/hooks/use-resource-form-controller';
import { unwrapApiData } from '@core/ui/hooks/unwrap-api-data';

const localizedStringSchema = z.object({
  ar: z.string().trim().min(1, 'Arabic name is required'),
  en: z.string().trim().optional(),
});

export const itemFormSchema = z.object({
  name: localizedStringSchema,
  sku: z.string().trim().min(1, 'SKU is required'),
  price: z.coerce.number().min(0),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).optional(),
});

export type ItemFormValues = z.infer<typeof itemFormSchema>;

export type CreateItemInput = {
  name: { ar: string; en?: string };
  sku: string;
  price: number;
  status?: string;
};
export type UpdateItemInput = Partial<CreateItemInput>;

export const DEFAULT_ITEM_FORM_VALUES: ItemFormValues = {
  name: { ar: '', en: '' },
  sku: '',
  price: 0,
  status: 'DRAFT',
};

export function mapItemToFormValues(data: unknown): ItemFormValues {
  const resolved = unwrapApiData<ItemFormValues>(data);
  return {
    name: resolved.name ?? { ar: '', en: '' },
    sku: resolved.sku ?? '',
    price: resolved.price ?? 0,
    status: resolved.status ?? 'DRAFT',
  };
}

export const itemsFormConfig: ResourceFormConfig<ItemFormValues, CreateItemInput, UpdateItemInput> =
  {
    schema: itemFormSchema,
    defaultValues: DEFAULT_ITEM_FORM_VALUES,
    mapToFormValues: mapItemToFormValues,
    toCreate: (values) => ({
      name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
      sku: values.sku.trim(),
      price: values.price,
      status: values.status,
    }),
    toUpdate: (values) => ({
      name: { ar: values.name.ar.trim(), en: values.name.en?.trim() || undefined },
      sku: values.sku.trim(),
      price: values.price,
      status: values.status,
    }),
  };
