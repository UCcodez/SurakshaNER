const Database = require('better-sqlite3');
const db = new Database('disaster.db');
db.prepare("DELETE FROM readings WHERE sensor_id = 'esp32-hw-vibration'").run();
console.log('Cleared old vibration readings.');
db.close();