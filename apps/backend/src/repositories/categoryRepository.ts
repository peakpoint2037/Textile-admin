import type { CategoryRow } from '@textile-admin/shared';
import type { Queryable } from '../config/db.js';

export interface CategoryFilters {
  search?: string;
  isActive?: boolean;
}

export const categoryRepository = {
  async list(db: Queryable, filters: CategoryFilters): Promise<CategoryRow[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`name ILIKE $${params.length}`);
    }
    if (filters.isActive !== undefined) {
      params.push(filters.isActive);
      conditions.push(`is_active = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await db.query<CategoryRow>(
      `SELECT * FROM categories ${where} ORDER BY name ASC`,
      params,
    );
    return rows;
  },

  async findById(db: Queryable, id: string): Promise<CategoryRow | null> {
    const { rows } = await db.query<CategoryRow>('SELECT * FROM categories WHERE id = $1', [id]);
    return rows[0] ?? null;
  },

  async findBySlug(db: Queryable, slug: string): Promise<CategoryRow | null> {
    const { rows } = await db.query<CategoryRow>('SELECT * FROM categories WHERE slug = $1', [
      slug,
    ]);
    return rows[0] ?? null;
  },

  async create(
    db: Queryable,
    input: { name: string; slug: string; description: string | null; isActive: boolean },
  ): Promise<CategoryRow> {
    const { rows } = await db.query<CategoryRow>(
      `INSERT INTO categories (name, slug, description, is_active)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.name, input.slug, input.description, input.isActive],
    );
    return rows[0]!;
  },

  async update(
    db: Queryable,
    id: string,
    input: Partial<{ name: string; slug: string; description: string | null; isActive: boolean }>,
  ): Promise<CategoryRow | null> {
    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, column] of [
      ['name', 'name'],
      ['slug', 'slug'],
      ['description', 'description'],
      ['isActive', 'is_active'],
    ] as const) {
      if (input[key] !== undefined) {
        params.push(input[key]);
        fields.push(`${column} = $${params.length}`);
      }
    }

    if (fields.length === 0) return this.findById(db, id);

    params.push(id);
    const { rows } = await db.query<CategoryRow>(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  },

  async remove(db: Queryable, id: string): Promise<void> {
    await db.query('DELETE FROM categories WHERE id = $1', [id]);
  },

  async isReferencedByProducts(db: Queryable, id: string): Promise<boolean> {
    const { rows } = await db.query('SELECT 1 FROM products WHERE category_id = $1 LIMIT 1', [
      id,
    ]);
    return rows.length > 0;
  },
};
