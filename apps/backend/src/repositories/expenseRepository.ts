import type { ExpenseCategory, ExpenseRow } from '@textile-admin/shared';
import type { Queryable } from '../config/db.js';
import { offsetFor } from '../utils/pagination.js';

export interface ExpenseListRow extends ExpenseRow {
  created_by_name: string | null;
}

export interface ExpenseFilters {
  page: number;
  limit: number;
  category?: ExpenseCategory;
  from?: string;
  to?: string;
}

export const expenseRepository = {
  async list(
    db: Queryable,
    filters: ExpenseFilters,
  ): Promise<{ items: ExpenseListRow[]; total: number }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.category) {
      params.push(filters.category);
      conditions.push(`e.category = $${params.length}`);
    }
    if (filters.from) {
      params.push(filters.from);
      conditions.push(`e.expense_date >= $${params.length}`);
    }
    if (filters.to) {
      params.push(filters.to);
      conditions.push(`e.expense_date <= $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows: countRows } = await db.query<{ count: string }>(
      `SELECT COUNT(*) FROM expenses e ${where}`,
      params,
    );
    const total = Number(countRows[0]?.count ?? 0);

    const limitIndex = params.length + 1;
    const offsetIndex = params.length + 2;
    const { rows } = await db.query<ExpenseListRow>(
      `SELECT e.*, u.name AS created_by_name
       FROM expenses e
       LEFT JOIN users u ON u.id = e.created_by
       ${where}
       ORDER BY e.expense_date DESC, e.created_at DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      [...params, filters.limit, offsetFor(filters.page, filters.limit)],
    );

    return { items: rows, total };
  },

  async sumByFilters(
    db: Queryable,
    filters: { from?: string; to?: string },
  ): Promise<number> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filters.from) {
      params.push(filters.from);
      conditions.push(`expense_date >= $${params.length}`);
    }
    if (filters.to) {
      params.push(filters.to);
      conditions.push(`expense_date <= $${params.length}`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query<{ total: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total FROM expenses ${where}`,
      params,
    );
    return Number(rows[0]?.total ?? 0);
  },

  async findById(db: Queryable, id: string): Promise<ExpenseListRow | null> {
    const { rows } = await db.query<ExpenseListRow>(
      `SELECT e.*, u.name AS created_by_name FROM expenses e LEFT JOIN users u ON u.id = e.created_by WHERE e.id = $1`,
      [id],
    );
    return rows[0] ?? null;
  },

  async create(
    db: Queryable,
    input: {
      category: ExpenseCategory;
      description: string | null;
      amount: number;
      expenseDate: string;
      createdBy: string | null;
    },
  ): Promise<ExpenseRow> {
    const { rows } = await db.query<ExpenseRow>(
      `INSERT INTO expenses (category, description, amount, expense_date, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [input.category, input.description, input.amount, input.expenseDate, input.createdBy],
    );
    return rows[0]!;
  },

  async update(
    db: Queryable,
    id: string,
    input: Partial<{
      category: ExpenseCategory;
      description: string | null;
      amount: number;
      expenseDate: string;
    }>,
  ): Promise<ExpenseRow | null> {
    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, column] of [
      ['category', 'category'],
      ['description', 'description'],
      ['amount', 'amount'],
      ['expenseDate', 'expense_date'],
    ] as const) {
      if (input[key] !== undefined) {
        params.push(input[key]);
        fields.push(`${column} = $${params.length}`);
      }
    }
    if (fields.length === 0) {
      const { rows } = await db.query<ExpenseRow>('SELECT * FROM expenses WHERE id = $1', [id]);
      return rows[0] ?? null;
    }

    params.push(id);
    const { rows } = await db.query<ExpenseRow>(
      `UPDATE expenses SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  },

  async remove(db: Queryable, id: string): Promise<void> {
    await db.query('DELETE FROM expenses WHERE id = $1', [id]);
  },
};
