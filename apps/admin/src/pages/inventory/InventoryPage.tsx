import * as React from 'react';
import { Link } from 'react-router-dom';
import { Boxes, History, Search } from 'lucide-react';
import type { InventoryListItemDto } from '@textile-admin/shared';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Pagination } from '@/components/Pagination';
import { ProductStatusBadge, StockStatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useInventory } from '@/api/inventory';
import { formatDateTime } from '@/lib/utils';
import { AdjustStockDialog, StockInDialog } from './StockActionDialogs';

const ALL = '__all__';

export function InventoryPage() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [stockStatus, setStockStatus] = React.useState(ALL);
  const [stockInTarget, setStockInTarget] = React.useState<InventoryListItemDto | null>(null);
  const [adjustTarget, setAdjustTarget] = React.useState<InventoryListItemDto | null>(null);

  const { data, isPending, isError, error, refetch } = useInventory({
    page,
    limit,
    search: search || undefined,
    stockStatus: stockStatus === ALL ? undefined : (stockStatus as InventoryListItemDto['stockStatus']),
  });

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Current stock levels for every product"
        actions={
          <Button variant="outline" asChild>
            <Link to="/inventory/movements">
              <History className="h-4 w-4" /> Stock History
            </Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search product or SKU…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={stockStatus}
          onValueChange={(v) => {
            setStockStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Stock" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Stock</SelectItem>
            <SelectItem value="IN_STOCK">In Stock</SelectItem>
            <SelectItem value="LOW">Low Stock</SelectItem>
            <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError && <ErrorState message={(error as Error).message} onRetry={() => refetch()} />}

      {isPending && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {data && data.items.length === 0 && <EmptyState icon={Boxes} title="No products found" />}

      {data && data.items.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Color</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Low Stock Limit</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.sku}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.size ?? '—'}</TableCell>
                  <TableCell>{item.color ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">{item.stockQuantity}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {item.lowStockLimit}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <StockStatusBadge status={item.stockStatus} />
                      <ProductStatusBadge status={item.status} />
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(item.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setStockInTarget(item)}>
                      Stock In
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setAdjustTarget(item)}>
                      Adjust
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/inventory/movements?productId=${item.id}`}>History</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination pagination={data.pagination} onPageChange={setPage} onLimitChange={setLimit} />
        </div>
      )}

      <StockInDialog product={stockInTarget} onOpenChange={(open) => !open && setStockInTarget(null)} />
      <AdjustStockDialog product={adjustTarget} onOpenChange={(open) => !open && setAdjustTarget(null)} />
    </div>
  );
}
