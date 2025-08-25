import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool, { schema });

export async function initializeDatabase() {
  try {
    // Run migration for product_type column
    try {
      await db.execute(sql`
        ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type INTEGER DEFAULT 1
      `);
      await db.execute(sql`
        UPDATE products SET product_type = 1 WHERE product_type IS NULL
      `);

      console.log("Migration for product_type column completed successfully.");
    } catch (migrationError) {
      console.log(
        "Product type migration already applied or error:",
        migrationError,
      );
    }

    // Run migration for tax_rate column
    try {
      await db.execute(sql`
        ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 10.00
      `);
      await db.execute(sql`
        UPDATE products SET tax_rate = 10.00 WHERE tax_rate IS NULL
      `);

      console.log("Migration for tax_rate column completed successfully.");
    } catch (migrationError) {
      console.log(
        "Tax rate migration already applied or error:",
        migrationError,
      );
    }

    // Run migration for pinCode column in store_settings
    try {
      await db.execute(sql`
        ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS pin_code TEXT
      `);

      console.log("Migration for pinCode column completed successfully.");
    } catch (migrationError) {
      console.log(
        "PinCode migration already applied or error:",
        migrationError,
      );
    }

    // Add templateCode column to invoice_templates table
    try {
      await db.execute(sql`
        ALTER TABLE invoice_templates 
        ADD COLUMN IF NOT EXISTS template_code VARCHAR(50)
      `);
      console.log("Migration for templateCode column completed successfully.");
    } catch (error) {
      console.log(
        "TemplateCode migration failed or column already exists:",
        error,
      );
    }

    // Add trade_number column to invoices table and migrate data
    try {
      await db.execute(sql`
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS trade_number VARCHAR(50)
      `);

      // Copy data from invoice_number to trade_number
      await db.execute(sql`
        UPDATE invoices SET trade_number = invoice_number WHERE trade_number IS NULL OR trade_number = ''
      `);

      // Clear invoice_number column
      await db.execute(sql`
        UPDATE invoices SET invoice_number = NULL
      `);

      // Create index for trade_number
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_invoices_trade_number ON invoices(trade_number)
      `);

      console.log("Migration for trade_number column completed successfully.");
    } catch (error) {
      console.log("Trade number migration failed or already applied:", error);
    }

    // Add invoice_status column to invoices table
    try {
      await db.execute(sql`
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_status INTEGER NOT NULL DEFAULT 1
      `);

      // Create index for invoice_status
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_invoices_invoice_status ON invoices(invoice_status)
      `);

      console.log(
        "Migration for invoice_status column completed successfully.",
      );
    } catch (error) {
      console.log("Invoice status migration failed or already applied:", error);
    }

    // Run migration for email constraint in employees table
    try {
      await db.execute(sql`
        ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_email_unique
      `);

      await db.execute(sql`
        CREATE UNIQUE INDEX IF NOT EXISTS employees_email_unique_idx 
        ON employees (email) 
        WHERE email IS NOT NULL AND email != ''
      `);

      await db.execute(sql`
        UPDATE employees SET email = NULL WHERE email = ''
      `);

      console.log(
        "Migration for employees email constraint completed successfully.",
      );
    } catch (migrationError) {
      console.log(
        "Email constraint migration already applied or error:",
        migrationError,
      );
    }

    // Skip sample data initialization - using external database
    console.log("🔍 Checking customer table data...");
    const customerCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers);
    console.log(
      `📊 Found ${customerCount[0]?.count || 0} customers in database`,
    );

    // Note: Sample data insertion disabled for external database
    console.log("ℹ️ Sample data insertion skipped - using external database");

    // Initialize inventory_transactions table if it doesn't exist
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS inventory_transactions (
          id SERIAL PRIMARY KEY,
          product_id INTEGER REFERENCES products(id) NOT NULL,
          type VARCHAR(20) NOT NULL,
          quantity INTEGER NOT NULL,
          previous_stock INTEGER NOT NULL,
          new_stock INTEGER NOT NULL,
          notes TEXT,
          created_at VARCHAR(50) NOT NULL
        )
      `);
      console.log("Inventory transactions table initialized");
    } catch (error) {
      console.log(
        "Inventory transactions table already exists or initialization failed:",
        error,
      );
    }

    // Initialize einvoice_connections table if it doesn't exist
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS einvoice_connections (
          id SERIAL PRIMARY KEY,
          symbol VARCHAR(10) NOT NULL,
          tax_code VARCHAR(20) NOT NULL,
          login_id VARCHAR(50) NOT NULL,
          password TEXT NOT NULL,
          software_name VARCHAR(50) NOT NULL,
          login_url TEXT,
          sign_method VARCHAR(20) NOT NULL DEFAULT 'Ký server',
          cqt_code VARCHAR(20) NOT NULL DEFAULT 'Cấp nhật',
          notes TEXT,
          is_default BOOLEAN NOT NULL DEFAULT false,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      // Create indexes for better performance
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_einvoice_connections_symbol ON einvoice_connections(symbol)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_einvoice_connections_active ON einvoice_connections(is_active)
      `);

      console.log("E-invoice connections table initialized");
    } catch (error) {
      console.log(
        "E-invoice connections table already exists or initialization failed:",
        error,
      );
    }

    // Initialize invoice_templates table if it doesn't exist
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS invoice_templates (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          template_number VARCHAR(50) NOT NULL,
          template_code VARCHAR(50),
          symbol VARCHAR(20) NOT NULL,
          use_ck BOOLEAN NOT NULL DEFAULT true,
          notes TEXT,
          is_default BOOLEAN NOT NULL DEFAULT false,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      // Create indexes for better performance
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_invoice_templates_symbol ON invoice_templates(symbol)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_invoice_templates_default ON invoice_templates(is_default)
      `);

      console.log("Invoice templates table initialized");
    } catch (error) {
      console.log(
        "Invoice templates table already exists or initialization failed:",
        error,
      );
    }

    // Initialize invoices table if it doesn't exist
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS invoices (
          id SERIAL PRIMARY KEY,
          invoice_number VARCHAR(50) UNIQUE NOT NULL,
          customer_id INTEGER,
          customer_name VARCHAR(100) NOT NULL,
          customer_tax_code VARCHAR(20),
          customer_address TEXT,
          customer_phone VARCHAR(20),
          customer_email VARCHAR(100),
          subtotal DECIMAL(10, 2) NOT NULL,
          tax DECIMAL(10, 2) NOT NULL,
          total DECIMAL(10, 2) NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          invoice_date TIMESTAMP NOT NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'draft',
          einvoice_status INTEGER NOT NULL DEFAULT 0,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        )
      `);

      // Create indexes for better performance
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)
      `);

      console.log("Invoices table initialized");
    } catch (error) {
      console.log(
        "Invoices table already exists or initialization failed:",
        error,
      );
    }

    // Initialize invoice_items table if it doesn't exist
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS invoice_items (
          id SERIAL PRIMARY KEY,
          invoice_id INTEGER REFERENCES invoices(id) NOT NULL,
          product_id INTEGER,
          product_name VARCHAR(200) NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price DECIMAL(10, 2) NOT NULL,
          total DECIMAL(10, 2) NOT NULL,
          tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.00
        )
      `);

      // Create indexes for better performance
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id)
      `);

      console.log("Invoice items table initialized");
    } catch (error) {
      console.log(
        "Invoice items table already exists or initialization failed:",
        error,
      );
    }
  } catch (error) {
    console.log("⚠️ Sample data initialization skipped:", error);
  }
}
