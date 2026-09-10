const { fetchWeatherForZone, calculateRainfallRisk } = require('./weather.js');

const MOISTURE_DRY_BASELINE = 3200; // calibrated from your own testing
const zoneSensorScores = {};
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mqtt = require('mqtt');
const Database = require('better-sqlite3');

const db = new Database('disaster.db');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const { fetchSatelliteDataForZone, calculateSatelliteRisk } = require('./satellite.js');
// Serve a simple static test page from a "public" folder
app.use(express.static('public'));
app.get('/api/zones', (req, res) => {
  const zones = db.prepare('SELECT * FROM zones').all();
  res.json(zones);
});

app.get('/api/shelters', (req, res) => {
  const shelters = db.prepare('SELECT * FROM shelters').all();
  res.json(shelters);
});

app.delete('/api/sos/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM alerts_sos WHERE id = ?').run(id);
  io.emit('sosDeleted', { id: parseInt(id) });
  console.log(`SOS alert #${id} deleted`);
  res.json({ ok: true });
});

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 } // 15MB cap — mainly to keep video uploads bounded
});

// Citizen submits an SOS alert
app.use(express.json()); // needed to read JSON request bodies

app.get('/api/weather', (req, res) => {
  const zones = db.prepare('SELECT id, name, rainfall_mm, rainfall_score FROM zones').all();
  res.json(zones);
});

app.get('/api/roads', (req, res) => {
  const roads = db.prepare('SELECT * FROM roads').all();
  const parsed = roads.map(r => ({ ...r, path: JSON.parse(r.path) }));
  res.json(parsed);
});

app.get('/api/sensors', (req, res) => {
  const sensors = db.prepare('SELECT * FROM sensors').all();
  res.json(sensors);
});

app.get('/api/tiered-alerts', (req, res) => {
  const alerts = db.prepare('SELECT * FROM tiered_alerts ORDER BY created_at DESC LIMIT 20').all();
  res.json(alerts);
});

app.get('/api/trajectory', (req, res) => {
  const zones = db.prepare('SELECT id FROM zones').all();
  const trajectories = zones
    .map(zone => calculateTrajectory(zone.id))
    .filter(t => t !== null);
  res.json(trajectories);
});

app.get('/api/sensors', (req, res) => {
  const sensors = db.prepare('SELECT * FROM sensors').all();
  res.json(sensors);
});

app.post('/api/simulate-event', (req, res) => {
  const { sensorId } = req.body;
  const sensor = db.prepare('SELECT * FROM sensors WHERE id = ?').get(sensorId);
  if (!sensor) return res.status(404).json({ error: 'sensor not found' });

  const spikeValues = { tilt: 45, soil_moisture: 95, vibration: 80 };
  const value = spikeValues[sensor.type] ?? 100;

  insertReading.run(sensor.id, value, new Date().toISOString());
  calculateRiskForSensor(sensor.id, sensor.zone_id,sensorType);

  res.json({ ok: true, sensorId: sensor.id, injectedValue: value });
});

