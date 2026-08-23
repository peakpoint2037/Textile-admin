import type { ProductGroupRow } from '@textile-admin/shared';
import type { Queryable } from '../config/db.js';
import { offsetFor } from '../utils/pagination.js';

export interface ProductGroupListRow extends ProductGroupRow {
  category_name: string | null;
  category_slug: string | null;
  variant_count: number;
  total_stock: number;
}

export interface ProductGroupListFilters {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  status?: string;
}

const LIST_SELECT = `
  SELECT
    pg.*,
    c.name AS category_name,
    c.slug AS category_slug,
    (SELECT COUNT(*)::int FROM products p WHERE p.group_id = pg.id) AS variant_count,
    (SELECT COALESCE(SUM(p.stock_quantity), 0)::int FROM products p WHERE p.group_id = pg.id) AS total_stock
  FROM product_groups pg
  LEFT JOIN categories c ON c.id = pg.category_id
`;

export const productGroupRepository = {
  async list(
    db: Queryable,
    filters: ProductGroupListFilters,
  ): Promise<{ items: ProductGroupListRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`pg.name ILIKE $${params.length}`);
    }
    if (filters.categoryId) {
      params.push(filters.categoryId);
      conditions.push(`pg.category_id = $${params.length}`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`pg.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: countRows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM product_groups pg ${where}`,
      params,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;
    const { rows } = await db.query<ProductGroupListRow>(
      `${LIST_SELECT} ${where}
       ORDER BY pg.created_at DESC
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      [...params, filters.limit, offsetFor(filters.page, filters.limit)],
    );

    return { items: rows, total };
  },

  async findById(db: Queryable, id: string): Promise<ProductGroupListRow | null> {
    const { rows } = await db.query<ProductGroupListRow>(`${LIST_SELECT} WHERE pg.id = $1`, [id]);
    return rows[0] ?? null;
  },

  async create(
    db: Queryable,
    input: {
      categoryId: string | null;
      name: string;
      description: string | null;
      purchasePrice: number;
      sellingPrice: number;
      status: string;
    },
  ): Promise<ProductGroupRow> {
    const { rows } = await db.query<ProductGroupRow>(
      `INSERT INTO product_groups (category_id, name, description, purchase_price, selling_price, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [input.categoryId, input.name, input.description, input.purchasePrice, input.sellingPrice, input.status],
    );
    return rows[0]!;
  },

  async update(
    db: Queryable,
    id: string,
    input: Partial<{
      categoryId: string | null;
      name: string;
      description: string | null;
      purchasePrice: number;
      sellingPrice: number;
      status: string;
    }>,
  ): Promise<ProductGroupRow | null> {
    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, column] of [
      ['categoryId', 'category_id'],
      ['name', 'name'],
      ['description', 'description'],
      ['purchasePrice', 'purchase_price'],
      ['sellingPrice', 'selling_price'],
      ['status', 'status'],
    ] as const) {
      if (input[key] !== undefined) {
        params.push(input[key]);
        fields.push(`${column} = $${params.length}`);
      }
    }

    if (fields.length === 0) {
      const { rows } = await db.query<ProductGroupRow>('SELECT * FROM product_groups WHERE id = $1', [id]);
      return rows[0] ?? null;
    }

    params.push(id);
    const { rows } = await db.query<ProductGroupRow>(
      `UPDATE product_groups SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  },

  async remove(db: Queryable, id: string): Promise<void> {
    await db.query('DELETE FROM product_groups WHERE id = $1', [id]);
  },

  async hasVariants(db: Queryable, id: string): Promise<boolean> {
    const { rows } = await db.query('SELECT 1 FROM products WHERE group_id = $1 LIMIT 1', [id]);
    return rows.length > 0;
  },
};
