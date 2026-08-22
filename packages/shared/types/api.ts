import type {
  ExpenseCategory,
  MovementType,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  UserRole,
} from '../constants/enums.js';

export type StockStatus = 'IN_STOCK' | 'LOW' | 'OUT_OF_STOCK';

export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
}

export interface CustomerDto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerWithStatsDto extends CustomerDto {
  totalOrders: number;
  totalSpent: number;
  lastOrderDate: string | null;
}

export interface ExpenseDto {
  id: string;
  category: ExpenseCategory;
  description: string | null;
  amount: number;
  expenseDate: string;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface InventoryMovementDto {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  type: MovementType;
  quantity: number;
  referenceType: string | null;
  referenceId: string | null;
  reason: string | null;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface InventoryListItemDto {
  id: string;
  sku: string;
  name: string;
  size: string | null;
  color: string | null;
  stockQuantity: number;
  lowStockLimit: number;
  stockStatus: StockStatus;
  status: ProductStatus;
  updatedAt: string;
}

export interface OrderItemDto {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface OrderListItemDto {
  id: string;
  orderNumber: string;
  orderDate: string;
  customerId: string | null;
  customerName: string | null;
  itemCount: number;
  total: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
}

export interface SalesByDayPointDto {
  date: string;
  orders: number;
  units: number;
  revenue: number;
}

export interface TopProductPointDto {
  productId: string;
  sku: string;
  name: string;
  unitsSold: number;
  revenue: number;
}

export interface StatusCountDto {
  status: string;
  count: number;
}

export interface DashboardDto {
  revenue: number;
  orders: number;
  unitsSold: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  lowStockCount: number;
  outOfStockCount: number;
  salesByDay: SalesByDayPointDto[];
  topProducts: TopProductPointDto[];
  orderStatusDistribution: StatusCountDto[];
  paymentStatusDistribution: StatusCountDto[];
  lowStockProducts: InventoryListItemDto[];
}

export interface SalesReportDto {
  revenue: number;
  orders: number;
  unitsSold: number;
  averageOrderValue: number;
  /** Revenue from stitching charges only, tracked separately from product revenue. */
  stitchingRevenue: number;
  salesByDay: SalesByDayPointDto[];
}

export interface ProfitReportDto {
  revenue: number;
  productCost: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
}

export interface InventoryReportDto {
  totalProducts: number;
  totalUnits: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface ProductsReportDto {
  topProducts: TopProductPointDto[];
}

export interface ExcelImportError {
  row: number;
  message: string;
}

export interface ExcelImportPreviewRow {
  row: number;
  sku: string;
  action: 'CREATE' | 'UPDATE';
  name: string;
}

export interface ExcelImportResult {
  totalRows: number;
  validCount: number;
  errorCount: number;
  errors: ExcelImportError[];
  preview: ExcelImportPreviewRow[];
  committed: boolean;
}

export interface OrderDetailDto extends OrderListItemDto {
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  stitchingCharge: number;
  notes: string | null;
  customer: CustomerDto | null;
  items: OrderItemDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductImageDto {
  id: string;
  productId: string;
  storageKey: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface ProductListItemDto {
  id: string;
  sku: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  size: string | null;
  color: string | null;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockLimit: number;
  status: ProductStatus;
  stockStatus: StockStatus;
  primaryImageUrl: string | null;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductDetailDto extends ProductListItemDto {
  description: string | null;
  images: ProductImageDto[];
}

/** Storefront-safe product shape: no purchasePrice (cost/margin) and no
 *  lowStockLimit (an internal operational threshold), unlike ProductListItemDto. */
export interface PublicProductDto {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  size: string | null;
  color: string | null;
  sellingPrice: number;
  stockStatus: StockStatus;
  inStock: boolean;
  primaryImageUrl: string | null;
  imageCount: number;
}

/** Storefront-safe image shape: no storageKey (an internal R2/S3 object
 *  key), unlike ProductImageDto. */
export interface PublicProductImageDto {
  id: string;
  imageUrl: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface PublicProductDetailDto extends PublicProductDto {
  images: PublicProductImageDto[];
}
