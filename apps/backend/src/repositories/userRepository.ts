import type { UserRow } from '@textile-admin/shared';
import type { Queryable } from '../config/db.js';

export const userRepository = {
  async findById(db: Queryable, id: string): Promise<UserRow | null> {
    const { rows } = await db.query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ?? null;
  },

  async createFromAuth(
    db: Queryable,
    input: { id: string; email: string; name: string },
  ): Promise<UserRow> {
    const { rows } = await db.query<UserRow>(
      `INSERT INTO users (id, email, name, role, is_active)
       VALUES ($1, $2, $3, 'STAFF', TRUE)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
       RETURNING *`,
      [input.id, input.email, input.name],
    );
    return rows[0]!;
  },
};
