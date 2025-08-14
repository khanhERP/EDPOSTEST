import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";
import {
  categories,
  products,
  employees,
  tables,
  orders,
  orderItems,
  transactions,
  transactionItems,
  attendanceRecords,
  storeSettings,
  suppliers,
  customers,
} from "@shared/schema";
import { sql } from "drizzle-orm";

// Load environment variables from .env file with higher priority
import { config } from "dotenv";
import path from "path";

// Load .env.local first, then override with .env to ensure .env has priority
config({ path: path.resolve(".env.local") });
config({ path: path.resolve(".env") });

// Use EXTERNAL_DB_URL first, then fallback to CUSTOM_DATABASE_URL, then DATABASE_URL
const DATABASE_URL =
  process.env.EXTERNAL_DB_URL ||
  process.env.CUSTOM_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  host: "1.55.212.138",
  user: "postgres",
  password: "Info@2025",
  database: "edpos",
  port: 5432,
});

// Log database connection info with detailed debugging
console.log("🔍 Environment check:");
console.log("  - NODE_ENV:", process.env.NODE_ENV);
console.log(
  "  - CUSTOM_DATABASE_URL exists:",
  !!process.env.CUSTOM_DATABASE_URL,
);
console.log("  - DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("  - EXTERNAL_DB_URL exists:", !!process.env.EXTERNAL_DB_URL);
console.log(
  "  - Using URL:",
  process.env.EXTERNAL_DB_URL
    ? "EXTERNAL_DB_URL"
    : process.env.CUSTOM_DATABASE_URL
      ? "CUSTOM_DATABASE_URL"
      : "DATABASE_URL",
);
console.log(
  "  - DATABASE_URL preview:",
  DATABASE_URL?.substring(0, 50) + "...",
);
console.log(
  "  - DATABASE_URL full (masked):",
  DATABASE_URL?.replace(/:[^:@]*@/, ":****@"),
);
console.log(
  "  - Contains 1.55.212.138:",
  DATABASE_URL?.includes("1.55.212.138"),
);
console.log("  - Contains neon:", DATABASE_URL?.includes("neon"));
console.log(
  "🔗 Database connection string:",
  DATABASE_URL?.replace(/:[^:@]*@/, ":****@"),
);

export const db = drizzle(pool, { schema });

// Initialize sample data function
export async function initializeSampleData() {
  try {
    console.log("🚀 Running optimized database migrations...");
    
    // Batch migrations for better performance
    const migrationPromises = [];

    // Membership thresholds migration
    migrationPromises.push(
      (async () => {
        try {
          await db.execute(sql`
            ALTER TABLE store_settings 
            ADD COLUMN IF NOT EXISTS gold_threshold TEXT DEFAULT '300000',
            ADD COLUMN IF NOT EXISTS vip_threshold TEXT DEFAULT '1000000'
          `);
          await db.execute(sql`
            UPDATE store_settings 
            SET gold_threshold = COALESCE(gold_threshold, '300000'), 
                vip_threshold = COALESCE(vip_threshold, '1000000')
          `);
          console.log("✅ Membership thresholds migration completed");
        } catch (error) {
          console.log("⚠️ Membership thresholds migration skipped:", error.message);
        }
      })()
    );

    // Product columns migration
    migrationPromises.push(
      (async () => {
        try {
          await db.execute(sql`
            ALTER TABLE products 
            ADD COLUMN IF NOT EXISTS product_type INTEGER DEFAULT 1,
            ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5,2) DEFAULT 10.00
          `);
          await db.execute(sql`
            UPDATE products 
            SET product_type = 1 WHERE product_type IS NULL,
                tax_rate = 10.00 WHERE tax_rate IS NULL
          `);
          await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type)
          `);
          console.log("✅ Product columns migration completed");
        } catch (error) {
          console.log("⚠️ Product columns migration skipped:", error.message);
        }
      })()
    );

    // Store settings pinCode migration
    migrationPromises.push(
      (async () => {
        try {
          await db.execute(sql`
            ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS pin_code TEXT
          `);
          console.log("✅ PinCode migration completed");
        } catch (error) {
          console.log("⚠️ PinCode migration skipped:", error.message);
        }
      })()
    );

    // Invoice-related migrations
    migrationPromises.push(
      (async () => {
        try {
          await db.execute(sql`
            ALTER TABLE invoice_templates 
            ADD COLUMN IF NOT EXISTS template_code VARCHAR(50)
          `);
          console.log("✅ TemplateCode migration completed");
        } catch (error) {
          console.log("⚠️ TemplateCode migration skipped:", error.message);
        }
      })()
    );

    migrationPromises.push(
      (async () => {
        try {
          await db.execute(sql`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS trade_number VARCHAR(50),
            ADD COLUMN IF NOT EXISTS invoice_status INTEGER DEFAULT 1
          `);
          
          // Data migration for trade_number
          await db.execute(sql`
            UPDATE invoices 
            SET trade_number = invoice_number 
            WHERE trade_number IS NULL OR trade_number = ''
          `);
          
          await db.execute(sql`
            UPDATE invoices SET invoice_number = NULL
          `);
          
          // Create indexes
          await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_invoices_trade_number ON invoices(trade_number);
            CREATE INDEX IF NOT EXISTS idx_invoices_invoice_status ON invoices(invoice_status)
          `);
          console.log("✅ Invoice columns migration completed");
        } catch (error) {
          console.log("⚠️ Invoice columns migration skipped:", error.message);
        }
      })()
    );

    // Employee email constraint migration
    migrationPromises.push(
      (async () => {
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
          console.log("✅ Employee email constraint migration completed");
        } catch (error) {
          console.log("⚠️ Employee email migration skipped:", error.message);
        }
      })()
    );

    // Run all migrations in parallel for better performance
    await Promise.allSettled(migrationPromises);

    // Check if customers table has data
    const customerCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(customers);
    if (customerCount[0]?.count === 0) {
      console.log("🔄 Inserting sample customers data...");
      await db.execute(sql`
        INSERT INTO customers (customer_id, name, phone, email, address, date_of_birth, visit_count, total_spent, points, membership_level, status, notes)
        VALUES
          ('CUST001', '김고객', '010-1234-5678', 'kim@customer.com', '서울시 강남구 테헤란로 123', '1985-05-15', 15, 1250000.00, 1250, 'Diamond', 'active', 'VIP 고객'),
          ('CUST002', '이단골', '010-2345-6789', 'lee@regular.com', '서울시 서초구 강남대로 456', '1990-08-20', 8, 680000.00, 680, 'Platinum', 'active', '단골 고객'),
          ('CUST003', '박회원', '010-3456-7890', 'park@member.com', '서울시 마포구 홍대로 789', '1988-12-10', 12, 340000.00, 340, 'Gold', 'active', '자주 방문하는 고객'),
          ('CUST004', '정신규', '010-4567-8901', 'jung@newbie.com', '서울시 용산구 이태원로 101', '1992-03-25', 3, 150000.00, 150, 'Silver', 'active', '새로 가입한 고객'),
          ('CUST005', '최애용', '010-5678-9012', 'choi@regular.com', '서울시 송파구 잠실로 202', '1987-11-08', 7, 420000.00, 420, 'Gold', 'active', '주말 단골 고객'),
          ('CUST006', '한미영', '010-6789-0123', 'han@family.com', '경기도 성남시 분당구 정자로 303', '1975-07-12', 20, 980000.00, 980, 'Platinum', 'active', '가족 단위 단골'),
          ('CUST007', '오민수', '010-7890-1234', 'oh@student.com', '서울시 관악구 신림로 404', '1995-09-30', 5, 200000.00, 200, 'Bronze', 'active', '학생 고객'),
          ('CUST008', '윤서연', '010-8901-2345', 'yoon@office.com', '서울시 중구 명동길 505', '1983-01-18', 11, 650000.00, 650, 'Gold', 'active', '회사 근처 직장인'),
          ('CUST009', '장경호', '010-9012-3456', 'jang@business.com', '서울시 영등포구 여의도동 606', '1980-04-22', 18, 1100000.00, 1100, 'Diamond', 'active', '비즈니스 고객'),
          ('CUST010', '임소희', '010-0123-4567', 'lim@social.com', '서울시 홍대 와우산로 707', '1993-06-14', 6, 320000.00, 320, 'Silver', 'active', '소셜 모임 단골');
      `);

      console.log("✅ Sample customers data inserted successfully");
    }

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
