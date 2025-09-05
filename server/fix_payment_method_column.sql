
-- Fix payment_method column type in orders table
-- Ensure it's TEXT not INTEGER

-- Check current data type
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'payment_method';

-- If it's INTEGER, we need to convert it
-- First, update any numeric values to text equivalents
UPDATE orders 
SET payment_method = CASE 
    WHEN payment_method = '1' THEN 'cash'
    WHEN payment_method = '2' THEN 'card'
    WHEN payment_method = '3' THEN 'mobile'
    WHEN payment_method = '4' THEN 'einvoice'
    ELSE payment_method
END 
WHERE payment_method IS NOT NULL;

-- Drop and recreate the column if it's the wrong type
DO $$ 
BEGIN
    -- Check if payment_method is integer type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'payment_method' 
        AND data_type = 'integer'
    ) THEN
        -- Drop the column and recreate as text
        ALTER TABLE orders DROP COLUMN payment_method;
        ALTER TABLE orders ADD COLUMN payment_method TEXT;
    END IF;
END $$;

-- Ensure the column exists as TEXT
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);

-- Verify the change
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'payment_method';
