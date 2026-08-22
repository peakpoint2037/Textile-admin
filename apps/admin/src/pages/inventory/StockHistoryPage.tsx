import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { History } from 'lucide-react';
import type { MovementType } from '@textile-admin/shared';
import { MOVEMENT_TYPES } from '@textile-admin/shared';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Pagination } from '@/components/Pagination';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMovements } from '@/api/inventory';
import { formatDateTime } from '@/lib/utils';

const ALL = '__all__';

export function StockHistoryPage() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId') ?? undefined;
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [type, setType] = React.useState(ALL);

  const { data, isPending, isError, error, refetch } = useMovements({
    page,
    limit,
    productId,
    type: type === ALL ? undefined : (type as MovementType),
  });

  return (
    <div>
      <PageHeader title="Stock History" description="Full audit trail of every inventory change" />

      <div className="mb-4 flex items-center gap-2">
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Movement type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Types</SelectItem>
            {MOVEMENT_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replace('_', ' ')}
              </SelectItem>
            ))}
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

      {data && data.items.length === 0 && <EmptyState icon={History} title="No stock movements yet" />}

      {data && data.items.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-muted-foreground">{formatDateTime(m.createdAt)}</TableCell>
                  <TableCell>
                    <p className="font-medium">{m.productName}</p>
                    <p className="text-xs text-muted-foreground">{m.sku}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{m.type.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell className={`text-right tabular-nums ${m.quantity >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {m.quantity >= 0 ? '+' : ''}
                    {m.quantity}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{m.reason ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{m.createdByName ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Pagination pagination={data.pagination} onPageChange={setPage} onLimitChange={setLimit} />
        </div>
      )}
    </div>
  );
}
