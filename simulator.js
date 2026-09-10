const mqtt = require('mqtt');

// Connect to your local Mosquitto broker
const client = mqtt.connect('mqtt://localhost:1883');

// Three fake sensors, each tied to a zone
const sensors = [
  { id: 'esp32-01', type: 'tilt', zone: 'zone-guwahati-1', baseline: 2.0 },
  { id: 'esp32-02', type: 'moisture', zone: 'zone-guwahati-1', baseline: 30.0 },
  { id: 'esp32-03', type: 'vibration', zone: 'zone-shillong-1', baseline: 0.5 },
];

let tickCount = 0;

client.on('connect', () => {
  console.log('Simulator connected to MQTT broker');

  setInterval(() => {
    tickCount++;
    console.log(`--- Tick ${tickCount} ---`);

    sensors.forEach((sensor) => {
      let value = sensor.baseline + (Math.random() - 0.5) * 0.4;

      // Every 5 ticks, force a dramatic spike on one sensor for demo purposes
      if ((tickCount===3||tickCount % 20 === 0) && sensor.id === 'esp32-01') {
        value = sensor.baseline * 4; // simulate sudden tilt shift
        console.log(`>>> SPIKE injected on ${sensor.id}`);
      }

      const payload = JSON.stringify({
        sensor_id: sensor.id,
        zone_id: sensor.zone,
        type: sensor.type,
        value: parseFloat(value.toFixed(2)),
        timestamp: new Date().toISOString(),
      });

      const topic = `sensors/${sensor.zone}/${sensor.id}`;
      client.publish(topic, payload);
      console.log(`Published to ${topic}:`, payload);
    });
  }, 3000); // every 3 seconds
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err);
});