import type {
  ExpenseCategory,
  MovementType,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  UserRole,
} from '../constants/enums.js';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  category_id: string | null;
  sku: string;
  name: string;
  description: string | null;
  size: string | null;
  color: string | null;
  purchase_price: string;
  selling_price: string;
  stock_quantity: number;
  low_stock_limit: number;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
}

export interface ProductImageRow {
  id: string;
  product_id: string;
  storage_key: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface InventoryMovementRow {
  id: string;
  product_id: string;
  type: MovementType;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  reason: string | null;
  created_by: string | null;
  created_at: string;
}

export interface CustomerRow {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string;
  created_at: string;
  updated_at: string;
}

export interface OrderRow {
  id: string;
  order_number: string;
  customer_id: string | null;
  order_date: string;
  subtotal: string;
  discount: string;
  shipping_fee: string;
  tax: string;
  total: string;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: string;
  discount: string;
  total: string;
  cost_price: string;
}

export interface ExpenseRow {
  id: string;
  category: ExpenseCategory;
  description: string | null;
  amount: string;
  expense_date: string;
  created_by: string | null;
  created_at: string;
}
