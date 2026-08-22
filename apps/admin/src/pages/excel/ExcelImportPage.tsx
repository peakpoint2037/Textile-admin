import { PageHeader } from '@/components/PageHeader';
import { useImportProducts, useImportStock } from '@/api/excel';
import { ImportPanel } from './ImportPanel';

const PRODUCT_COLUMNS = [
  'SKU',
  'Product',
  'Category',
  'Description',
  'Size',
  'Color',
  'Purchase Price',
  'Selling Price',
  'Stock',
  'Low Stock Limit',
  'Status',
];

const STOCK_COLUMNS = ['SKU', 'Quantity', 'Reason'];

export function ExcelImportPage() {
  return (
    <div>
      <PageHeader title="Excel Import" description="Upload products or stock in bulk, review issues, then confirm." />

      <div className="grid gap-4 lg:grid-cols-2">
        <ImportPanel
          title="Import Products"
          description="Create new products or update existing ones by SKU."
          columns={PRODUCT_COLUMNS}
          useImportMutation={useImportProducts}
        />
        <ImportPanel
          title="Import Stock"
          description="Add stock to existing products in bulk (a STOCK_IN movement per row)."
          columns={STOCK_COLUMNS}
          useImportMutation={useImportStock}
        />
      </div>
    </div>
  );
}