app.post('/api/lost-found', upload.single('media'), (req, res) => {
  const { reportType, name, description, lat, lng, contactInfo } = req.body;

  if (!reportType || !name) {
    return res.status(400).json({ error: 'reportType and name are required' });
  }

  const photoUrl = req.file ? `/uploads/${req.file.filename}` : null;

  const result = db.prepare(`
    INSERT INTO lost_found (report_type, name, description, photo_url, lat, lng, contact_info)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(reportType, name, description || '', photoUrl, lat || null, lng || null, contactInfo || '');

  const newEntry = db.prepare('SELECT * FROM lost_found WHERE id = ?').get(result.lastInsertRowid);
  io.emit('newLostFound', newEntry);

  console.log(`New Lost & Found entry #${newEntry.id} — ${reportType}: ${name}`);
  res.json(newEntry);
});

app.post('/api/in-danger', (req, res) => {
  const { lat, lng } = req.body;
  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const result = db.prepare('INSERT INTO in_danger_alerts (lat, lng) VALUES (?, ?)').run(lat, lng);
  const newAlert = db.prepare('SELECT * FROM in_danger_alerts WHERE id = ?').get(result.lastInsertRowid);

  io.emit('newInDanger', newAlert);
  console.log(`IN DANGER alert #${newAlert.id} at (${lat}, ${lng})`);
  res.json(newAlert);
});

app.get('/api/in-danger', (req, res) => {
  res.json(db.prepare('SELECT * FROM in_danger_alerts ORDER BY created_at DESC').all());
});

app.post('/api/in-danger/:id/resolve', (req, res) => {
  const { id } = req.params;
  db.prepare("UPDATE in_danger_alerts SET status = 'resolved' WHERE id = ?").run(id);
  const updated = db.prepare('SELECT * FROM in_danger_alerts WHERE id = ?').get(id);
  io.emit('inDangerResolved', updated);
  res.json(updated);
});

app.get('/api/lost-found', (req, res) => {
  const entries = db.prepare('SELECT * FROM lost_found ORDER BY created_at DESC').all();
  res.json(entries);
});

app.post('/api/lost-found/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.prepare('UPDATE lost_found SET status = ? WHERE id = ?').run(status, id);
  const updated = db.prepare('SELECT * FROM lost_found WHERE id = ?').get(id);

  io.emit('lostFoundStatusUpdate', updated);
  res.json(updated);
});

app.post('/api/photo-reports', upload.single('media'), (req, res) => {
  const { lat, lng, description, hazardType } = req.body;

  if (!lat || !lng || !req.file) {
    return res.status(400).json({ error: 'lat, lng, and a photo/video are required' });
  }

  const mediaType = req.file.mimetype.startsWith('video') ? 'video' : 'photo';
  const photoUrl = `/uploads/${req.file.filename}`;

  const result = db.prepare(`
    INSERT INTO photo_reports (lat, lng, photo_url, description, hazard_type, media_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(lat, lng, photoUrl, description || '', hazardType || 'other', mediaType);

  const newReport = db.prepare('SELECT * FROM photo_reports WHERE id = ?').get(result.lastInsertRowid);
  io.emit('newPhotoReport', newReport);

  console.log(`New ${mediaType} report #${newReport.id} — ${hazardType}`);
  res.json(newReport);
});

app.get('/api/photo-reports', (req, res) => {
  const reports = db.prepare('SELECT * FROM photo_reports ORDER BY created_at DESC').all();
  res.json(reports);
});

app.post('/api/roads/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['clear', 'blocked', 'at_risk'].includes(status)) {
    return res.status(400).json({ error: 'status must be clear, blocked, or at_risk' });
  }

  db.prepare('UPDATE roads SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  const updated = db.prepare('SELECT * FROM roads WHERE id = ?').get(id);
  const parsed = { ...updated, path: JSON.parse(updated.path) };

  io.emit('roadStatusUpdate', parsed);
  console.log(`Road ${id} status changed to ${status}`);
  res.json(parsed);
});

app.post('/api/sos', (req, res) => {
  const { lat, lng, message, victimCount, vulnerability } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const finalVictimCount = victimCount || 1;
  const finalVulnerability = vulnerability || 'none';
  const priorityScore = calculatePriorityScore(finalVictimCount, finalVulnerability, 'medium');

  const result = db.prepare(`
    INSERT INTO alerts_sos (lat, lng, message)
    VALUES (?, ?, ?)
  `).run(lat, lng, message || '');

  const newAlert = db.prepare('SELECT * FROM alerts_sos WHERE id = ?').get(result.lastInsertRowid);

  // Broadcast live to any connected dashboard (rescue portal will listen for this)
  io.emit('newSOS', newAlert);

  console.log(`New SOS alert #${newAlert.id} at (${lat}, ${lng})`);
  res.json(newAlert);
});

