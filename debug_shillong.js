const Database = require('better-sqlite3');
const db = new Database('disaster.db');

console.log('--- Zone state ---');
console.log(db.prepare("SELECT * FROM zones WHERE id = 'zone-shillong-1'").get());

console.log('\n--- Last 10 moisture readings ---');
console.log(db.prepare(`
  SELECT value, timestamp FROM readings
  WHERE sensor_id = 'esp32-hw-moisture'
  ORDER BY timestamp DESC LIMIT 10
`).all());

console.log('\n--- Last 10 vibration readings ---');
console.log(db.prepare(`
  SELECT value, timestamp FROM readings
  WHERE sensor_id = 'esp32-hw-vibration'
  ORDER BY timestamp DESC LIMIT 10
`).all());

db.close();