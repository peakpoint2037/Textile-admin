CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id UUID NOT NULL REFERENCES products(id),

  type VARCHAR NOT NULL CHECK (
    type IN ('OPENING_STOCK', 'STOCK_IN', 'SALE', 'RETURN', 'DAMAGE', 'ADJUSTMENT', 'CANCELLED_ORDER')
  ),

  quantity INTEGER NOT NULL CHECK (quantity <> 0),

  reference_type VARCHAR,
  reference_id UUID,

  reason TEXT,

  created_by UUID REFERENCES users(id),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_movements_product_id ON inventory_movements (product_id);
CREATE INDEX idx_inventory_movements_type ON inventory_movements (type);
CREATE INDEX idx_inventory_movements_created_at ON inventory_movements (created_at);
CREATE INDEX idx_inventory_movements_reference ON inventory_movements (reference_type, reference_id);
