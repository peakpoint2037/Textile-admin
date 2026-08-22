import { pool } from '../db-client.js';

const DEV_OWNER_ID = '00000000-0000-0000-0000-000000000001';

interface SeedProduct {
  sku: string;
  name: string;
  category: string;
  size: string | null;
  color: string | null;
  purchasePrice: number;
  sellingPrice: number;
  stockQuantity: number;
  lowStockLimit: number;
}

const CATEGORIES = ['T-Shirts', 'Shirts', 'Hoodies', 'Pants', 'Accessories'];

const PRODUCTS: SeedProduct[] = [
  { sku: 'TS-BLK-S', name: 'Oversized T-Shirt', category: 'T-Shirts', size: 'S', color: 'Black', purchasePrice: 250, sellingPrice: 699, stockQuantity: 25, lowStockLimit: 5 },
  { sku: 'TS-BLK-M', name: 'Oversized T-Shirt', category: 'T-Shirts', size: 'M', color: 'Black', purchasePrice: 250, sellingPrice: 699, stockQuantity: 40, lowStockLimit: 5 },
  { sku: 'TS-BLK-L', name: 'Oversized T-Shirt', category: 'T-Shirts', size: 'L', color: 'Black', purchasePrice: 250, sellingPrice: 699, stockQuantity: 3, lowStockLimit: 5 },
  { sku: 'TS-WHT-M', name: 'Oversized T-Shirt', category: 'T-Shirts', size: 'M', color: 'White', purchasePrice: 250, sellingPrice: 699, stockQuantity: 15, lowStockLimit: 5 },
  { sku: 'SH-BLU-M', name: 'Casual Shirt', category: 'Shirts', size: 'M', color: 'Blue', purchasePrice: 400, sellingPrice: 999, stockQuantity: 20, lowStockLimit: 5 },
  { sku: 'SH-WHT-L', name: 'Casual Shirt', category: 'Shirts', size: 'L', color: 'White', purchasePrice: 400, sellingPrice: 999, stockQuantity: 0, lowStockLimit: 5 },
  { sku: 'HD-GRY-M', name: 'Pullover Hoodie', category: 'Hoodies', size: 'M', color: 'Grey', purchasePrice: 600, sellingPrice: 1499, stockQuantity: 18, lowStockLimit: 5 },
  { sku: 'HD-BLK-L', name: 'Pullover Hoodie', category: 'Hoodies', size: 'L', color: 'Black', purchasePrice: 600, sellingPrice: 1499, stockQuantity: 4, lowStockLimit: 5 },
  { sku: 'PT-BLK-32', name: 'Cargo Pants', category: 'Pants', size: '32', color: 'Black', purchasePrice: 500, sellingPrice: 1299, stockQuantity: 22, lowStockLimit: 5 },
  { sku: 'PT-KHK-34', name: 'Cargo Pants', category: 'Pants', size: '34', color: 'Khaki', purchasePrice: 500, sellingPrice: 1299, stockQuantity: 10, lowStockLimit: 5 },
  { sku: 'AC-CAP-OS', name: 'Baseball Cap', category: 'Accessories', size: null, color: 'Black', purchasePrice: 150, sellingPrice: 399, stockQuantity: 50, lowStockLimit: 10 },
  { sku: 'AC-BLT-OS', name: 'Leather Belt', category: 'Accessories', size: null, color: 'Brown', purchasePrice: 200, sellingPrice: 599, stockQuantity: 12, lowStockLimit: 5 },
];

