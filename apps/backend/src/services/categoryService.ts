import type { CategoryDto, CategoryQuery, CreateCategoryInput, UpdateCategoryInput } from '@textile-admin/shared';
import { pool } from '../config/db.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { ApiError } from '../utils/apiError.js';
import { mapCategory } from '../utils/mappers.js';
import { slugify } from '../utils/slug.js';

async function findRowOrThrow(id: string) {
  const category = await categoryRepository.findById(pool, id);
  if (!category) throw ApiError.notFound('Category');
  return category;
}

async function assertSlugAvailable(slug: string, excludeId?: string) {
  const existing = await categoryRepository.findBySlug(pool, slug);
  if (existing && existing.id !== excludeId) {
    throw ApiError.conflict('CATEGORY_SLUG_EXISTS', 'A category with this slug already exists');
  }
}

export const categoryService = {
  async list(filters: CategoryQuery): Promise<CategoryDto[]> {
    const rows = await categoryRepository.list(pool, filters);
    return rows.map(mapCategory);
  },

  async getById(id: string): Promise<CategoryDto> {
    return mapCategory(await findRowOrThrow(id));
  },

  async create(input: CreateCategoryInput): Promise<CategoryDto> {
    const slug = slugify(input.slug ?? input.name);
    await assertSlugAvailable(slug);
    const row = await categoryRepository.create(pool, {
      name: input.name,
      slug,
      description: input.description ?? null,
      isActive: input.isActive ?? true,
    });
    return mapCategory(row);
  },

  async update(id: string, input: UpdateCategoryInput): Promise<CategoryDto> {
    await findRowOrThrow(id);

    const slug =
      input.slug !== undefined || input.name !== undefined
        ? slugify(input.slug ?? input.name!)
        : undefined;
    if (slug) await assertSlugAvailable(slug, id);

    const updated = await categoryRepository.update(pool, id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(slug !== undefined ? { slug } : {}),
      ...(input.description !== undefined ? { description: input.description ?? null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    });
    return mapCategory(updated!);
  },

  async remove(id: string): Promise<void> {
    await findRowOrThrow(id);
    const inUse = await categoryRepository.isReferencedByProducts(pool, id);
    if (inUse) {
      throw ApiError.conflict(
        'CATEGORY_IN_USE',
        'This category has products assigned to it. Deactivate it instead of deleting, or reassign its products first.',
      );
    }
    await categoryRepository.remove(pool, id);
  },
};
