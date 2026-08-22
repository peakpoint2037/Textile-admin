import type { CreateExpenseInput, ExpenseDto, ExpenseQuery, UpdateExpenseInput } from '@textile-admin/shared';
import { paginatedResult, type PaginatedResult } from './helpers/paginatedResult.js';
import { pool } from '../config/db.js';
import { expenseRepository } from '../repositories/expenseRepository.js';
import { ApiError } from '../utils/apiError.js';
import { mapExpense } from '../utils/mappers.js';

async function findRowOrThrow(id: string) {
  const row = await expenseRepository.findById(pool, id);
  if (!row) throw ApiError.notFound('Expense');
  return row;
}

export const expenseService = {
  async list(filters: ExpenseQuery): Promise<PaginatedResult<ExpenseDto>> {
    const { items, total } = await expenseRepository.list(pool, filters);
    return paginatedResult(items.map(mapExpense), filters.page, filters.limit, total);
  },

  async getById(id: string): Promise<ExpenseDto> {
    return mapExpense(await findRowOrThrow(id));
  },

  async create(input: CreateExpenseInput, userId: string): Promise<ExpenseDto> {
    const row = await expenseRepository.create(pool, {
      category: input.category,
      description: input.description ?? null,
      amount: input.amount,
      expenseDate: input.expenseDate,
      createdBy: userId,
    });
    return this.getById(row.id);
  },

  async update(id: string, input: UpdateExpenseInput): Promise<ExpenseDto> {
    await findRowOrThrow(id);
    await expenseRepository.update(pool, id, input);
    return this.getById(id);
  },

  async remove(id: string): Promise<void> {
    await findRowOrThrow(id);
    await expenseRepository.remove(pool, id);
  },
};
