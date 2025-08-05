
-- Migration to ensure email field can be null in employees table
ALTER TABLE employees ALTER COLUMN email DROP NOT NULL;
