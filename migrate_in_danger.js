const Database = require('better-sqlite3');
const db = new Database('disaster.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS in_danger_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

console.log('in_danger_alerts table created.');
db.close();