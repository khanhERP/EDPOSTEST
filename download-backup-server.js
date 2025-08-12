
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { backupDatabase } from './backup-database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Tạo backup trước
console.log('🔄 Tạo backup database...');
try {
  const backupResult = await backupDatabase();
  console.log('✅ Backup thành công!');
  console.log('📁 Files:', backupResult);
} catch (error) {
  console.error('❌ Lỗi backup:', error);
}

// Serve static files từ thư mục backup
app.use('/files', express.static(path.join(__dirname, 'database-backup')));

// Route để liệt kê files
app.get('/', (req, res) => {
  const backupDir = path.join(__dirname, 'database-backup');
  
  if (!fs.existsSync(backupDir)) {
    return res.send('<h2>❌ Không có file backup nào</h2>');
  }

  const files = fs.readdirSync(backupDir).map(file => {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    return {
      name: file,
      size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
      created: stats.mtime.toLocaleString('vi-VN')
    };
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>📁 Database Backup Files</title>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f2f2f2; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .download-btn { 
          background: #28a745; 
          color: white; 
          padding: 8px 16px; 
          border-radius: 4px; 
          text-decoration: none;
        }
        .download-btn:hover { background: #218838; }
      </style>
    </head>
    <body>
      <h2>📁 Database Backup Files</h2>
      <p>🌐 <strong>Server đang chạy tại:</strong> <code>http://localhost:${PORT}</code></p>
      
      <table>
        <thead>
          <tr>
            <th>📄 Tên File</th>
            <th>📊 Kích thước</th>
            <th>🕐 Ngày tạo</th>
            <th>⬇️ Tải về</th>
          </tr>
        </thead>
        <tbody>
          ${files.map(file => `
            <tr>
              <td>${file.name}</td>
              <td>${file.size}</td>
              <td>${file.created}</td>
              <td>
                <a href="/files/${file.name}" download class="download-btn">
                  ⬇️ Tải về
                </a>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
        <h3>📋 Hướng dẫn:</h3>
        <ol>
          <li>Click vào nút <strong>"⬇️ Tải về"</strong> để tải file backup về máy</li>
          <li>File <code>.sql</code> để restore database</li>
          <li>File <code>.json</code> để xem dữ liệu dạng JSON</li>
        </ol>
      </div>
    </body>
    </html>
  `;
  
  res.send(html);
});

// Route download trực tiếp
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'database-backup', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('❌ File không tồn tại');
  }
  
  res.download(filePath, filename);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Download server running: http://localhost:${PORT}`);
  console.log(`📥 Truy cập để tải backup: http://localhost:${PORT}`);
});
