import type {
  CreateOrderInput,
  OrderDetailDto,
  OrderItemRow,
  OrderListItemDto,
  OrderQuery,
  OrderRow,
  OrderStatus,
  PaymentStatus,
  UpdateOrderInput,
} from '@textile-admin/shared';
import { ORDER_STATUS_TRANSITIONS, STOCK_DEDUCTED_STATUSES } from '@textile-admin/shared';
import { paginatedResult, type PaginatedResult } from './helpers/paginatedResult.js';
import { pool, withTransaction, type Queryable } from '../config/db.js';
import { customerRepository } from '../repositories/customerRepository.js';
import { inventoryMovementRepository } from '../repositories/inventoryMovementRepository.js';
import { orderRepository } from '../repositories/orderRepository.js';
import { productRepository } from '../repositories/productRepository.js';
import { ApiError } from '../utils/apiError.js';
import { mapOrderDetail, mapOrderListItem } from '../utils/mappers.js';

async function loadDetail(id: string): Promise<OrderDetailDto> {
  const order = await orderRepository.findById(pool, id);
  if (!order) throw ApiError.notFound('Order');

  const items = await orderRepository.getItems(pool, id);
  const customer = order.customer_id ? await customerRepository.findById(pool, order.customer_id) : null;

  return mapOrderDetail(order, items, customer, customer?.name ?? null, items.length);
}

async function lockOrderOrThrow(client: Queryable, id: string): Promise<OrderRow> {
  const order = await orderRepository.lockForUpdate(client, id);
  if (!order) throw ApiError.notFound('Order');
  return order;
}

/**
 * Deducts stock for every item in `items`, failing the whole transaction if
 * any single product doesn't have enough — per spec, a short-stock item
 * rejects the entire order confirmation, not just that line.
 */
async function deductStockForOrder(
  client: Queryable,
  order: OrderRow,
  items: OrderItemRow[],
  userId: string,
): Promise<void> {
  // Lock in a stable order (by product_id) so concurrent order confirmations
  // that share a product never lock it in opposite orders and deadlock.
  const sorted = [...items].sort((a, b) => a.product_id.localeCompare(b.product_id));

  const locked = new Map<string, { stock_quantity: number }>();
  for (const item of sorted) {
    const product = await productRepository.lockForUpdate(client, item.product_id);
    if (!product) throw ApiError.notFound('Product');
    locked.set(item.product_id, product);
  }

  for (const item of sorted) {
    const product = locked.get(item.product_id)!;
    if (product.stock_quantity < item.quantity) {
      throw ApiError.validation(
        `Insufficient stock for ${item.sku} (have ${product.stock_quantity}, need ${item.quantity})`,
      );
    }
  }

  for (const item of sorted) {
    const product = locked.get(item.product_id)!;
    await productRepository.setStockQuantity(client, item.product_id, product.stock_quantity - item.quantity);
    await inventoryMovementRepository.create(client, {
      productId: item.product_id,
      type: 'SALE',
      quantity: -item.quantity,
      referenceType: 'ORDER',
      referenceId: order.id,
      reason: `Order ${order.order_number} confirmed`,
      createdBy: userId,
    });
  }
}

async function restoreStockForOrder(
  client: Queryable,
  order: OrderRow,
  items: OrderItemRow[],
  movementType: 'CANCELLED_ORDER' | 'RETURN',
  userId: string,
): Promise<void> {
  const sorted = [...items].sort((a, b) => a.product_id.localeCompare(b.product_id));
  for (const item of sorted) {
    const product = await productRepository.lockForUpdate(client, item.product_id);
    if (!product) throw ApiError.notFound('Product');

    await productRepository.setStockQuantity(client, item.product_id, product.stock_quantity + item.quantity);
    await inventoryMovementRepository.create(client, {
      productId: item.product_id,
      type: movementType,
      quantity: item.quantity,
      referenceType: 'ORDER',
      referenceId: order.id,
      reason:
        movementType === 'CANCELLED_ORDER'
          ? `Order ${order.order_number} cancelled`
          : `Order ${order.order_number} returned`,
      createdBy: userId,
    });
  }
}

