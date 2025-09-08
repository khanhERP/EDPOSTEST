
-- Migration to add discount column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Add comment for the column
COMMENT ON COLUMN orders.discount IS 'Discount amount applied to the order';

-- Create index for better performance when filtering by discount
CREATE INDEX IF NOT EXISTS idx_orders_discount ON orders(discount);

-- Update existing orders to set discount to 0 if null
UPDATE orders SET discount = 0.00 WHERE discount IS NULL;
