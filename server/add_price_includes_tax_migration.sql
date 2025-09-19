
-- Add price_includes_tax column to store_settings table
ALTER TABLE store_settings ADD COLUMN price_includes_tax INTEGER DEFAULT 0;
