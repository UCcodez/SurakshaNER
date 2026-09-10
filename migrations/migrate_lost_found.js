const Database = require('better-sqlite3');
const db = new Database('disaster.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS lost_found (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    lat REAL,
    lng REAL,
    contact_info TEXT,
    status TEXT DEFAULT 'missing',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

console.log('lost_found table created.');
db.close();