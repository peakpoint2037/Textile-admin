import * as React from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { DateRangeFilter, useDefaultDateRange, type DateRange } from '@/components/DateRangeFilter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSalesReport } from '@/api/reports';
import { useExportExcel } from '@/api/excel';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Download } from 'lucide-react';

export function SalesReportPage() {
  const defaultRange = useDefaultDateRange();
  const [range, setRange] = React.useState<DateRange>(defaultRange);
  const { data, isPending, isError, error, refetch } = useSalesReport(range);
  const exportMutation = useExportExcel();

  return (
    <div>
      <PageHeader
        title="Sales Report"
        actions={
          <>
            <DateRangeFilter value={range} onChange={setRange} />
            <Button variant="outline" onClick={() => exportMutation.mutate({ kind: 'sales', range })}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </>
        }
      />

      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}
      {isPending && <Skeleton className="h-96 w-full" />}

      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className="text-xl font-semibold">{formatCurrency(data.revenue)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Orders</p>
                <p className="text-xl font-semibold">{data.orders}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Units Sold</p>
                <p className="text-xl font-semibold">{data.unitsSold}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Avg Order Value</p>
                <p className="text-xl font-semibold">{formatCurrency(data.averageOrderValue)}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue by day</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {data.salesByDay.length === 0 ? (
                <EmptyState title="No sales in this range" className="h-full border-none py-0" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.salesByDay}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} fontSize={12} />
                    <YAxis fontSize={12} width={40} />
                    <Tooltip labelFormatter={(d) => formatDate(d as string)} formatter={(v: number) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="revenue" stroke="#1e3a5f" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {data.salesByDay.length === 0 ? (
                <EmptyState title="No sales in this range" className="border-none py-8" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.salesByDay.map((day) => (
                      <TableRow key={day.date}>
                        <TableCell>{formatDate(day.date)}</TableCell>
                        <TableCell className="text-right">{day.orders}</TableCell>
                        <TableCell className="text-right">{day.units}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatCurrency(day.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
