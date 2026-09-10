const mqtt = require('mqtt');
const Database = require('better-sqlite3');

const db = new Database('disaster.db');
const client = mqtt.connect('mqtt://localhost:1883');

// Prepared statements (better-sqlite3 likes these reused, not rebuilt each time)
const insertSensor = db.prepare(`
  INSERT OR IGNORE INTO sensors (id, zone_id, type)
  VALUES (?, ?, ?)
`);

const insertReading = db.prepare(`
  INSERT INTO readings (sensor_id, value, timestamp)
  VALUES (?, ?, ?)
`);

client.on('connect', () => {
  console.log('Ingest service connected to MQTT broker');
  client.subscribe('sensors/#', (err) => {
    if (err) {
      console.error('Subscribe error:', err);
    } else {
      console.log('Subscribed to sensors/# — listening for readings...');
    }
  });
});

client.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const { sensor_id, zone_id, type, value, timestamp } = data;

    // Auto-register the sensor if we haven't seen it before
    insertSensor.run(sensor_id, zone_id, type);

    // Store the reading
    insertReading.run(sensor_id, value, timestamp);

    console.log(`Stored reading: ${sensor_id} = ${value} (${type})`);
  } catch (err) {
    console.error('Failed to process message:', err.message);
  }
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err);
});