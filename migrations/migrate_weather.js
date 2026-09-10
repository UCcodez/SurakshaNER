const Database = require('better-sqlite3');
const db = new Database('disaster.db');

function addColumnIfMissing(table, column, type) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = cols.some(c => c.name === column);
  if (!exists) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    console.log(`Added column ${column} to ${table}`);
  } else {
    console.log(`Column ${column} already exists on ${table}, skipping`);
  }
}

addColumnIfMissing('zones', 'sensor_risk_score', 'REAL DEFAULT 0');
addColumnIfMissing('zones', 'rainfall_score', 'REAL DEFAULT 0');
addColumnIfMissing('zones', 'rainfall_mm', 'REAL DEFAULT 0');

console.log('Migration complete.');
db.close();