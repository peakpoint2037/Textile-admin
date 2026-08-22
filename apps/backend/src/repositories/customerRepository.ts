import type { CustomerRow } from '@textile-admin/shared';
import type { Queryable } from '../config/db.js';
import { offsetFor } from '../utils/pagination.js';

export interface CustomerFilters {
  page: number;
  limit: number;
  search?: string;
}

export interface CustomerStatsRow extends CustomerRow {
  total_orders: string;
  total_spent: string | null;
  last_order_date: string | null;
}

export const customerRepository = {
  async list(
    db: Queryable,
    filters: CustomerFilters,
  ): Promise<{ items: CustomerStatsRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      const i = params.length;
      conditions.push(`(c.name ILIKE $${i} OR c.phone ILIKE $${i} OR c.email ILIKE $${i})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: countRows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM customers c ${where}`,
      params,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;
    const { rows } = await db.query<CustomerStatsRow>(
      `SELECT
         c.*,
         COUNT(o.id)::text AS total_orders,
         COALESCE(SUM(o.total), 0)::text AS total_spent,
         MAX(o.order_date) AS last_order_date
       FROM customers c
       LEFT JOIN orders o ON o.customer_id = c.id AND o.order_status != 'CANCELLED'
       ${where}
       GROUP BY c.id
       ORDER BY c.name ASC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      [...params, filters.limit, offsetFor(filters.page, filters.limit)],
    );

    return { items: rows, total };
  },

  async findById(db: Queryable, id: string): Promise<CustomerStatsRow | null> {
    const { rows } = await db.query<CustomerStatsRow>(
      `SELECT
         c.*,
         COUNT(o.id)::text AS total_orders,
         COALESCE(SUM(o.total), 0)::text AS total_spent,
         MAX(o.order_date) AS last_order_date
       FROM customers c
       LEFT JOIN orders o ON o.customer_id = c.id AND o.order_status != 'CANCELLED'
       WHERE c.id = $1
       GROUP BY c.id`,
      [id],
    );
    return rows[0] ?? null;
  },

  async create(
    db: Queryable,
    input: {
      name: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      pincode: string | null;
      country: string;
    },
  ): Promise<CustomerRow> {
    const { rows } = await db.query<CustomerRow>(
      `INSERT INTO customers (name, phone, email, address, city, state, pincode, country)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        input.name,
        input.phone,
        input.email,
        input.address,
        input.city,
        input.state,
        input.pincode,
        input.country,
      ],
    );
    return rows[0]!;
  },

  async update(
    db: Queryable,
    id: string,
    input: Partial<{
      name: string;
      phone: string | null;
      email: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      pincode: string | null;
      country: string;
    }>,
  ): Promise<CustomerRow | null> {
    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, column] of [
      ['name', 'name'],
      ['phone', 'phone'],
      ['email', 'email'],
      ['address', 'address'],
      ['city', 'city'],
      ['state', 'state'],
      ['pincode', 'pincode'],
      ['country', 'country'],
    ] as const) {
      if (input[key] !== undefined) {
        params.push(input[key]);
        fields.push(`${column} = $${params.length}`);
      }
    }
    if (fields.length === 0) {
      const { rows } = await db.query<CustomerRow>('SELECT * FROM customers WHERE id = $1', [id]);
      return rows[0] ?? null;
    }

    params.push(id);
    const { rows } = await db.query<CustomerRow>(
      `UPDATE customers SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  },

  async remove(db: Queryable, id: string): Promise<void> {
    await db.query('DELETE FROM customers WHERE id = $1', [id]);
  },

  async hasOrderReferences(db: Queryable, id: string): Promise<boolean> {
    const { rows } = await db.query('SELECT 1 FROM orders WHERE customer_id = $1 LIMIT 1', [id]);
    return rows.length > 0;
  },
};
