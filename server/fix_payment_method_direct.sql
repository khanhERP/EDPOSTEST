
-- Direct conversion of payment_method from integer to text
BEGIN;

-- Step 1: Add temporary column
ALTER TABLE orders ADD COLUMN payment_method_new TEXT;

-- Step 2: Convert existing integer values to text
UPDATE orders 
SET payment_method_new = CASE 
    WHEN payment_method = 1 THEN 'cash'
    WHEN payment_method = 2 THEN 'card'
    WHEN payment_method = 3 THEN 'mobile'
    WHEN payment_method = 4 THEN 'einvoice'
    ELSE 'cash'
END
WHERE payment_method IS NOT NULL;

-- Step 3: Set default for NULL values
UPDATE orders 
SET payment_method_new = 'cash' 
WHERE payment_method_new IS NULL;

-- Step 4: Drop old column
ALTER TABLE orders DROP COLUMN payment_method;

-- Step 5: Rename new column
ALTER TABLE orders RENAME COLUMN payment_method_new TO payment_method;

-- Step 6: Verify the change
SELECT 'Migration completed. Column info:' as status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'payment_method';

COMMIT;
