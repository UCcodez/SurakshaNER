const Database = require('better-sqlite3');
const db = new Database('disaster.db');
db.prepare("UPDATE zones SET satellite_score = 80 WHERE id = 'zone-shillong-1'").run();
console.log('Shillong satellite score boosted.');
db.close();