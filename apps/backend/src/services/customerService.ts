import type {
  CreateCustomerInput,
  CustomerQuery,
  CustomerWithStatsDto,
  UpdateCustomerInput,
} from '@textile-admin/shared';
import { paginatedResult, type PaginatedResult } from './helpers/paginatedResult.js';
import { pool } from '../config/db.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { ApiError } from '../utils/apiError.js';
import { mapCustomerWithStats } from '../utils/mappers.js';

async function findRowOrThrow(id: string) {
  const row = await customerRepository.findById(pool, id);
  if (!row) throw ApiError.notFound('Customer');
  return row;
}

export const customerService = {
  async list(filters: CustomerQuery): Promise<PaginatedResult<CustomerWithStatsDto>> {
    const { items, total } = await customerRepository.list(pool, filters);
    return paginatedResult(items.map(mapCustomerWithStats), filters.page, filters.limit, total);
  },

  async getById(id: string): Promise<CustomerWithStatsDto> {
    return mapCustomerWithStats(await findRowOrThrow(id));
  },

  async create(input: CreateCustomerInput): Promise<CustomerWithStatsDto> {
    const row = await customerRepository.create(pool, {
      name: input.name,
      phone: input.phone ?? null,
      email: input.email || null,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      pincode: input.pincode ?? null,
      country: input.country ?? 'India',
    });
    return this.getById(row.id);
  },

  async update(id: string, input: UpdateCustomerInput): Promise<CustomerWithStatsDto> {
    await findRowOrThrow(id);
    await customerRepository.update(pool, id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone ?? null } : {}),
      ...(input.email !== undefined ? { email: input.email || null } : {}),
      ...(input.address !== undefined ? { address: input.address ?? null } : {}),
      ...(input.city !== undefined ? { city: input.city ?? null } : {}),
      ...(input.state !== undefined ? { state: input.state ?? null } : {}),
      ...(input.pincode !== undefined ? { pincode: input.pincode ?? null } : {}),
      ...(input.country !== undefined ? { country: input.country ?? 'India' } : {}),
    });
    return this.getById(id);
  },

  async remove(id: string): Promise<void> {
    await findRowOrThrow(id);
    const inUse = await customerRepository.hasOrderReferences(pool, id);
    if (inUse) {
      throw ApiError.conflict(
        'CUSTOMER_IN_USE',
        'This customer has existing orders and cannot be deleted.',
      );
    }
    await customerRepository.remove(pool, id);
  },
};
