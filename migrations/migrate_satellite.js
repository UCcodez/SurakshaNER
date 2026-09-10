const Database = require('better-sqlite3');
const db = new Database('disaster.db');

function addColumnIfMissing(table, column, type) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some(c => c.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
    console.log(`Added column ${column} to ${table}`);
  } else {
    console.log(`Column ${column} already exists, skipping`);
  }
}

addColumnIfMissing('zones', 'satellite_score', 'REAL DEFAULT 0');
addColumnIfMissing('zones', 'satellite_wetness', 'REAL DEFAULT 0');

console.log('Migration complete.');
db.close();