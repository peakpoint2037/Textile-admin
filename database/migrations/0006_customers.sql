CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name VARCHAR NOT NULL,
  phone VARCHAR,
  email VARCHAR,

  address TEXT,
  city VARCHAR,
  state VARCHAR,
  pincode VARCHAR,
  country VARCHAR DEFAULT 'India',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_name ON customers (name);
CREATE INDEX idx_customers_phone ON customers (phone);
CREATE INDEX idx_customers_email ON customers (email);

CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