app.post('/api/sos/:id/severity', (req, res) => {
  const { id } = req.params;
  const { severity } = req.body;

  const alert = db.prepare('SELECT * FROM alerts_sos WHERE id = ?').get(id);
  if (!alert) return res.status(404).json({ error: 'not found' });

  const newScore = calculatePriorityScore(alert.victim_count, alert.vulnerability, severity);

  db.prepare('UPDATE alerts_sos SET severity = ?, priority_score = ? WHERE id = ?').run(severity, newScore, id);
  const updated = db.prepare('SELECT * FROM alerts_sos WHERE id = ?').get(id);

  io.emit('sosStatusUpdate', updated);
  res.json(updated);
});

// Get all announcements for citizens to view
app.get('/api/announcements', (req, res) => {
  const announcements = db.prepare(`
    SELECT * FROM announcements
    WHERE audience = 'citizens'
    ORDER BY created_at DESC
  `).all();
  res.json(announcements);
});







// Rescue agency posts a new announcement
app.post('/api/announcements', (req, res) => {
  const { title, body, audience } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'title and body are required' });
  }

  const result = db.prepare(`
    INSERT INTO announcements (title, body, audience)
    VALUES (?, ?, ?)
  `).run(title, body, audience || 'citizens');

  const newAnnouncement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(result.lastInsertRowid);

  // Broadcast live so citizen portals update instantly without refreshing
  io.emit('newAnnouncement', newAnnouncement);

  console.log(`New announcement posted: "${title}"`);
  res.json(newAnnouncement);
});

// Get all SOS alerts (for rescue dashboard)
app.get('/api/sos', (req, res) => {
  const alerts = db.prepare(`
    SELECT * FROM alerts_sos
    ORDER BY created_at DESC
  `).all();
  res.json(alerts);
});

// Update SOS alert status (mock "assign" action)
app.post('/api/sos/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.prepare(`UPDATE alerts_sos SET status = ? WHERE id = ?`).run(status, id);
  const updated = db.prepare('SELECT * FROM alerts_sos WHERE id = ?').get(id);

  io.emit('sosStatusUpdate', updated);
  res.json(updated);
});









// --- MQTT ingestion (same logic as ingest.js) ---
const mqttClient = mqtt.connect('mqtt://localhost:1883');

const insertSensor = db.prepare(`
  INSERT OR IGNORE INTO sensors (id, zone_id, type)
  VALUES (?, ?, ?)
`);
const insertReading = db.prepare(`
  INSERT INTO readings (sensor_id, value, timestamp)
  VALUES (?, ?, ?)
`);

mqttClient.on('connect', () => {
  console.log('Server connected to MQTT broker');
  mqttClient.subscribe('sensors/#');
});

mqttClient.on('message', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const { sensor_id, zone_id, type, value } = data;

    insertSensor.run(sensor_id, zone_id, type);
    insertReading.run(sensor_id, value, new Date().toISOString());

    // After storing, recalculate risk for this sensor immediately
    calculateRiskForSensor(sensor_id, zone_id, type);
  } catch (err) {
    console.error('Failed to process message:', err.message);
  }
});



async function updateAllZonesWeather() {
  const zones = db.prepare('SELECT * FROM zones').all();
  for (const zone of zones) {
    try {
      const mm = await fetchWeatherForZone(zone);
      const rainfallScore = calculateRainfallRisk(mm);
      console.log(`Weather check — ${zone.name}: ${mm}mm rain, rainfall risk score ${rainfallScore}`);
      db.prepare('UPDATE zones SET rainfall_mm = ? WHERE id = ?').run(mm, zone.id);

      const sensorRow = db.prepare('SELECT sensor_risk_score, satellite_score FROM zones WHERE id = ?').get(zone.id);
      updateZoneRisk(zone.id, sensorRow.sensor_risk_score,rainfallScore, sensorRow.satellite_score);
    } catch (err) {
      console.error(`Weather fetch failed for zone ${zone.id}:`, err.message);
    }
  }
}

