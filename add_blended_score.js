const Database = require('better-sqlite3');
const db = new Database('disaster.db');
db.prepare(`ALTER TABLE risk_history ADD COLUMN blended_score REAL DEFAULT 0`).run();
console.log('Added blended_score');
db.close();