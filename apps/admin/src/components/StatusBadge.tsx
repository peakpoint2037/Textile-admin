import type { OrderStatus, PaymentStatus, ProductStatus } from '@textile-admin/shared';
import type { StockStatus } from '@textile-admin/shared';
import { Badge, type BadgeProps } from '@/components/ui/badge';

const ORDER_STATUS_VARIANT: Record<OrderStatus, BadgeProps['variant']> = {
  PENDING: 'outline',
  CONFIRMED: 'secondary',
  PACKED: 'secondary',
  SHIPPED: 'default',
  DELIVERED: 'success',
  CANCELLED: 'destructive',
  RETURNED: 'warning',
};

const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, BadgeProps['variant']> = {
  PENDING: 'outline',
  PAID: 'success',
  FAILED: 'destructive',
  REFUNDED: 'warning',
  COD: 'secondary',
};

const STOCK_STATUS_VARIANT: Record<StockStatus, BadgeProps['variant']> = {
  IN_STOCK: 'success',
  LOW: 'warning',
  OUT_OF_STOCK: 'destructive',
};

const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  IN_STOCK: 'In Stock',
  LOW: 'Low Stock',
  OUT_OF_STOCK: 'Out of Stock',
};

const PRODUCT_STATUS_VARIANT: Record<ProductStatus, BadgeProps['variant']> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  ARCHIVED: 'outline',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={ORDER_STATUS_VARIANT[status]}>{status}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_STATUS_VARIANT[status]}>{status}</Badge>;
}

export function StockStatusBadge({ status }: { status: StockStatus }) {
  return <Badge variant={STOCK_STATUS_VARIANT[status]}>{STOCK_STATUS_LABEL[status]}</Badge>;
}

export function ProductStatusBadge({ status }: { status: ProductStatus }) {
  return <Badge variant={PRODUCT_STATUS_VARIANT[status]}>{status}</Badge>;
}