function calculatePriorityScore(victimCount, vulnerability,      severity) {
  const vulnerabilityWeight = { none: 1, elderly: 1.5, disabled: 1.5, medical: 1.8, child: 1.5 };
  const severityWeight = { low: 1, medium: 1.5, high: 2.2 };

  const vWeight = vulnerabilityWeight[vulnerability] || 1;
  const sWeight = severityWeight[severity] || 1.5;

  return victimCount * vWeight * sWeight;
}

async function updateAllZonesSatellite() {
  const zones = db.prepare('SELECT * FROM zones').all();
  for (const zone of zones) {
    try {
      const wetness = await fetchSatelliteDataForZone(zone);
      const satelliteScore = calculateSatelliteRisk(wetness);
      console.log(`Satellite check — ${zone.name}: soil wetness ${wetness}, satellite risk score ${satelliteScore}`);
      db.prepare('UPDATE zones SET satellite_wetness = ? WHERE id = ?').run(wetness ?? 0, zone.id);

      const row = db.prepare('SELECT sensor_risk_score, rainfall_score FROM zones WHERE id = ?').get(zone.id);
      updateZoneRisk(zone.id, row.sensor_risk_score, row.rainfall_score,satelliteScore);
    } catch (err) {
      console.error(`Satellite fetch failed for zone ${zone.id}:`, err.message);
    }
  }
}


