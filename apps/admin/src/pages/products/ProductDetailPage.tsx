import { Link, useParams } from 'react-router-dom';
import { Package, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ErrorState } from '@/components/ErrorState';
import { ProductStatusBadge, StockStatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProduct } from '@/api/products';
import { useMovements } from '@/api/inventory';
import { formatCurrency, formatDateTime } from '@/lib/utils';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: product, isPending, isError, error, refetch } = useProduct(id);
  const { data: movements } = useMovements({ productId: id, limit: 5 });

  if (isPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !product) {
    return <ErrorState message={(error as Error)?.message} onRetry={() => refetch()} />;
  }

  const sortedImages = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <PageHeader
        title={product.name}
        description={product.sku}
        actions={
          <Button asChild>
            <Link to={`/products/${product.id}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Category" value={product.categoryName ?? '—'} />
            <Field label="Size" value={product.size ?? '—'} />
            <Field label="Color" value={product.color ?? '—'} />
            <Field label="Purchase Price" value={formatCurrency(product.purchasePrice)} />
            <Field label="Selling Price" value={formatCurrency(product.sellingPrice)} />
            <Field
              label="Margin"
              value={formatCurrency(product.sellingPrice - product.purchasePrice)}
            />
            <Field label="Stock" value={`${product.stockQuantity} units`} />
            <Field label="Stock Status" value={<StockStatusBadge status={product.stockStatus} />} />
            <Field label="Status" value={<ProductStatusBadge status={product.status} />} />
            {product.description && (
              <div className="col-span-full">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm">{product.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedImages.length === 0 ? (
              <div className="flex h-32 items-center justify-center rounded-md border border-dashed">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {sortedImages.map((img) => (
                  <img
                    key={img.id}
                    src={img.imageUrl}
                    alt={img.altText ?? ''}
                    className="aspect-square rounded-md border object-cover"
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent Stock Movements</CardTitle>
        </CardHeader>
        <CardContent>
          {!movements || movements.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stock movements yet.</p>
          ) : (
            <ul className="divide-y">
              {movements.items.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{m.type.replace('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground">{m.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className={m.quantity >= 0 ? 'text-success' : 'text-destructive'}>
                      {m.quantity >= 0 ? '+' : ''}
                      {m.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
