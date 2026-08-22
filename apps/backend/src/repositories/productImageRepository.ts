import type { ProductImageRow } from '@textile-admin/shared';
import type { Queryable } from '../config/db.js';

export const productImageRepository = {
  async listByProduct(db: Queryable, productId: string): Promise<ProductImageRow[]> {
    const { rows } = await db.query<ProductImageRow>(
      'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order ASC, created_at ASC',
      [productId],
    );
    return rows;
  },

  async findById(db: Queryable, id: string): Promise<ProductImageRow | null> {
    const { rows } = await db.query<ProductImageRow>(
      'SELECT * FROM product_images WHERE id = $1',
      [id],
    );
    return rows[0] ?? null;
  },

  async countForProduct(db: Queryable, productId: string): Promise<number> {
    const { rows } = await db.query<{ count: string }>(
      'SELECT COUNT(*) FROM product_images WHERE product_id = $1',
      [productId],
    );
    return Number(rows[0]?.count ?? 0);
  },

  async clearPrimary(db: Queryable, productId: string): Promise<void> {
    await db.query('UPDATE product_images SET is_primary = FALSE WHERE product_id = $1', [
      productId,
    ]);
  },

  async create(
    db: Queryable,
    input: {
      productId: string;
      storageKey: string;
      imageUrl: string;
      altText: string | null;
      sortOrder: number;
      isPrimary: boolean;
    },
  ): Promise<ProductImageRow> {
    const { rows } = await db.query<ProductImageRow>(
      `INSERT INTO product_images (product_id, storage_key, image_url, alt_text, sort_order, is_primary)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        input.productId,
        input.storageKey,
        input.imageUrl,
        input.altText,
        input.sortOrder,
        input.isPrimary,
      ],
    );
    return rows[0]!;
  },

  async update(
    db: Queryable,
    id: string,
    input: Partial<{ altText: string | null; sortOrder: number; isPrimary: boolean }>,
  ): Promise<ProductImageRow | null> {
    const fields: string[] = [];
    const params: unknown[] = [];

    for (const [key, column] of [
      ['altText', 'alt_text'],
      ['sortOrder', 'sort_order'],
      ['isPrimary', 'is_primary'],
    ] as const) {
      if (input[key] !== undefined) {
        params.push(input[key]);
        fields.push(`${column} = $${params.length}`);
      }
    }
    if (fields.length === 0) return this.findById(db, id);

    params.push(id);
    const { rows } = await db.query<ProductImageRow>(
      `UPDATE product_images SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params,
    );
    return rows[0] ?? null;
  },

  async remove(db: Queryable, id: string): Promise<void> {
    await db.query('DELETE FROM product_images WHERE id = $1', [id]);
  },

  async setPrimaryIfFirst(db: Queryable, productId: string, imageId: string): Promise<void> {
    const count = await this.countForProduct(db, productId);
    if (count === 1) {
      await db.query('UPDATE product_images SET is_primary = TRUE WHERE id = $1', [imageId]);
    }
  },
};
