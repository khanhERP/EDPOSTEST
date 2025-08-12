
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

async function downloadBackupToSource() {
  const client = await pool.connect();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'database-backup');
  const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);
  const jsonBackupFile = path.join(backupDir, `backup-${timestamp}.json`);

  try {
    // Tạo thư mục backup nếu chưa có
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    console.log('🔄 Bắt đầu tải backup database về source code...');
    console.log(`📁 Thư mục backup: ${backupDir}`);
    console.log(`🔗 Database host: ep-dawn-cloud-a5kkn63y.us-east-2.aws.neon.tech`);

    let sqlDump = `-- Database Backup Generated on ${new Date().toISOString()}\n`;
    sqlDump += `-- Host: ep-dawn-cloud-a5kkn63y.us-east-2.aws.neon.tech\n`;
    sqlDump += `-- Database: neondb\n\n`;

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

    const jsonData = {};

    // Backup từng bảng
    for (const table of tables) {
      try {
        console.log(`📋 Đang backup bảng: ${table}`);

        // Lấy data từ bảng
        const dataResult = await client.query(`SELECT * FROM ${table}`);
        jsonData[table] = dataResult.rows;

        if (dataResult.rows.length > 0) {
          sqlDump += `\n-- Table: ${table} (${dataResult.rows.length} records)\n`;
          sqlDump += `DELETE FROM ${table};\n`;

          // Tạo INSERT statements
          const columns = Object.keys(dataResult.rows[0]);
          const columnList = columns.join(', ');

          for (const row of dataResult.rows) {
            const values = columns.map(col => {
              const value = row[col];
              if (value === null) return 'NULL';
              if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
              if (value instanceof Date) return `'${value.toISOString()}'`;
              if (typeof value === 'boolean') return value;
              return value;
            }).join(', ');

            sqlDump += `INSERT INTO ${table} (${columnList}) VALUES (${values});\n`;
          }

          sqlDump += '\n';
          console.log(`✅ Backup bảng ${table}: ${dataResult.rows.length} records`);
        } else {
          console.log(`⚠️ Bảng ${table} trống`);
        }

      } catch (error) {
        console.log(`❌ Không thể backup bảng ${table}:`, error.message);
        jsonData[table] = [];
      }
    }

    // Ghi file SQL backup vào source code
    fs.writeFileSync(backupFile, sqlDump, 'utf8');
    
    // Ghi file JSON backup vào source code  
    fs.writeFileSync(jsonBackupFile, JSON.stringify(jsonData, null, 2), 'utf8');

    console.log('✅ Tải backup hoàn thành!');
    console.log(`📁 File SQL: ${backupFile}`);
    console.log(`📄 File JSON: ${jsonBackupFile}`);
    console.log(`📊 Kích thước SQL: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📊 Kích thước JSON: ${(fs.statSync(jsonBackupFile).size / 1024 / 1024).toFixed(2)} MB`);

    // Tạo file thông tin backup
    const infoFile = path.join(backupDir, `backup-info-${timestamp}.txt`);
    const backupInfo = `
DATABASE BACKUP INFORMATION
===========================
Backup Date: ${new Date().toISOString()}
Host: ep-dawn-cloud-a5kkn63y.us-east-2.aws.neon.tech
Database: neondb
Username: neondb_owner

Files Created:
- SQL File: backup-${timestamp}.sql
- JSON File: backup-${timestamp}.json

Tables Backed Up:
${tables.map(table => `- ${table}: ${jsonData[table]?.length || 0} records`).join('\n')}

Total Records: ${Object.values(jsonData).reduce((sum, records) => sum + records.length, 0)}
`;

    fs.writeFileSync(infoFile, backupInfo, 'utf8');
    console.log(`📋 File thông tin: ${infoFile}`);

    return { 
      sqlFile: backupFile, 
      jsonFile: jsonBackupFile,
      infoFile: infoFile,
      backupDir: backupDir 
    };

  } catch (error) {
    console.error('❌ Lỗi tải backup:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy script nếu được gọi trực tiếp
if (import.meta.url === `file://${process.argv[1]}`) {
  downloadBackupToSource().catch(console.error);
}

export { downloadBackupToSource };
