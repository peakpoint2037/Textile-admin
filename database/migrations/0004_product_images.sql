CREATE TABLE product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  storage_key TEXT NOT NULL,
  image_url TEXT NOT NULL,

  alt_text VARCHAR,

  sort_order INTEGER NOT NULL DEFAULT 0,

  is_primary BOOLEAN NOT NULL DEFAULT FALSE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product_id ON product_images (product_id);

-- At most one primary image per product.
CREATE UNIQUE INDEX idx_product_images_one_primary
  ON product_images (product_id)
  WHERE is_primary = TRUE;
