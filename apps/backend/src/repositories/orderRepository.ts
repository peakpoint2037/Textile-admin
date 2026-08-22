import type { OrderItemRow, OrderRow, OrderStatus, PaymentStatus } from '@textile-admin/shared';
import type { Queryable } from '../config/db.js';
import { offsetFor } from '../utils/pagination.js';

export interface OrderListRow extends OrderRow {
  customer_name: string | null;
  item_count: number;
}

export interface OrderListFilters {
  page: number;
  limit: number;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

const LIST_SELECT = `
  SELECT
    o.*,
    c.name AS customer_name,
    (SELECT COUNT(*)::int FROM order_items oi WHERE oi.order_id = o.id) AS item_count
  FROM orders o
  LEFT JOIN customers c ON c.id = o.customer_id
`;

export const orderRepository = {
  async nextOrderNumber(db: Queryable): Promise<string> {
    const { rows } = await db.query<{ n: string }>(`SELECT nextval('order_number_seq') AS n`);
    return `ORD-${rows[0]!.n}`;
  },

  async create(
    db: Queryable,
    input: {
      orderNumber: string;
      customerId: string | null;
      subtotal: number;
      discount: number;
      shippingFee: number;
      tax: number;
      total: number;
      paymentStatus: PaymentStatus;
      notes: string | null;
    },
  ): Promise<OrderRow> {
    const { rows } = await db.query<OrderRow>(
      `INSERT INTO orders
        (order_number, customer_id, subtotal, discount, shipping_fee, tax, total, payment_status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        input.orderNumber,
        input.customerId,
        input.subtotal,
        input.discount,
        input.shippingFee,
        input.tax,
        input.total,
        input.paymentStatus,
        input.notes,
      ],
    );
    return rows[0]!;
  },

  async createItems(
    db: Queryable,
    orderId: string,
    items: Array<{
      productId: string;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      discount: number;
      total: number;
      costPrice: number;
    }>,
  ): Promise<void> {
    for (const item of items) {
      await db.query(
        `INSERT INTO order_items
          (order_id, product_id, product_name, sku, quantity, unit_price, discount, total, cost_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          orderId,
          item.productId,
          item.productName,
          item.sku,
          item.quantity,
          item.unitPrice,
          item.discount,
          item.total,
          item.costPrice,
        ],
      );
    }
  },

  async getItems(db: Queryable, orderId: string): Promise<OrderItemRow[]> {
    const { rows } = await db.query<OrderItemRow>(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY id ASC',
      [orderId],
    );
    return rows;
  },

  async findById(db: Queryable, id: string): Promise<OrderRow | null> {
    const { rows } = await db.query<OrderRow>('SELECT * FROM orders WHERE id = $1', [id]);
    return rows[0] ?? null;
  },

  /** Row-locks the order for a status-transition transaction. */
  async lockForUpdate(db: Queryable, id: string): Promise<OrderRow | null> {
    const { rows } = await db.query<OrderRow>('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [
      id,
    ]);
    return rows[0] ?? null;
  },

  async list(
    db: Queryable,
    filters: OrderListFilters,
  ): Promise<{ items: OrderListRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      const i = params.length;
      conditions.push(`(o.order_number ILIKE $${i} OR c.name ILIKE $${i} OR c.phone ILIKE $${i})`);
    }
    if (filters.status) {
      params.push(filters.status);
      conditions.push(`o.order_status = $${params.length}`);
    }
    if (filters.paymentStatus) {
      params.push(filters.paymentStatus);
      conditions.push(`o.payment_status = $${params.length}`);
    }
    if (filters.customerId) {
      params.push(filters.customerId);
      conditions.push(`o.customer_id = $${params.length}`);
    }
    if (filters.dateFrom) {
      params.push(filters.dateFrom);
      conditions.push(`o.order_date >= $${params.length}`);
    }
    if (filters.dateTo) {
      params.push(filters.dateTo);
      conditions.push(`o.order_date < ($${params.length}::date + INTERVAL '1 day')`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: countRows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM orders o LEFT JOIN customers c ON c.id = o.customer_id ${where}`,
      params,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;
    const { rows } = await db.query<OrderListRow>(
      `${LIST_SELECT} ${where}
       ORDER BY o.order_date DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      [...params, filters.limit, offsetFor(filters.page, filters.limit)],
    );

    return { items: rows, total };
  },

  async updateFields(
    db: Queryable,
    id: string,
    input: Partial<{
      customerId: string | null;
      discount: number;
      shippingFee: number;
      tax: number;
      total: number;
      notes: string | null;
    }>,
  ): Promise<OrderRow | null> {
    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, column] of [
      ['customerId', 'customer_id'],
      ['discount', 'discount'],
      ['shippingFee', 'shipping_fee'],
      ['tax', 'tax'],
      ['total', 'total'],
      ['notes', 'notes'],
    ] as const) {
      if (input[key] !== undefined) {
        params.push(input[key]);
        fields.push(`${column} = $${params.length}`);
      }
    }
    if (fields.length === 0) return this.findById(db, id);

    params.push(id);
    const { rows } = await db.query<OrderRow>(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  },

  async updateStatus(db: Queryable, id: string, status: OrderStatus): Promise<void> {
    await db.query('UPDATE orders SET order_status = $1 WHERE id = $2', [status, id]);
  },

  async updatePaymentStatus(db: Queryable, id: string, status: PaymentStatus): Promise<void> {
    await db.query('UPDATE orders SET payment_status = $1 WHERE id = $2', [status, id]);
  },
};
