import { AlertTriangle, Boxes, IndianRupee, Package, PackageX } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState } from '@/components/ErrorState';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useInventoryReport } from '@/api/reports';
import { formatCurrency } from '@/lib/utils';

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
        </div>
        <div className="rounded-full bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

export function InventoryReportPage() {
  const { data, isPending, isError, error, refetch } = useInventoryReport();

  return (
    <div>
      <PageHeader title="Inventory Report" description="Snapshot of your current stock position" />

      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isPending && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Products" value={String(data.totalProducts)} icon={Package} />
          <StatCard label="Total Units" value={String(data.totalUnits)} icon={Boxes} />
          <StatCard label="Inventory Value" value={formatCurrency(data.inventoryValue)} icon={IndianRupee} />
          <StatCard label="Low Stock" value={String(data.lowStockCount)} icon={AlertTriangle} />
          <StatCard label="Out of Stock" value={String(data.outOfStockCount)} icon={PackageX} />
        </div>
      )}
    </div>
  );
}
