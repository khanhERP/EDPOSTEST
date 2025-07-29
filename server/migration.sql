-- Migration script to add membership threshold columns
-- Add missing columns for membership thresholds
ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS gold_threshold TEXT DEFAULT '300000';

ALTER TABLE store_settings 
ADD COLUMN IF NOT EXISTS vip_threshold TEXT DEFAULT '1000000';

-- Update existing records if they don't have these values
UPDATE store_settings 
SET gold_threshold = '300000', vip_threshold = '1000000' 
WHERE gold_threshold IS NULL OR vip_threshold IS NULL;

-- Add businessType column to store_settings table
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'restaurant';
-- Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) NOT NULL,
  type VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  notes TEXT,
  created_at VARCHAR(50) NOT NULL
);
