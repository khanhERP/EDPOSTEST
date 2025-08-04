import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { categories, products, employees, tables, orders, orderItems, transactions, transactionItems, attendanceRecords, storeSettings, suppliers, customers } from '@shared/schema';
import { sql } from 'drizzle-orm';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
export const db = drizzle({ client: pool, schema });

// Initialize sample data function
export async function initializeSampleData() {
  try {
    console.log("Running database migrations...");

    // Run migration for membership thresholds
    try {
      await db.execute(sql`
        ALTER TABLE store_settings 
        ADD COLUMN IF NOT EXISTS gold_threshold TEXT DEFAULT '300000'
      `);
      await db.execute(sql`
        ALTER TABLE store_settings 
        ADD COLUMN IF NOT EXISTS vip_threshold TEXT DEFAULT '1000000'
      `);

      // Update existing records
      await db.execute(sql`
        UPDATE store_settings 
        SET gold_threshold = COALESCE(gold_threshold, '300000'), 
            vip_threshold = COALESCE(vip_threshold, '1000000')
      `);

      console.log("Migration for membership thresholds completed successfully.");
    } catch (migrationError) {
      console.log("Migration already applied or error:", migrationError);
    }

    // Run migration for product_type column
    try {
      await db.execute(sql`
        ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type INTEGER DEFAULT 1
      `);
      await db.execute(sql`
        UPDATE products SET product_type = 1 WHERE product_type IS NULL
      `);
      await db.execute(sql`
        CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type)
      `);

      console.log("Migration for product_type column completed successfully.");
    } catch (migrationError) {
      console.log("Product type migration already applied or error:", migrationError);
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
      console.log("Tax rate migration already applied or error:", migrationError);
    }

    // Check if customers table has data
    const customerCount = await db.select({ count: sql<number>`count(*)` }).from(customers);
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
      console.log("Inventory transactions table already exists or initialization failed:", error);
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
      console.log("E-invoice connections table already exists or initialization failed:", error);
    }

    // Initialize invoice_templates table if it doesn't exist
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS invoice_templates (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          template_number VARCHAR(50) NOT NULL,
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
      console.log("Invoice templates table already exists or initialization failed:", error);
    }
  } catch (error) {
    console.log("⚠️ Sample data initialization skipped:", error);
  }
}