export const orderService = {
  async list(filters: OrderQuery): Promise<PaginatedResult<OrderListItemDto>> {
    const { items, total } = await orderRepository.list(pool, filters);
    return paginatedResult(items.map(mapOrderListItem), filters.page, filters.limit, total);
  },

  async getById(id: string): Promise<OrderDetailDto> {
    return loadDetail(id);
  },

  async create(input: CreateOrderInput): Promise<OrderDetailDto> {
    if (input.customerId) {
      const customer = await customerRepository.findById(pool, input.customerId);
      if (!customer) throw ApiError.notFound('Customer');
    }

    const orderId = await withTransaction(async (client) => {
      const lineItems = [];
      let subtotal = 0;

      for (const item of input.items) {
        const product = await productRepository.findById(client, item.productId);
        if (!product) throw ApiError.notFound('Product', 'PRODUCT_NOT_FOUND');

        const unitPrice = item.unitPrice ?? Number(product.selling_price);
        const discount = item.discount ?? 0;
        const total = unitPrice * item.quantity - discount;

        lineItems.push({
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          unitPrice,
          discount,
          total,
          costPrice: Number(product.purchase_price),
        });
        subtotal += total;
      }

      const total = subtotal - input.discount + input.shippingFee + input.tax + input.stitchingCharge;
      const orderNumber = await orderRepository.nextOrderNumber(client);

      const order = await orderRepository.create(client, {
        orderNumber,
        customerId: input.customerId ?? null,
        subtotal,
        discount: input.discount,
        shippingFee: input.shippingFee,
        tax: input.tax,
        stitchingCharge: input.stitchingCharge,
        total,
        paymentStatus: input.paymentStatus,
        notes: input.notes ?? null,
      });

      await orderRepository.createItems(client, order.id, lineItems);
      return order.id;
    });

    return loadDetail(orderId);
  },

  async update(id: string, input: UpdateOrderInput): Promise<OrderDetailDto> {
    const order = await orderRepository.findById(pool, id);
    if (!order) throw ApiError.notFound('Order');

    if (input.customerId) {
      const customer = await customerRepository.findById(pool, input.customerId);
      if (!customer) throw ApiError.notFound('Customer');
    }

    const discount = input.discount ?? Number(order.discount);
    const shippingFee = input.shippingFee ?? Number(order.shipping_fee);
    const tax = input.tax ?? Number(order.tax);
    const stitchingCharge = input.stitchingCharge ?? Number(order.stitching_charge);
    const total = Number(order.subtotal) - discount + shippingFee + tax + stitchingCharge;

    await orderRepository.updateFields(pool, id, {
      ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
      ...(input.discount !== undefined ? { discount: input.discount } : {}),
      ...(input.shippingFee !== undefined ? { shippingFee: input.shippingFee } : {}),
      ...(input.tax !== undefined ? { tax: input.tax } : {}),
      ...(input.stitchingCharge !== undefined ? { stitchingCharge: input.stitchingCharge } : {}),
      ...(input.notes !== undefined ? { notes: input.notes ?? null } : {}),
      total,
    });

    return loadDetail(id);
  },

  async updateStatus(id: string, nextStatus: OrderStatus, userId: string): Promise<OrderDetailDto> {
    await withTransaction(async (client) => {
      const order = await lockOrderOrThrow(client, id);
      const currentStatus = order.order_status;

      if (currentStatus === nextStatus) return;

      const allowed = ORDER_STATUS_TRANSITIONS[currentStatus] ?? [];
      if (!allowed.includes(nextStatus)) {
        throw ApiError.validation(
          `Cannot move an order from ${currentStatus} to ${nextStatus}`,
        );
      }

      const items = await orderRepository.getItems(client, id);

      if (nextStatus === 'CONFIRMED') {
        await deductStockForOrder(client, order, items, userId);
      } else if (nextStatus === 'CANCELLED') {
        // Only restore stock if it was actually deducted for this order
        // (i.e. it had progressed past PENDING) — restoring from PENDING
        // would double-credit stock that was never removed.
        if (STOCK_DEDUCTED_STATUSES.includes(currentStatus)) {
          await restoreStockForOrder(client, order, items, 'CANCELLED_ORDER', userId);
        }
      } else if (nextStatus === 'RETURNED') {
        await restoreStockForOrder(client, order, items, 'RETURN', userId);
      }

      await orderRepository.updateStatus(client, id, nextStatus);
    });

    return loadDetail(id);
  },

  async updatePaymentStatus(id: string, status: PaymentStatus): Promise<OrderDetailDto> {
    const order = await orderRepository.findById(pool, id);
    if (!order) throw ApiError.notFound('Order');
    await orderRepository.updatePaymentStatus(pool, id, status);
    return loadDetail(id);
  },
};
