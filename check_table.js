const Database = require('better-sqlite3');
const db = new Database('disaster.db');
const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tiered_alerts'").all();
console.log(result);
db.close();