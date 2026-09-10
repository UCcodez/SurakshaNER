const Database = require('better-sqlite3');
const db = new Database('disaster.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS tiered_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id TEXT NOT NULL,
    zone_name TEXT NOT NULL,
    risk_level TEXT NOT NULL,
    citizen_message TEXT NOT NULL,
    district_message TEXT NOT NULL,
    authority_message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

console.log('tiered_alerts table created.');
db.close();