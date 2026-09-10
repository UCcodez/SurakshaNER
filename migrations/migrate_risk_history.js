// migrate_risk_history.js
const Database = require('better-sqlite3');
const db = new Database('disaster.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS risk_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id TEXT NOT NULL,
    risk_score REAL NOT NULL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

console.log('risk_history table created.');
db.close();