function updateZoneRisk(zoneId, sensorRiskScore, rainfallScore, satelliteScore) {

  sensorRiskScore = sensorRiskScore ?? 0;
  rainfallScore = rainfallScore ?? 0;
  satelliteScore = satelliteScore ?? 0;

  const blendedScore = Math.min(100, (sensorRiskScore * 0.5) + (rainfallScore * 0.3) + (satelliteScore * 0.2));

  let riskLevel = 'low';
  if (blendedScore > 60) riskLevel = 'high';
  else if (blendedScore > 25) riskLevel = 'medium';

  const existingZone = db.prepare('SELECT risk_level, updated_at FROM zones WHERE id = ?').get(zoneId);
  const secondsSinceLastUpdate = existingZone
    ? (Date.now() - new Date(existingZone.updated_at.replace(' ', 'T') + 'Z').getTime()) / 1000
    : 999;

  const levelChanged = !existingZone || riskLevel !== existingZone.risk_level;
  const levelEscalated = existingZone && (
    (riskLevel === 'high' && existingZone.risk_level !== 'high') ||
    (riskLevel === 'medium' && existingZone.risk_level === 'low')
  );

  const shouldUpdate = !existingZone || levelEscalated || (levelChanged && secondsSinceLastUpdate > 5);

  if (shouldUpdate) {
    db.prepare('INSERT INTO risk_history (zone_id, sensor_score, rainfall_score, satellite_score, risk_score) VALUES (?, ?, ?, ?, ?)').run(zoneId, sensorRiskScore, rainfallScore, satelliteScore, blendedScore);
    db.prepare(`
      UPDATE zones
      SET risk_score = ?, risk_level = ?, sensor_risk_score = ?, rainfall_score = ?, satellite_score = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(blendedScore, riskLevel, sensorRiskScore, rainfallScore, satelliteScore, zoneId);

    console.log(`Zone ${zoneId}: sensor=${sensorRiskScore.toFixed(1)}, rainfall=${rainfallScore.toFixed(1)}, satellite=${satelliteScore.toFixed(1)}, blended=${blendedScore.toFixed(1)} (${riskLevel})`);
    io.emit('zoneUpdate', { zoneId, riskScore: blendedScore, riskLevel, sensorRiskScore, rainfallScore, satelliteScore });

    if (riskLevel === 'high') {
      const zoneInfo = db.prepare('SELECT name FROM zones WHERE id = ?').get(zoneId);
      const smsText = `ALERT: High landslide risk detected near ${zoneInfo.name}. Avoid travel through this area. Follow official guidance.`;
      const ivrScript = `Automated voice call script: "${smsText} Press 1 to confirm you have received this message."`;

      io.emit('smsSimulated', {
        zoneId,
        zoneName: zoneInfo.name,
        smsText,
        ivrScript,
        time: new Date().toISOString()
      });

      const annResult = db.prepare(`
        INSERT INTO announcements (title, body, audience)
        VALUES (?, ?, 'citizens')
      `).run(`HIGH RISK — ${zoneInfo.name}`, smsText);

      const newAnnouncement = db.prepare('SELECT * FROM announcements WHERE id = ?').get(annResult.lastInsertRowid);
      io.emit('newAnnouncement', newAnnouncement);

    }

    const zoneInfoForAlert = db.prepare('SELECT name FROM zones WHERE id = ?').get(zoneId);
    generateTieredAlert(zoneId, zoneInfoForAlert.name, riskLevel, blendedScore);

  }
}
// --- Risk calculation (same logic as risk-engine.js, but per-sensor + broadcasts) ---
function calculateRiskForSensor(sensorId, zoneId, sensorType) {
  const readings = db.prepare(`
    SELECT value FROM readings
    WHERE sensor_id = ?
    ORDER BY timestamp DESC
    LIMIT 10
  `).all(sensorId).reverse();

  if (readings.length < 5) return;

  const values = readings.map(r => r.value);
  const latest = values[values.length - 1];
  const baselineValues = values.slice(0, -1);
  const sorted = [...baselineValues].sort((a,b)=>a-b);
  const median = sorted[Math.floor(sorted.length/2)];
  const cleanBaseline=baselineValues.filter(v=>Math.abs(v-median)<median*1.5+1);

  const finalBaseline= cleanBaseline.length>=3 ? cleanBaseline:baselineValues;

  const mean = finalBaseline.reduce((a, b) => a + b, 0) / finalBaseline.length;
  const variance = finalBaseline.reduce((a, b) => a + (b - mean) ** 2, 0) / finalBaseline.length;
  const stdDev = Math.sqrt(variance) || 0.01;
  const zScore = Math.abs((latest - mean) / stdDev);

      let riskScore;
    if (sensorType === 'moisture') {
      const drop = MOISTURE_DRY_BASELINE - latest;
      riskScore = drop > 200 ? Math.min(100, (drop / MOISTURE_DRY_BASELINE) * 150) : 0;
    } else {
      const Z_SCORE_THRESHOLD = 2.0;
      riskScore = (zScore < Z_SCORE_THRESHOLD) ? 0 : Math.min(100, zScore * 20);
    }

  if (!zoneSensorScores[zoneId]) zoneSensorScores[zoneId] = {};
  zoneSensorScores[zoneId][sensorType] = riskScore;
  const combinedSensorScore = Math.max(...Object.values(zoneSensorScores[zoneId]));

  const zoneRow = db.prepare('SELECT rainfall_score, satellite_score FROM zones WHERE id = ?').get(zoneId);
  const currentRainfallScore = zoneRow ? zoneRow.rainfall_score : 0;
  const currentSatelliteScore = zoneRow ? zoneRow.satellite_score : 0;
  updateZoneRisk(zoneId, combinedSensorScore, currentRainfallScore, currentSatelliteScore);

}

function calculateTrajectory(zoneId) {
  const history = db.prepare(`
    SELECT sensor_score, rainfall_score, satellite_score, recorded_at
    FROM risk_history
    WHERE zone_id = ?
    ORDER BY recorded_at DESC
    LIMIT 5
  `).all(zoneId).reverse();

  if (history.length < 2) return null;

  const first = history[0];
  const last = history[history.length - 1];
  const hoursElapsed = (new Date(last.recorded_at) - new Date(first.recorded_at)) / (1000 * 60 * 60);
  if (hoursElapsed <= 0) return null;

  const sensorTrendPerHour = (last.sensor_score - first.sensor_score) / hoursElapsed;
  const rainfallTrendPerHour = (last.rainfall_score - first.rainfall_score) / hoursElapsed;
  const satelliteTrendPerHour = (last.satellite_score - first.satellite_score) / hoursElapsed;

  const projectedSensor = Math.max(0, Math.min(100, last.sensor_score + sensorTrendPerHour * 6));
  const projectedRainfall = Math.max(0, Math.min(100, last.rainfall_score + rainfallTrendPerHour * 6));
  const projectedSatellite = Math.max(0, Math.min(100, last.satellite_score + satelliteTrendPerHour * 6));

  const projectedScore = Math.min(100, (projectedSensor * 0.5) + (projectedRainfall * 0.3) + (projectedSatellite * 0.2));

  let projectedLevel = 'low';
  if (projectedScore > 60) projectedLevel = 'high';
  else if (projectedScore > 25) projectedLevel = 'medium';

  return {
    zoneId,
    projectedScore,
    projectedLevel,
    sensorTrendPerHour,
    rainfallTrendPerHour,
    satelliteTrendPerHour,
    explanation: `Ground sensors trending ${sensorTrendPerHour >= 0 ? '+' : ''}${sensorTrendPerHour.toFixed(1)}/hr, rainfall risk ${rainfallTrendPerHour >= 0 ? '+' : ''}${rainfallTrendPerHour.toFixed(1)}/hr, soil saturation ${satelliteTrendPerHour >= 0 ? '+' : ''}${satelliteTrendPerHour.toFixed(1)}/hr — projected in 6 hours if this continues.`
  };
}



function generateTieredAlert(zoneId, zoneName, riskLevel, riskScore) {
  const citizenMessage = riskLevel === 'high'
    ? `High risk near ${zoneName}. Avoid the area and stay alert for further instructions.`
    : `Rising risk near ${zoneName}. Stay cautious and monitor updates.`;

  const districtMessage = `${zoneName}: risk escalated to ${riskLevel.toUpperCase()} (score ${riskScore.toFixed(1)}). Sensor + rainfall data attached. Review road status and prepare response.`;

  const authorityMessage = `[Cross-district view] ${zoneName} now at ${riskLevel.toUpperCase()} risk (score ${riskScore.toFixed(1)}). Coordinate resources if multiple zones escalate simultaneously.`;

  const result = db.prepare(`
    INSERT INTO tiered_alerts (zone_id, zone_name, risk_level, citizen_message, district_message, authority_message)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(zoneId, zoneName, riskLevel, citizenMessage, districtMessage, authorityMessage);

  const alert = db.prepare('SELECT * FROM tiered_alerts WHERE id = ?').get(result.lastInsertRowid);
  io.emit('tieredAlert', alert);
  console.log(`Tiered alert generated for ${zoneName} (${riskLevel})`);
}
// --- Socket.IO connection handling ---
io.on('connection', (socket) => {
  console.log('A client connected to live updates');

  // Send current zone states immediately on connect
  const zones = db.prepare('SELECT * FROM zones').all();
  socket.emit('initialZones', zones);

  socket.on('disconnect', () => {
    console.log('A client disconnected');
  });
});



// --- Start server ---
updateAllZonesWeather(); // ADD THIS LINE
setInterval(updateAllZonesWeather, 10 * 60 * 1000); // ADD THIS LINE
// updateAllZonesSatellite();
setInterval(updateAllZonesSatellite, 6*60*60*1000);//every 6 hours, not as frequent as weather updates
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
setInterval(() => {
  const zones = db.prepare('SELECT id FROM zones').all();
  zones.forEach(zone => {
    const trajectory = calculateTrajectory(zone.id);
    if (trajectory) io.emit('riskTrajectory', trajectory);
  });
}, 10 * 60 * 1000); // check every 10 minutes, matches your weather cadence