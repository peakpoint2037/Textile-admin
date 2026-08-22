import * as React from 'react';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState } from '@/components/ErrorState';
import { DateRangeFilter, useDefaultDateRange, type DateRange } from '@/components/DateRangeFilter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useProfitReport } from '@/api/reports';
import { useExportExcel } from '@/api/excel';
import { formatCurrency } from '@/lib/utils';

function ProfitRow({ label, value, emphasis, negative }: { label: string; value: number; emphasis?: boolean; negative?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-3 ${emphasis ? 'text-base font-semibold' : 'text-sm'}`}>
      <span className={emphasis ? '' : 'text-muted-foreground'}>{label}</span>
      <span className={negative ? 'text-destructive' : ''}>{formatCurrency(value)}</span>
    </div>
  );
}

export function ProfitReportPage() {
  const defaultRange = useDefaultDateRange();
  const [range, setRange] = React.useState<DateRange>(defaultRange);
  const { data, isPending, isError, error, refetch } = useProfitReport(range);
  const exportMutation = useExportExcel();

  return (
    <div>
      <PageHeader
        title="Profit Report"
        actions={
          <>
            <DateRangeFilter value={range} onChange={setRange} />
            <Button variant="outline" onClick={() => exportMutation.mutate({ kind: 'profit', range })}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </>
        }
      />

      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {isPending && <Skeleton className="h-96 w-full" />}

      {data && (
        <div className="mx-auto max-w-xl">
          <Card>
            <CardHeader>
              <CardTitle>Revenue → Gross Profit</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <ProfitRow label="Revenue" value={data.revenue} />
              <ProfitRow label="Product Cost" value={-data.productCost} negative />
              <ProfitRow label="Gross Profit" value={data.grossProfit} emphasis />
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Gross Profit → Net Profit</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <ProfitRow label="Gross Profit" value={data.grossProfit} />
              <ProfitRow label="Expenses" value={-data.expenses} negative />
              <ProfitRow
                label="Net Profit"
                value={data.netProfit}
                emphasis
                negative={data.netProfit < 0}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
