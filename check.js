const Database = require('better-sqlite3');
const db = new Database('disaster.db');
console.log(db.prepare("SELECT satellite_score FROM zones WHERE id = 'zone-shillong-1'").get());
db.close();