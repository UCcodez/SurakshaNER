const Database = require('better-sqlite3');
const db = new Database('disaster.db');
const cols = db.prepare("PRAGMA table_info(risk_history)").all();
console.log(cols);
db.close();