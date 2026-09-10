const Database = require('better-sqlite3');
const db = new Database('disaster.db');

function calculateRisk() {
  const sensors = db.prepare('SELECT * FROM sensors').all();

  sensors.forEach((sensor) => {
    const readings = db.prepare(`
      SELECT value FROM readings
      WHERE sensor_id = ?
      ORDER BY timestamp DESC
      LIMIT 20
    `).all(sensor.id).reverse();

    if (readings.length < 5) {
      console.log(`Skipping ${sensor.id} — not enough data yet (${readings.length} readings)`);
      return;
    }

    const values = readings.map(r => r.value);
    const latest = values[values.length - 1];

    const baselineValues = values.slice(0, -1);
    const mean = baselineValues.reduce((a, b) => a + b, 0) / baselineValues.length;
    const variance = baselineValues.reduce((a, b) => a + (b - mean) ** 2, 0) / baselineValues.length;
    const stdDev = Math.sqrt(variance) || 0.01;

    const zScore = Math.abs((latest - mean) / stdDev);

    let riskScore = Math.min(100, zScore * 20);
    let riskLevel = 'low';
    if (riskScore > 60) riskLevel = 'high';
    else if (riskScore > 25) riskLevel = 'medium';

    console.log(`${sensor.id} (${sensor.zone_id}): latest=${latest}, mean=${mean.toFixed(2)}, zScore=${zScore.toFixed(2)}, risk=${riskScore.toFixed(1)} (${riskLevel})`);

    const zone = db.prepare('SELECT risk_score FROM zones WHERE id = ?').get(sensor.zone_id);
    if (zone && riskScore > zone.risk_score) {
      db.prepare(`
        UPDATE zones
        SET risk_score = ?, risk_level = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(riskScore, riskLevel, sensor.zone_id);
      console.log(`  -> Updated zone ${sensor.zone_id} to risk ${riskScore.toFixed(1)} (${riskLevel})`);
    }
  });
}

calculateRisk();
console.log('\nRisk calculation complete.');
db.close();