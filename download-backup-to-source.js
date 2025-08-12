const pkg = require('pg');
const { Pool } = pkg;
const fs = require('fs');
const path = require('path');

async function downloadBackupToSource() {
  console.log('🔄 Bắt đầu tải backup database...');

  const backupDir = path.join(__dirname, 'database-backup');

  // Tạo thư mục backup nếu chưa có
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`📁 Đã tạo thư mục: ${backupDir}`);
  }

  const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
  const sqlFilePath = path.join(backupDir, `backup-${timestamp}.sql`);
  const jsonFilePath = path.join(backupDir, `backup-${timestamp}.json`);
  const infoFilePath = path.join(backupDir, `backup-info-${timestamp}.txt`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔗 Kết nối database...');

    // Lấy danh sách bảng
    const tablesResult = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);

    const tables = tablesResult.rows.map(row => row.tablename);
    console.log(`📊 Tìm thấy ${tables.length} bảng:`, tables.join(', '));

    let sqlContent = `-- Database Backup - ${new Date().toISOString()}\n`;
    sqlContent += `-- Host: ep-dawn-cloud-a5kkn63y.us-east-2.aws.neon.tech\n`;
    sqlContent += `-- Database: neondb\n\n`;

    const jsonBackup = {
      metadata: {
        timestamp: new Date().toISOString(),
        host: 'ep-dawn-cloud-a5kkn63y.us-east-2.aws.neon.tech',
        database: 'neondb',
        tables: tables.length
      },
      data: {}
    };

    // Backup từng bảng
    for (const table of tables) {
      console.log(`📦 Backup bảng: ${table}`);

      // Lấy cấu trúc bảng
      const schemaResult = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table]);

      sqlContent += `\n-- Table: ${table}\n`;
      sqlContent += `DROP TABLE IF EXISTS ${table} CASCADE;\n`;

      // Lấy dữ liệu
      const dataResult = await pool.query(`SELECT * FROM ${table}`);
      console.log(`   └─ ${dataResult.rows.length} bản ghi`);

      jsonBackup.data[table] = {
        schema: schemaResult.rows,
        rows: dataResult.rows,
        count: dataResult.rows.length
      };

      if (dataResult.rows.length > 0) {
        const columns = Object.keys(dataResult.rows[0]);
        sqlContent += `\n-- Data for ${table}\n`;

        for (const row of dataResult.rows) {
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            return val;
          }).join(', ');

          sqlContent += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values});\n`;
        }
      }
    }

    // Lưu file SQL
    fs.writeFileSync(sqlFilePath, sqlContent);
    console.log(`💾 Đã lưu SQL backup: ${sqlFilePath}`);

    // Lưu file JSON
    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonBackup, null, 2));
    console.log(`💾 Đã lưu JSON backup: ${jsonFilePath}`);

    // Lưu file thông tin
    const infoContent = `
THÔNG TIN BACKUP DATABASE
========================
Thời gian: ${new Date().toLocaleString('vi-VN')}
Host: ep-dawn-cloud-a5kkn63y.us-east-2.aws.neon.tech
Database: neondb
Số bảng: ${tables.length}
Danh sách bảng: ${tables.join(', ')}

File được tạo:
- SQL: backup-${timestamp}.sql
- JSON: backup-${timestamp}.json
- Info: backup-info-${timestamp}.txt

Tổng kích thước dữ liệu: ${jsonBackup.data ? Object.values(jsonBackup.data).reduce((sum, table) => sum + table.rows.length, 0) : 0} bản ghi
`;

    fs.writeFileSync(infoFilePath, infoContent);
    console.log(`📄 Đã lưu thông tin backup: ${infoFilePath}`);

    console.log(`\n✅ BACKUP HOÀN TẤT!`);
    console.log(`📁 Thư mục: ${backupDir}`);
    console.log(`📊 ${tables.length} bảng đã được backup`);

  } catch (error) {
    console.error('❌ Lỗi backup:', error);
  } finally {
    await pool.end();
  }
}

downloadBackupToSource();