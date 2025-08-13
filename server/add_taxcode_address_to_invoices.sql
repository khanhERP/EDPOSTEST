
-- Migration to add customer taxCode and address columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_tax_code VARCHAR(20);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_address TEXT;

-- Add comments for the columns
COMMENT ON COLUMN invoices.customer_tax_code IS 'Customer tax code for display purposes';
COMMENT ON COLUMN invoices.customer_address IS 'Customer address for display purposes';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_customer_tax_code ON invoices(customer_tax_code);
