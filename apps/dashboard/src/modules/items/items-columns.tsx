import type { ColumnDef } from '@tanstack/react-table';
import type { ItemsClient } from '@core/api-client/clients';
import type { ResourceItem, ResourceTableHelpers } from '@core/ui/data-view';
import { ColumnHeader } from '@core/ui/data-view';

export function createItemsColumns(
  helpers: ResourceTableHelpers<ItemsClient>,
): ColumnDef<ResourceItem<ItemsClient>>[] {
  return [
    {
      accessorKey: 'sku',
      enableSorting: true,
      header: ({ column }) => <ColumnHeader column={column} title="SKU" />,
    },
    {
      id: 'name',
      enableSorting: false,
      header: () => <span>Name</span>,
      cell: ({ row }) => {
        const name = (row.original as { name?: Record<string, string> }).name;
        return name?.en ?? name?.ar ?? '';
      },
    },
    {
      accessorKey: 'price',
      enableSorting: true,
      header: ({ column }) => <ColumnHeader column={column} title="Price" />,
    },
    {
      accessorKey: 'status',
      enableSorting: true,
      header: ({ column }) => <ColumnHeader column={column} title="Status" />,
    },
    helpers.actionsColumn(),
  ];
}
