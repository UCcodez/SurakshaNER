const Database = require('better-sqlite3');
const db = new Database('disaster.db');

function addColumnIfMissing(table, column, type) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    console.log(`Added ${column}`);
  } else {
    console.log(`${column} already exists`);
  }
}

addColumnIfMissing('risk_history', 'sensor_score', 'REAL DEFAULT 0');
addColumnIfMissing('risk_history', 'rainfall_score', 'REAL DEFAULT 0');
addColumnIfMissing('risk_history', 'satellite_score', 'REAL DEFAULT 0');

console.log('Done.');
db.close();