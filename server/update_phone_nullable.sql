
-- Migration to ensure phone field can be null
ALTER TABLE employees ALTER COLUMN phone DROP NOT NULL;
