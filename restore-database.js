
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function restoreDatabase(backupFilePath) {
  if (!fs.existsSync(backupFilePath)) {
    console.error('❌ File backup không tồn tại:', backupFilePath);
    return;
  }

  const client = await pool.connect();
  
  try {
    console.log('🔄 Bắt đầu restore database...');
    
    // Đọc file backup
    const sqlContent = fs.readFileSync(backupFilePath, 'utf8');
    
    // Tách các câu lệnh SQL
    const statements = sqlContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('--'))
      .join('\n')
      .split(';')
      .filter(stmt => stmt.trim());

    console.log(`📋 Thực thi ${statements.length} câu lệnh SQL...`);
    
    // Thực thi từng câu lệnh
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await client.query(statement);
          if ((i + 1) % 100 === 0) {
            console.log(`⏳ Đã thực thi ${i + 1}/${statements.length} câu lệnh...`);
          }
        } catch (error) {
          console.log(`⚠️ Lỗi câu lệnh ${i + 1}:`, error.message);
        }
      }
    }
    
    console.log('✅ Restore database hoàn thành!');
    
  } catch (error) {
    console.error('❌ Lỗi restore:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Sử dụng: node restore-database.js path/to/backup.sql
if (import.meta.url === `file://${process.argv[1]}`) {
  const backupFile = process.argv[2];
  if (!backupFile) {
    console.log('Sử dụng: node restore-database.js <path-to-backup-file>');
    process.exit(1);
  }
  
  restoreDatabase(backupFile).catch(console.error);
}

export { restoreDatabase };
