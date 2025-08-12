
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
  const backupDir = 'database-backup';
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
        
        // Lấy structure của bảng
        const structureQuery = `
          SELECT 
            'CREATE TABLE IF NOT EXISTS ' || schemaname||'.'||tablename || ' (' ||
            array_to_string(
              array_agg(
                column_name || ' ' || data_type || 
                CASE 
                  WHEN character_maximum_length IS NOT NULL 
                  THEN '(' || character_maximum_length || ')'
                  WHEN numeric_precision IS NOT NULL AND numeric_scale IS NOT NULL
                  THEN '(' || numeric_precision || ',' || numeric_scale || ')'
                  ELSE ''
                END ||
                CASE 
                  WHEN is_nullable = 'NO' THEN ' NOT NULL'
                  ELSE ''
                END
              ), ', '
            ) || ');' as ddl
          FROM information_schema.columns 
          WHERE table_name = $1 AND table_schema = 'public'
          GROUP BY schemaname, tablename;
        `;
        
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

    // Backup store settings
    console.log('⚙️ Backup store settings...');
    const settingsResult = await client.query('SELECT * FROM store_settings');
    if (settingsResult.rows.length > 0) {
      sqlDump += '-- Store Settings\n';
      const settings = settingsResult.rows[0];
      const settingsColumns = Object.keys(settings);
      const settingsValues = settingsColumns.map(col => {
        const value = settings[col];
        if (value === null) return 'NULL';
        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
        return value;
      }).join(', ');
      
      sqlDump += `INSERT INTO store_settings (${settingsColumns.join(', ')}) VALUES (${settingsValues}) ON CONFLICT (id) DO UPDATE SET ${settingsColumns.slice(1).map(col => `${col} = EXCLUDED.${col}`).join(', ')};\n\n`;
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
    
  } catch (error) {
    console.error('❌ Lỗi backup:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy backup
if (require.main === module) {
  backupDatabase().catch(console.error);
}

module.exports = { backupDatabase };
