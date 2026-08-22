export const USER_ROLES = ['OWNER', 'ADMIN', 'STAFF'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PRODUCT_STATUSES = ['ACTIVE', 'INACTIVE', 'ARCHIVED'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const MOVEMENT_TYPES = [
  'OPENING_STOCK',
  'STOCK_IN',
  'SALE',
  'RETURN',
  'DAMAGE',
  'ADJUSTMENT',
  'CANCELLED_ORDER',
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COD'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const EXPENSE_CATEGORIES = [
  'PACKAGING',
  'MARKETING',
  'SHIPPING',
  'PRINTING',
  'PHOTOGRAPHY',
  'WEBSITE',
  'OTHER',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Order statuses that indicate stock was already deducted for the order (SALE movement created). */
export const STOCK_DEDUCTED_STATUSES: OrderStatus[] = [
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
];

/** Legal order status transitions. Key = current status, value = allowed next statuses. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKED', 'CANCELLED'],
  PACKED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED', 'RETURNED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};
