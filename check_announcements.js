const Database = require('better-sqlite3');
const db = new Database('disaster.db');
console.log(db.prepare('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 5').all());
db.close();