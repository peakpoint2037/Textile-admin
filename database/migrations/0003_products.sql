CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  sku VARCHAR NOT NULL UNIQUE,

  name VARCHAR NOT NULL,
  description TEXT,

  size VARCHAR,
  color VARCHAR,

  purchase_price DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),

  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  low_stock_limit INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_limit >= 0),

  status VARCHAR NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_sku ON products (sku);
CREATE INDEX idx_products_category_id ON products (category_id);
CREATE INDEX idx_products_status ON products (status);
CREATE INDEX idx_products_name ON products (name);
CREATE INDEX idx_products_stock_quantity ON products (stock_quantity);

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
