

-- Fix payment_method column type in orders table
-- Ensure it's TEXT not INTEGER

-- Check current data type
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'payment_method';

-- Update existing records to convert integer values to text
UPDATE orders 
SET payment_method = CASE 
    WHEN payment_method = '1' THEN 'cash'
    WHEN payment_method = '2' THEN 'card'
    WHEN payment_method = '3' THEN 'mobile'
    WHEN payment_method = '4' THEN 'einvoice'
    ELSE payment_method
END 
WHERE payment_method IS NOT NULL AND payment_method ~ '^[0-9]+$';

-- If payment_method is INTEGER type, convert it to TEXT
DO $$ 
BEGIN
    -- Check if payment_method is integer type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' 
        AND column_name = 'payment_method' 
        AND data_type = 'integer'
    ) THEN
        -- Add temporary column
        ALTER TABLE orders ADD COLUMN payment_method_temp TEXT;
        
        -- Copy data with conversion
        UPDATE orders 
        SET payment_method_temp = CASE 
            WHEN payment_method = 1 THEN 'cash'
            WHEN payment_method = 2 THEN 'card'
            WHEN payment_method = 3 THEN 'mobile'
            WHEN payment_method = 4 THEN 'einvoice'
            ELSE 'cash'
        END;
        
        -- Drop old column and rename
        ALTER TABLE orders DROP COLUMN payment_method;
        ALTER TABLE orders RENAME COLUMN payment_method_temp TO payment_method;
        
        RAISE NOTICE 'Converted payment_method from INTEGER to TEXT';
    ELSE
        RAISE NOTICE 'payment_method is already TEXT type';
    END IF;
END $$;

-- Ensure the column exists as TEXT if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE orders ADD COLUMN payment_method TEXT;
        RAISE NOTICE 'Added payment_method column as TEXT';
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);

-- Verify the final result
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'payment_method';

