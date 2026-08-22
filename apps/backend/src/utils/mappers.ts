import type {
  CategoryDto,
  CategoryRow,
  CustomerDto,
  CustomerRow,
  CustomerWithStatsDto,
  ExpenseDto,
  ExpenseRow,
  InventoryListItemDto,
  ProductDetailDto,
  ProductImageDto,
  ProductImageRow,
  ProductListItemDto,
  ProductRow,
  PublicProductDetailDto,
  PublicProductDto,
  PublicProductImageDto,
  StockStatus,
  UserDto,
  UserRow,
} from '@textile-admin/shared';
import type {
  CustomerRow as CustomerRowType,
  OrderDetailDto,
  OrderItemDto,
  OrderItemRow,
  OrderListItemDto,
  OrderRow,
} from '@textile-admin/shared';
import type { ProductListRow } from '../repositories/productRepository.js';
import type { MovementListRow } from '../repositories/inventoryMovementRepository.js';
import type { OrderListRow } from '../repositories/orderRepository.js';
import type { InventoryMovementDto } from '@textile-admin/shared';

export function stockStatusFor(stockQuantity: number, lowStockLimit: number): StockStatus {
  if (stockQuantity <= 0) return 'OUT_OF_STOCK';
  if (stockQuantity <= lowStockLimit) return 'LOW';
  return 'IN_STOCK';
}

export function mapCategory(row: CategoryRow): CategoryDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapUser(row: UserRow): UserDto {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    isActive: row.is_active,
  };
}

export function mapCustomer(row: CustomerRow): CustomerDto {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    country: row.country,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCustomerWithStats(
  row: CustomerRow & { total_orders: string; total_spent: string | null; last_order_date: string | null },
): CustomerWithStatsDto {
  return {
    ...mapCustomer(row),
    totalOrders: Number(row.total_orders),
    totalSpent: Number(row.total_spent ?? 0),
    lastOrderDate: row.last_order_date,
  };
}

export function mapExpense(
  row: ExpenseRow & { created_by_name?: string | null },
): ExpenseDto {
  return {
    id: row.id,
    category: row.category,
    description: row.description,
    amount: Number(row.amount),
    expenseDate: row.expense_date,
    createdBy: row.created_by,
    createdByName: row.created_by_name ?? null,
    createdAt: row.created_at,
  };
}

export function mapProductImage(row: ProductImageRow): ProductImageDto {
  return {
    id: row.id,
    productId: row.product_id,
    storageKey: row.storage_key,
    imageUrl: row.image_url,
    altText: row.alt_text,
    sortOrder: row.sort_order,
    isPrimary: row.is_primary,
  };
}

export function mapProductListItem(row: ProductListRow): ProductListItemDto {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    size: row.size,
    color: row.color,
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    stockQuantity: row.stock_quantity,
    lowStockLimit: row.low_stock_limit,
    status: row.status,
    stockStatus: stockStatusFor(row.stock_quantity, row.low_stock_limit),
    primaryImageUrl: row.primary_image_url,
    imageCount: row.image_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapProductDetail(row: ProductListRow, images: ProductImageRow[]): ProductDetailDto {
  return {
    ...mapProductListItem(row),
    description: row.description,
    images: images.map(mapProductImage),
  };
}

export function mapPublicProduct(row: ProductListRow): PublicProductDto {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    size: row.size,
    color: row.color,
    sellingPrice: Number(row.selling_price),
    stockStatus: stockStatusFor(row.stock_quantity, row.low_stock_limit),
    inStock: row.stock_quantity > 0,
    primaryImageUrl: row.primary_image_url,
    imageCount: row.image_count,
  };
}

export function mapPublicProductImage(row: ProductImageRow): PublicProductImageDto {
  return {
    id: row.id,
    imageUrl: row.image_url,
    altText: row.alt_text,
    sortOrder: row.sort_order,
    isPrimary: row.is_primary,
  };
}

export function mapPublicProductDetail(
  row: ProductListRow,
  images: ProductImageRow[],
): PublicProductDetailDto {
  return {
    ...mapPublicProduct(row),
    images: images.map(mapPublicProductImage),
  };
}

export function mapInventoryListItem(row: ProductRow): InventoryListItemDto {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    size: row.size,
    color: row.color,
    stockQuantity: row.stock_quantity,
    lowStockLimit: row.low_stock_limit,
    stockStatus: stockStatusFor(row.stock_quantity, row.low_stock_limit),
    status: row.status,
    updatedAt: row.updated_at,
  };
}

export function mapOrderItem(row: OrderItemRow): OrderItemDto {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    sku: row.sku,
    quantity: row.quantity,
    unitPrice: Number(row.unit_price),
    discount: Number(row.discount),
    total: Number(row.total),
  };
}

export function mapOrderListItem(row: OrderListRow): OrderListItemDto {
  return {
    id: row.id,
    orderNumber: row.order_number,
    orderDate: row.order_date,
    customerId: row.customer_id,
    customerName: row.customer_name,
    itemCount: row.item_count,
    total: Number(row.total),
    paymentStatus: row.payment_status,
    orderStatus: row.order_status,
  };
}

export function mapOrderDetail(
  order: OrderRow,
  items: OrderItemRow[],
  customer: CustomerRowType | null,
  customerName: string | null,
  itemCount: number,
): OrderDetailDto {
  return {
    id: order.id,
    orderNumber: order.order_number,
    orderDate: order.order_date,
    customerId: order.customer_id,
    customerName,
    itemCount,
    total: Number(order.total),
    paymentStatus: order.payment_status,
    orderStatus: order.order_status,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    shippingFee: Number(order.shipping_fee),
    tax: Number(order.tax),
    stitchingCharge: Number(order.stitching_charge),
    notes: order.notes,
    customer: customer ? mapCustomer(customer) : null,
    items: items.map(mapOrderItem),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

export function mapMovement(row: MovementListRow): InventoryMovementDto {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    sku: row.sku,
    type: row.type,
    quantity: row.quantity,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    reason: row.reason,
    createdBy: row.created_by,
    createdByName: row.created_by_name,
    createdAt: row.created_at,
  };
}