const CUSTOMERS = [
  { name: 'Priya Sharma', phone: '9876500001', email: 'priya.sharma@example.com', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  { name: 'Rahul Verma', phone: '9876500002', email: 'rahul.verma@example.com', city: 'Delhi', state: 'Delhi', pincode: '110001' },
  { name: 'Ananya Iyer', phone: '9876500003', email: 'ananya.iyer@example.com', city: 'Bengaluru', state: 'Karnataka', pincode: '560001' },
  { name: 'Karan Mehta', phone: '9876500004', email: 'karan.mehta@example.com', city: 'Ahmedabad', state: 'Gujarat', pincode: '380001' },
  { name: 'Sneha Reddy', phone: '9876500005', email: 'sneha.reddy@example.com', city: 'Hyderabad', state: 'Telangana', pincode: '500001' },
];

const EXPENSES: Array<{ category: string; description: string; amount: number; daysAgo: number }> = [
  { category: 'PACKAGING', description: 'Poly bags and boxes (500 units)', amount: 800, daysAgo: 25 },
  { category: 'MARKETING', description: 'Instagram ad campaign', amount: 1200, daysAgo: 20 },
  { category: 'SHIPPING', description: 'Courier pickup charges', amount: 450, daysAgo: 18 },
  { category: 'PRINTING', description: 'Invoice booklets', amount: 300, daysAgo: 15 },
  { category: 'PHOTOGRAPHY', description: 'Product shoot for new arrivals', amount: 1000, daysAgo: 10 },
  { category: 'WEBSITE', description: 'Domain renewal', amount: 600, daysAgo: 5 },
  { category: 'OTHER', description: 'Miscellaneous stationery', amount: 200, daysAgo: 2 },
];

function daysAgoDate(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  const client = await pool.connect();
  try {
    console.log('Clearing existing data...');
    await client.query(
      'TRUNCATE inventory_movements, order_items, orders, product_images, products, categories, customers, expenses, users RESTART IDENTITY CASCADE',
    );
    await client.query('ALTER SEQUENCE order_number_seq RESTART WITH 1001');

    console.log('Seeding users...');
    await client.query(
      `INSERT INTO users (id, email, name, role, is_active) VALUES ($1, 'owner@dev.local', 'Dev Owner', 'OWNER', TRUE)`,
      [DEV_OWNER_ID],
    );

    console.log('Seeding categories...');
    const categoryIdByName = new Map<string, string>();
    for (const name of CATEGORIES) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO categories (name, slug) VALUES ($1, $2) RETURNING id`,
        [name, slug],
      );
      categoryIdByName.set(name, rows[0]!.id);
    }

    console.log('Seeding products...');
    const productIdBySku = new Map<string, string>();
    for (const p of PRODUCTS) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO products
          (category_id, sku, name, size, color, purchase_price, selling_price, stock_quantity, low_stock_limit, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')
         RETURNING id`,
        [
          categoryIdByName.get(p.category),
          p.sku,
          p.name,
          p.size,
          p.color,
          p.purchasePrice,
          p.sellingPrice,
          p.stockQuantity,
          p.lowStockLimit,
        ],
      );
      const productId = rows[0]!.id;
      productIdBySku.set(p.sku, productId);

      if (p.stockQuantity > 0) {
        await client.query(
          `INSERT INTO inventory_movements (product_id, type, quantity, reason, created_by)
           VALUES ($1, 'OPENING_STOCK', $2, 'Initial stock on product creation', $3)`,
          [productId, p.stockQuantity, DEV_OWNER_ID],
        );
      }
    }

    console.log('Seeding customers...');
    const customerIds: string[] = [];
    for (const c of CUSTOMERS) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO customers (name, phone, email, city, state, pincode, country)
         VALUES ($1, $2, $3, $4, $5, $6, 'India') RETURNING id`,
        [c.name, c.phone, c.email, c.city, c.state, c.pincode],
      );
      customerIds.push(rows[0]!.id);
    }

    console.log('Seeding orders...');

    async function createOrder(opts: {
      customerId: string | null;
      items: Array<{ sku: string; quantity: number }>;
      shippingFee: number;
      orderStatus: 'PENDING' | 'CONFIRMED' | 'DELIVERED' | 'CANCELLED';
      paymentStatus: 'PENDING' | 'PAID' | 'COD';
      daysAgo: number;
      deductStock: boolean;
    }) {
      const { rows: seqRows } = await client.query<{ n: string }>(`SELECT nextval('order_number_seq') AS n`);
      const orderNumber = `ORD-${seqRows[0]!.n}`;

      let subtotal = 0;
      const lineItems = opts.items.map((item) => {
        const sku = item.sku;
        const product = PRODUCTS.find((p) => p.sku === sku)!;
        const total = product.sellingPrice * item.quantity;
        subtotal += total;
        return { ...item, productId: productIdBySku.get(sku)!, product, total };
      });
      const total = subtotal + opts.shippingFee;
      const orderDate = new Date();
      orderDate.setUTCDate(orderDate.getUTCDate() - opts.daysAgo);

      const { rows: orderRows } = await client.query<{ id: string }>(
        `INSERT INTO orders
          (order_number, customer_id, order_date, subtotal, discount, shipping_fee, tax, total, payment_status, order_status)
         VALUES ($1, $2, $3, $4, 0, $5, 0, $6, $7, $8)
         RETURNING id`,
        [orderNumber, opts.customerId, orderDate.toISOString(), subtotal, opts.shippingFee, total, opts.paymentStatus, opts.orderStatus],
      );
      const orderId = orderRows[0]!.id;

      for (const item of lineItems) {
        await client.query(
          `INSERT INTO order_items (order_id, product_id, product_name, sku, quantity, unit_price, discount, total, cost_price)
           VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8)`,
          [orderId, item.productId, item.product.name, item.sku, item.quantity, item.product.sellingPrice, item.total, item.product.purchasePrice],
        );

        if (opts.deductStock) {
          await client.query('UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2', [
            item.quantity,
            item.productId,
          ]);
          await client.query(
            `INSERT INTO inventory_movements (product_id, type, quantity, reference_type, reference_id, reason, created_by)
             VALUES ($1, 'SALE', $2, 'ORDER', $3, $4, $5)`,
            [item.productId, -item.quantity, orderId, `Order ${orderNumber} confirmed`, DEV_OWNER_ID],
          );
        }
      }

      return orderId;
    }

    // 3 delivered, paid orders spread over the last month
    await createOrder({
      customerId: customerIds[0]!,
      items: [{ sku: 'TS-BLK-M', quantity: 2 }, { sku: 'AC-CAP-OS', quantity: 1 }],
      shippingFee: 50,
      orderStatus: 'DELIVERED',
      paymentStatus: 'PAID',
      daysAgo: 21,
      deductStock: true,
    });
    await createOrder({
      customerId: customerIds[1]!,
      items: [{ sku: 'HD-GRY-M', quantity: 1 }],
      shippingFee: 0,
      orderStatus: 'DELIVERED',
      paymentStatus: 'PAID',
      daysAgo: 14,
      deductStock: true,
    });
    await createOrder({
      customerId: customerIds[2]!,
      items: [{ sku: 'PT-BLK-32', quantity: 1 }, { sku: 'SH-BLU-M', quantity: 1 }],
      shippingFee: 50,
      orderStatus: 'DELIVERED',
      paymentStatus: 'COD',
      daysAgo: 6,
      deductStock: true,
    });

    // 2 confirmed orders still being processed
    await createOrder({
      customerId: customerIds[3]!,
      items: [{ sku: 'TS-WHT-M', quantity: 3 }],
      shippingFee: 50,
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PAID',
      daysAgo: 2,
      deductStock: true,
    });
    await createOrder({
      customerId: customerIds[4]!,
      items: [{ sku: 'AC-BLT-OS', quantity: 2 }],
      shippingFee: 0,
      orderStatus: 'CONFIRMED',
      paymentStatus: 'COD',
      daysAgo: 1,
      deductStock: true,
    });

    // 1 pending order (no stock effect yet)
    await createOrder({
      customerId: customerIds[0]!,
      items: [{ sku: 'PT-KHK-34', quantity: 1 }],
      shippingFee: 50,
      orderStatus: 'PENDING',
      paymentStatus: 'PENDING',
      daysAgo: 0,
      deductStock: false,
    });

    // 1 order cancelled while still pending (never deducted, so no restore needed)
    await createOrder({
      customerId: null,
      items: [{ sku: 'TS-BLK-S', quantity: 1 }],
      shippingFee: 0,
      orderStatus: 'CANCELLED',
      paymentStatus: 'PENDING',
      daysAgo: 3,
      deductStock: false,
    });

    // 1 order that was confirmed then cancelled, to demonstrate stock restoration
    const cancelledAfterConfirmId = await createOrder({
      customerId: customerIds[1]!,
      items: [{ sku: 'HD-BLK-L', quantity: 1 }],
      shippingFee: 0,
      orderStatus: 'CONFIRMED',
      paymentStatus: 'PENDING',
      daysAgo: 4,
      deductStock: true,
    });
    {
      const productId = productIdBySku.get('HD-BLK-L')!;
      await client.query('UPDATE products SET stock_quantity = stock_quantity + 1 WHERE id = $1', [productId]);
      await client.query(
        `INSERT INTO inventory_movements (product_id, type, quantity, reference_type, reference_id, reason, created_by)
         VALUES ($1, 'CANCELLED_ORDER', 1, 'ORDER', $2, 'Order cancelled after confirmation', $3)`,
        [productId, cancelledAfterConfirmId, DEV_OWNER_ID],
      );
      await client.query(`UPDATE orders SET order_status = 'CANCELLED' WHERE id = $1`, [cancelledAfterConfirmId]);
    }

    console.log('Seeding expenses...');
    for (const e of EXPENSES) {
      await client.query(
        `INSERT INTO expenses (category, description, amount, expense_date, created_by)
         VALUES ($1, $2, $3, $4, $5)`,
        [e.category, e.description, e.amount, daysAgoDate(e.daysAgo), DEV_OWNER_ID],
      );
    }

    console.log('Seed complete.');
    console.log(`  ${CATEGORIES.length} categories, ${PRODUCTS.length} products, ${CUSTOMERS.length} customers`);
    console.log('  8 orders (3 delivered, 2 confirmed, 1 pending, 2 cancelled), 7 expenses');
    console.log('\nRun `npm run dev-token` to get a bearer token for the seeded OWNER user.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
