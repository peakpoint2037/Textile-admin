CREATE TABLE product_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  name VARCHAR NOT NULL,
  description TEXT,

  purchase_price DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
  selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),

  status VARCHAR NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_groups_category_id ON product_groups (category_id);
CREATE INDEX idx_product_groups_status ON product_groups (status);

CREATE TRIGGER product_groups_set_updated_at
  BEFORE UPDATE ON product_groups
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- A product with group_id NULL is a standalone product, exactly like every
-- existing row today. Grouping is purely additive: no existing product's
-- shape or behavior changes.
ALTER TABLE products
  ADD COLUMN group_id UUID REFERENCES product_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_products_group_id ON products (group_id);
