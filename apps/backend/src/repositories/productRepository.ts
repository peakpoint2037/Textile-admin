import type { ProductRow } from '@textile-admin/shared';
import type { Queryable } from '../config/db.js';
import { offsetFor } from '../utils/pagination.js';

export interface ProductListRow extends ProductRow {
  category_name: string | null;
  category_slug: string | null;
  primary_image_url: string | null;
  image_count: number;
}

export interface ProductListFilters {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  status?: string;
  size?: string;
  color?: string;
  stockStatus?: 'IN_STOCK' | 'LOW' | 'OUT_OF_STOCK';
  sortBy: 'name' | 'sku' | 'sellingPrice' | 'stockQuantity' | 'createdAt';
  sortDir: 'asc' | 'desc';
}

const SORT_COLUMN: Record<ProductListFilters['sortBy'], string> = {
  name: 'p.name',
  sku: 'p.sku',
  sellingPrice: 'p.selling_price',
  stockQuantity: 'p.stock_quantity',
  createdAt: 'p.created_at',
};

const LIST_SELECT = `
  SELECT
    p.*,
    c.name AS category_name,
    c.slug AS category_slug,
    (
      SELECT pi.image_url FROM product_images pi
      WHERE pi.product_id = p.id AND pi.is_primary = TRUE
      LIMIT 1
    ) AS primary_image_url,
    (
      SELECT COUNT(*)::int FROM product_images pi WHERE pi.product_id = p.id
    ) AS image_count
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;

export const productRepository = {
  async list(
    db: Queryable,
    filters: ProductListFilters,
  ): Promise<{ items: ProductListRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      const i = params.length;
      conditions.push(`(p.name ILIKE $${i} OR p.sku ILIKE $${i} OR p.color ILIKE $${i} OR p.size ILIKE $${i})`);
    }
    if (filters.categoryId) {
      params.push(filters.categoryId);
      conditions.push(`p.category_id = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`p.status = $${params.length}`);
    }
    if (filters.size) {
      params.push(filters.size);
      conditions.push(`p.size = $${params.length}`);
    }
    if (filters.color) {
      params.push(filters.color);
      conditions.push(`p.color = $${params.length}`);
    }
    if (filters.stockStatus === 'OUT_OF_STOCK') {
      conditions.push(`p.stock_quantity = 0`);
    } else if (filters.stockStatus === 'LOW') {
      conditions.push(`p.stock_quantity > 0 AND p.stock_quantity <= p.low_stock_limit`);
    } else if (filters.stockStatus === 'IN_STOCK') {
      conditions.push(`p.stock_quantity > p.low_stock_limit`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: countRows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM products p ${where}`,
      params,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const orderColumn = SORT_COLUMN[filters.sortBy];
    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;
    const { rows } = await db.query<ProductListRow>(
      `${LIST_SELECT} ${where}
       ORDER BY ${orderColumn} ${filters.sortDir.toUpperCase()}
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      [...params, filters.limit, offsetFor(filters.page, filters.limit)],
    );

    return { items: rows, total };
  },

  async findById(db: Queryable, id: string): Promise<ProductListRow | null> {
    const { rows } = await db.query<ProductListRow>(`${LIST_SELECT} WHERE p.id = $1`, [id]);
    return rows[0] ?? null;
  },

  async findBySku(db: Queryable, sku: string): Promise<ProductRow | null> {
    const { rows } = await db.query<ProductRow>('SELECT * FROM products WHERE sku = $1', [sku]);
    return rows[0] ?? null;
  },

  async create(
    db: Queryable,
    input: {
      categoryId: string | null;
      sku: string;
      name: string;
      description: string | null;
      size: string | null;
      color: string | null;
      purchasePrice: number;
      sellingPrice: number;
      stockQuantity: number;
      lowStockLimit: number;
      status: string;
    },
  ): Promise<ProductRow> {
    const { rows } = await db.query<ProductRow>(
      `INSERT INTO products
        (category_id, sku, name, description, size, color, purchase_price, selling_price,
         stock_quantity, low_stock_limit, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        input.categoryId,
        input.sku,
        input.name,
        input.description,
        input.size,
        input.color,
        input.purchasePrice,
        input.sellingPrice,
        input.stockQuantity,
        input.lowStockLimit,
        input.status,
      ],
    );
    return rows[0]!;
  },

  async update(
    db: Queryable,
    id: string,
    input: Partial<{
      categoryId: string | null;
      sku: string;
      name: string;
      description: string | null;
      size: string | null;
      color: string | null;
      purchasePrice: number;
      sellingPrice: number;
      lowStockLimit: number;
      status: string;
    }>,
  ): Promise<ProductRow | null> {
    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, column] of [
      ['categoryId', 'category_id'],
      ['sku', 'sku'],
      ['name', 'name'],
      ['description', 'description'],
      ['size', 'size'],
      ['color', 'color'],
      ['purchasePrice', 'purchase_price'],
      ['sellingPrice', 'selling_price'],
      ['lowStockLimit', 'low_stock_limit'],
      ['status', 'status'],
    ] as const) {
      if (input[key] !== undefined) {
        params.push(input[key]);
        fields.push(`${column} = $${params.length}`);
      }
    }

    if (fields.length === 0) {
      const { rows } = await db.query<ProductRow>('SELECT * FROM products WHERE id = $1', [id]);
      return rows[0] ?? null;
    }

    params.push(id);
    const { rows } = await db.query<ProductRow>(
      `UPDATE products SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  },

  /** Row-locks the product for an in-transaction stock mutation. Must be called inside withTransaction. */
  async lockForUpdate(db: Queryable, id: string): Promise<ProductRow | null> {
    const { rows } = await db.query<ProductRow>(
      'SELECT * FROM products WHERE id = $1 FOR UPDATE',
      [id],
    );
    return rows[0] ?? null;
  },

  async setStockQuantity(db: Queryable, id: string, quantity: number): Promise<void> {
    await db.query('UPDATE products SET stock_quantity = $1 WHERE id = $2', [quantity, id]);
  },

  async remove(db: Queryable, id: string): Promise<void> {
    await db.query('DELETE FROM products WHERE id = $1', [id]);
  },

  async listLowStock(
    db: Queryable,
    pagination: { page: number; limit: number },
  ): Promise<{ items: ProductRow[]; total: number }> {
    const { rows: countRows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM products WHERE stock_quantity <= low_stock_limit AND status = 'ACTIVE'`,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const { rows } = await db.query<ProductRow>(
      `SELECT * FROM products
       WHERE stock_quantity <= low_stock_limit AND status = 'ACTIVE'
       ORDER BY stock_quantity ASC
       LIMIT $1 OFFSET $2`,
      [pagination.limit, offsetFor(pagination.page, pagination.limit)],
    );

    return { items: rows, total };
  },

  async countByStockStatus(
    db: Queryable,
  ): Promise<{ lowStockCount: number; outOfStockCount: number }> {
    const { rows } = await db.query<{ low_stock_count: string; out_of_stock_count: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE stock_quantity > 0 AND stock_quantity <= low_stock_limit) AS low_stock_count,
         COUNT(*) FILTER (WHERE stock_quantity = 0) AS out_of_stock_count
       FROM products
       WHERE status = 'ACTIVE'`,
    );
    return {
      lowStockCount: Number(rows[0]?.low_stock_count ?? 0),
      outOfStockCount: Number(rows[0]?.out_of_stock_count ?? 0),
    };
  },

  async hasOrderReferences(db: Queryable, id: string): Promise<boolean> {
    const { rows } = await db.query('SELECT 1 FROM order_items WHERE product_id = $1 LIMIT 1', [
      id,
    ]);
    return rows.length > 0;
  },
};
