const Database = require('better-sqlite3');
const db = new Database('disaster.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS shelters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    capacity INTEGER,
    current_occupancy INTEGER DEFAULT 0,
    zone_id TEXT
  )
`).run();

const insertShelter = db.prepare(`
  INSERT OR IGNORE INTO shelters (id, name, lat, lng, capacity, zone_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);

insertShelter.run('shelter-guwahati-1', 'Nehru Stadium Relief Point', 26.1517, 91.7562, 500, 'zone-guwahati-1');
insertShelter.run('shelter-shillong-1', 'Polo Ground Relief Point', 25.5786, 91.8933, 300, 'zone-shillong-1');

console.log('Shelters table created and seeded.');
db.close();