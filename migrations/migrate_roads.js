const Database = require('better-sqlite3');
const db = new Database('disaster.db');

db.prepare(`
  CREATE TABLE IF NOT EXISTS roads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    status TEXT DEFAULT 'clear',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

const insertRoad = db.prepare(`
  INSERT OR IGNORE INTO roads (id, name, path, status)
  VALUES (?, ?, ?, ?)
`);

insertRoad.run(
  'road-nh40-guwahati-shillong',
  'NH-40 Guwahati–Shillong (via Nongpoh)',
  JSON.stringify([
    [26.1445, 91.7362],
    [25.9167, 91.8833],
    [25.5788, 91.8933]
  ]),
  'clear'
);

insertRoad.run(
  'road-shillong-dawki',
  'Shillong–Dawki Road (via Laitlyngkot)',
  JSON.stringify([
    [25.5788, 91.8933],
    [25.4500, 91.9300],
    [25.1858, 92.0181]
  ]),
  'at_risk'
);

console.log('Roads table created and seeded.');
db.close();