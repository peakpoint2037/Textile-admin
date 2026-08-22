import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, ArrowDownRight, Boxes, IndianRupee, PackageX, Receipt, ShoppingCart, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { DateRangeFilter, useDefaultDateRange, type DateRange } from '@/components/DateRangeFilter';
import { StockStatusBadge } from '@/components/StatusBadge';
import { useDashboard } from '@/api/reports';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Link } from 'react-router-dom';

const CHART_COLORS = ['#1e3a5f', '#3b6ea5', '#6b9bd1', '#a8c8e8', '#d1e3f5', '#8ba888'];

function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  tone?: 'default' | 'warning' | 'destructive';
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
        </div>
        <div
          className={
            tone === 'destructive'
              ? 'rounded-full bg-destructive/10 p-2 text-destructive'
              : tone === 'warning'
                ? 'rounded-full bg-warning/10 p-2 text-warning'
                : 'rounded-full bg-primary/10 p-2 text-primary'
          }
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-2 h-6 w-24" />
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const defaultRange = useDefaultDateRange();
  const [range, setRange] = React.useState<DateRange>(defaultRange);
  const { data, isPending, isError, error, refetch } = useDashboard(range);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of sales, profit and inventory"
        actions={<DateRangeFilter value={range} onChange={setRange} />}
      />

      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isPending && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Revenue" value={formatCurrency(data.revenue)} icon={IndianRupee} />
            <StatCard label="Orders" value={String(data.orders)} icon={ShoppingCart} />
            <StatCard label="Units Sold" value={String(data.unitsSold)} icon={Boxes} />
            <StatCard label="Gross Profit" value={formatCurrency(data.grossProfit)} icon={TrendingUp} />
            <StatCard label="Expenses" value={formatCurrency(data.expenses)} icon={Receipt} />
            <StatCard
              label="Net Profit"
              value={formatCurrency(data.netProfit)}
              icon={data.netProfit >= 0 ? TrendingUp : ArrowDownRight}
              tone={data.netProfit >= 0 ? 'default' : 'destructive'}
            />
            <StatCard label="Low Stock" value={String(data.lowStockCount)} icon={AlertTriangle} tone="warning" />
            <StatCard label="Out of Stock" value={String(data.outOfStockCount)} icon={PackageX} tone="destructive" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Sales over time</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {data.salesByDay.length === 0 ? (
                  <EmptyState title="No sales in this range" className="h-full border-none py-0" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.salesByDay}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tickFormatter={(d) => formatDate(d)} fontSize={12} tickMargin={8} />
                      <YAxis fontSize={12} width={40} />
                      <Tooltip
                        labelFormatter={(d) => formatDate(d as string)}
                        formatter={(v: number) => formatCurrency(v)}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#1e3a5f" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order status</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {data.orderStatusDistribution.length === 0 ? (
                  <EmptyState title="No orders yet" className="h-full border-none py-0" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.orderStatusDistribution}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                      >
                        {data.orderStatusDistribution.map((entry, i) => (
                          <Cell key={entry.status} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend fontSize={12} />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top products</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                {data.topProducts.length === 0 ? (
                  <EmptyState title="No product sales yet" className="h-full border-none py-0" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topProducts} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis type="number" fontSize={12} />
                      <YAxis dataKey="sku" type="category" fontSize={12} width={80} />
                      <Tooltip />
                      <Bar dataKey="unitsSold" fill="#3b6ea5" radius={[0, 4, 4, 0]} name="Units sold" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Low-stock products</CardTitle>
              </CardHeader>
              <CardContent>
                {data.lowStockProducts.length === 0 ? (
                  <EmptyState title="Everything is well stocked" className="border-none py-8" />
                ) : (
                  <ul className="divide-y">
                    {data.lowStockProducts.map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                        <Link to={`/products/${p.id}`} className="hover:underline">
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.sku}</p>
                        </Link>
                        <div className="flex items-center gap-2">
                          <span className="tabular-nums text-muted-foreground">{p.stockQuantity} left</span>
                          <StockStatusBadge status={p.stockStatus} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
