import { useNavigate, useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { OrderStatusBadge } from '@/components/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCustomer } from '@/api/customers';
import { useOrders } from '@/api/orders';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CustomerFormDialog } from './CustomerFormDialog';
import { Button } from '@/components/ui/button';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: customer, isPending, isError, error, refetch } = useCustomer(id);
  const { data: orders } = useOrders({ customerId: id, limit: 50 });

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !customer) {
    return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;
  }

  const avgOrderValue = customer.totalOrders > 0 ? customer.totalSpent / customer.totalOrders : 0;

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={customer.phone ?? customer.email ?? undefined}
        actions={
          <CustomerFormDialog
            customer={customer}
            trigger={
              <Button variant="outline">
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            }
          />
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Phone" value={customer.phone ?? '—'} />
            <Field label="Email" value={customer.email ?? '—'} />
            <Field label="Country" value={customer.country} />
            <Field label="Address" value={customer.address ?? '—'} />
            <Field label="City" value={customer.city ?? '—'} />
            <Field label="State / Pincode" value={[customer.state, customer.pincode].filter(Boolean).join(' / ') || '—'} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Orders</p>
              <p className="text-xl font-semibold">{customer.totalOrders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Spent</p>
              <p className="text-xl font-semibold">{formatCurrency(customer.totalSpent)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Average Order Value</p>
              <p className="text-xl font-semibold">{formatCurrency(avgOrderValue)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Order History</CardTitle>
        </CardHeader>
        <CardContent>
          {!orders || orders.items.length === 0 ? (
            <EmptyState title="No orders yet" className="border-none py-8" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.items.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer" onClick={() => navigate(`/orders/${order.id}`)}>
                    <TableCell className="font-medium">{order.orderNumber}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(order.orderDate)}</TableCell>
                    <TableCell className="text-right">{order.itemCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(order.total)}</TableCell>
                    <TableCell>
                      <OrderStatusBadge status={order.orderStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
