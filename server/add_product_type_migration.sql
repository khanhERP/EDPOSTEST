
-- Add productType column to products table
ALTER TABLE products ADD COLUMN product_type INTEGER NOT NULL DEFAULT 1;
