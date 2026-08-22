import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Search } from 'lucide-react';
import type { OrderQuery } from '@textile-admin/shared';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { Pagination } from '@/components/Pagination';
import { OrderStatusBadge, PaymentStatusBadge } from '@/components/StatusBadge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOrders } from '@/api/orders';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreateOrderDialog } from './CreateOrderDialog';

const ALL = '__all__';

export function OrderListPage() {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState(ALL);
  const [paymentStatus, setPaymentStatus] = React.useState(ALL);

  const { data, isPending, isError, error, refetch } = useOrders({
    page,
    limit,
    search: search || undefined,
    status: status === ALL ? undefined : (status as OrderQuery['status']),
    paymentStatus: paymentStatus === ALL ? undefined : (paymentStatus as OrderQuery['paymentStatus']),
  });

  return (
    <div>
      <PageHeader title="Orders" description="Manage customer orders" actions={<CreateOrderDialog />} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Order #, customer, phone…"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Order status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Statuses</SelectItem>
            {['PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={paymentStatus}
          onValueChange={(v) => {
            setPaymentStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Payment status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All Payments</SelectItem>
            {['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COD'].map((s) => (
              <SelectItem key={s} value={s}>
                {s}
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

      {data && data.items.length === 0 && <EmptyState icon={ShoppingCart} title="No orders found" />}

      {data && data.items.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((order) => (
                <TableRow key={order.id} className="cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                  <TableCell className="font-medium">{order.orderNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(order.orderDate)}</TableCell>
                  <TableCell>{order.customerName ?? 'Walk-in'}</TableCell>
                  <TableCell className="text-right">{order.itemCount}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(order.total)}</TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.orderStatus} />
                  </TableCell>
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
