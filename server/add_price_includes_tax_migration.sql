
-- Add price_includes_tax column to store_settings table for PostgreSQL
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'store_settings' 
                   AND column_name = 'price_includes_tax') THEN
        ALTER TABLE store_settings ADD COLUMN price_includes_tax BOOLEAN DEFAULT FALSE;
    END IF;
END $$;
