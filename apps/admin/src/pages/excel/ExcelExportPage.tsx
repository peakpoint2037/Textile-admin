import * as React from 'react';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { DateRangeFilter, useDefaultDateRange, type DateRange } from '@/components/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useExportExcel, type ExportKind } from '@/api/excel';

const EXPORTS: Array<{ kind: ExportKind; title: string; description: string; dateScoped: boolean }> = [
  { kind: 'products', title: 'Products', description: 'Full product catalog with prices and stock.', dateScoped: false },
  { kind: 'inventory', title: 'Inventory', description: 'Current stock levels and status for every product.', dateScoped: false },
  { kind: 'orders', title: 'Orders', description: 'Orders placed within the selected date range.', dateScoped: true },
  { kind: 'sales', title: 'Sales', description: 'Daily sales totals within the selected date range.', dateScoped: true },
  { kind: 'profit', title: 'Profit', description: 'Revenue, cost, and profit within the selected date range.', dateScoped: true },
];

export function ExcelExportPage() {
  const defaultRange = useDefaultDateRange();
  const [range, setRange] = React.useState<DateRange>(defaultRange);
  const exportMutation = useExportExcel();

  return (
    <div>
      <PageHeader
        title="Excel Export"
        description="Download your data as .xlsx"
        actions={<DateRangeFilter value={range} onChange={setRange} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORTS.map((item) => (
          <Card key={item.kind}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                disabled={exportMutation.isPending}
                onClick={() => exportMutation.mutate({ kind: item.kind, range: item.dateScoped ? range : undefined })}
              >
                <Download className="h-4 w-4" /> Download
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
