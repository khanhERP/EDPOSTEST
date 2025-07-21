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

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

// Initialize sample data function
export async function initializeSampleData() {
  try {
    // Check if customers table has data
    const customerCount = await db.select({ count: sql<number>`count(*)` }).from(customers);
    if (customerCount[0]?.count === 0) {
      console.log("🔄 Inserting sample customers data...");
      await db.execute(sql`
        INSERT INTO customers (customer_id, name, phone, email, address, date_of_birth, visit_count, total_spent, points, membership_level, status, notes)
        VALUES
          ('CUST001', '김고객', '010-1234-5678', 'kim@customer.com', '서울시 강남구 테헤란로 123', '1985-05-15', 15, 1250000.00, 1250, 'Diamond', 'active', 'VIP 고객'),
          ('CUST002', '이단골', '010-2345-6789', 'lee@regular.com', '서울시 서초구 강남대로 456', '1990-08-20', 8, 680000.00, 680, 'Platinum', 'active', '단골 고객'),
          ('CUST003', '박회원', '010-3456-7890', 'park@member.com', '서울시 마포구 홍대로 789', '1988-12-10', 12, 340000.00, 340, 'Gold', 'active', '자주 방문하는 고객');
      `);

      console.log("✅ Sample customers data inserted successfully");
    }
  } catch (error) {
    console.log("⚠️ Sample data initialization skipped:", error);
  }
}