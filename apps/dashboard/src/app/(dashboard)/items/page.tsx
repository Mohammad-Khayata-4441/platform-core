'use client';

import { Suspense } from 'react';
import { ItemsResource } from '@/modules/items/items.resource';
import { ItemsForm } from '@/modules/items/items-form';
import { createItemsColumns } from '@/modules/items/items-columns';

export default function ItemsPage() {
  return (
    <Suspense>
      <ItemsResource>
        <ItemsResource.Page
          title="Items"
          actions={
            <ItemsResource.FormDialog
              title={(item) => (item?.id ? 'Edit item' : 'New item')}
              form={ItemsForm}
            />
          }
        >
          <ItemsResource.Table columns={createItemsColumns} />
        </ItemsResource.Page>
      </ItemsResource>
    </Suspense>
  );
}
