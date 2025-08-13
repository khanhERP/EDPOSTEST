
-- Migration to add transactionNumber and cashierName columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS transaction_number VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS cashier_name VARCHAR(100);

-- Add comment for the columns
COMMENT ON COLUMN invoices.transaction_number IS 'Transaction number reference from POS system';
COMMENT ON COLUMN invoices.cashier_name IS 'Name of the cashier who created the invoice';

-- Create index for better performance on transaction_number
CREATE INDEX IF NOT EXISTS idx_invoices_transaction_number ON invoices(transaction_number);
