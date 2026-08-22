CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  category VARCHAR NOT NULL CHECK (
    category IN ('PACKAGING', 'MARKETING', 'SHIPPING', 'PRINTING', 'PHOTOGRAPHY', 'WEBSITE', 'OTHER')
  ),
  description TEXT,

  amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),

  expense_date DATE NOT NULL,

  created_by UUID REFERENCES users(id),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_category ON expenses (category);
CREATE INDEX idx_expenses_expense_date ON expenses (expense_date);
