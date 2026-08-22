CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  order_number VARCHAR NOT NULL UNIQUE,

  customer_id UUID REFERENCES customers(id),

  order_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  discount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  shipping_fee DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL DEFAULT 0,

  payment_status VARCHAR NOT NULL DEFAULT 'PENDING' CHECK (
    payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'COD')
  ),

  order_status VARCHAR NOT NULL DEFAULT 'PENDING' CHECK (
    order_status IN ('PENDING', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED')
  ),

  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_order_number ON orders (order_number);
CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_orders_order_status ON orders (order_status);
CREATE INDEX idx_orders_payment_status ON orders (payment_status);
CREATE INDEX idx_orders_order_date ON orders (order_date);

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
