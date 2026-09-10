const Database = require('better-sqlite3');
const db = new Database('disaster.db');
console.log(db.prepare('SELECT * FROM in_danger_alerts').all());
db.close();