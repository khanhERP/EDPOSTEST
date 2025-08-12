import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cấu hình database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function backupDatabase() {
  const client = await pool.connect();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'database-backup');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

  try {
    // Tạo thư mục backup nếu chưa có
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log('🔄 Bắt đầu backup database...');

    let sqlDump = `-- Database Backup Generated on ${new Date().toISOString()}\n\n`;

    // Danh sách các bảng cần backup
    const tables = [
      'categories',
      'products',
      'employees',
      'tables',
      'orders',
      'order_items',
      'transactions',
      'transaction_items',
      'attendance_records',
      'store_settings',
      'suppliers',
      'customers',
      'point_transactions',
      'inventory_transactions',
      'einvoice_connections',
      'invoice_templates',
      'invoices',
      'invoice_items'
    ];

    // Backup structure và data cho từng bảng
    for (const table of tables) {
      try {
        console.log(`📋 Backup bảng: ${table}`);

        // Lấy data từ bảng
        const dataResult = await client.query(`SELECT * FROM ${table}`);

        if (dataResult.rows.length > 0) {
          sqlDump += `\n-- Table: ${table}\n`;
          sqlDump += `DROP TABLE IF EXISTS ${table} CASCADE;\n`;

          // Tạo INSERT statements
          const columns = Object.keys(dataResult.rows[0]);
          const columnList = columns.join(', ');

          sqlDump += `-- Data for table: ${table}\n`;

          for (const row of dataResult.rows) {
            const values = columns.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
              if (value instanceof Date) return `'${value.toISOString()}'`;
              return value;
            }).join(', ');

            sqlDump += `INSERT INTO ${table} (${columnList}) VALUES (${values});\n`;
          }

          sqlDump += '\n';
        }

      } catch (error) {
        console.log(`⚠️ Không thể backup bảng ${table}:`, error.message);
      }
    }

    // Ghi file backup
    fs.writeFileSync(backupFile, sqlDump, 'utf8');

    console.log('✅ Backup hoàn thành!');
    console.log(`📁 File backup: ${backupFile}`);
    console.log(`📊 Kích thước: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`);

    // Tạo file JSON backup cho dễ đọc
    const jsonBackupFile = path.join(backupDir, `backup-${timestamp}.json`);
    const jsonData = {};

    for (const table of tables) {
      try {
        const result = await client.query(`SELECT * FROM ${table}`);
        jsonData[table] = result.rows;
      } catch (error) {
        console.log(`⚠️ Không thể backup JSON cho bảng ${table}`);
      }
    }

    fs.writeFileSync(jsonBackupFile, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log(`📄 File JSON backup: ${jsonBackupFile}`);

    return { sqlFile: backupFile, jsonFile: jsonBackupFile };

  } catch (error) {
    console.error('❌ Lỗi backup:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy backup nếu script được gọi trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
  backupDatabase().catch(console.error);
}

export { backupDatabase };