CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  product_id UUID NOT NULL REFERENCES products(id),

  product_name VARCHAR NOT NULL,
  sku VARCHAR NOT NULL,

  quantity INTEGER NOT NULL CHECK (quantity > 0),

  unit_price DECIMAL(12, 2) NOT NULL,
  discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,

  -- Snapshot of the product's purchase_price at order-creation time, so
  -- profit on historical orders never shifts as current purchase prices change.
  cost_price DECIMAL(12, 2) NOT NULL
);

CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);
