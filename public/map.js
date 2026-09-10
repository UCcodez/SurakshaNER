const map = L.map('map').setView([25.8, 91.8], 7);

const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics'
});

L.control.layers(
  { 'Street Map': streetLayer, 'Satellite': satelliteLayer },
  {},
  { position: 'topright' }
).addTo(map);

const riskColors = { low: '#2ecc71', medium: '#f39c12', high: '#e74c3c' };
const zoneMarkers = {};
const zoneData = {};

function renderZone(zone) {
  const id = zone.id;
  const color = riskColors[zone.risk_level] || riskColors.low;
  const score = zone.risk_score;

  if (zoneMarkers[id]) {
    const marker = zoneMarkers[id];
    marker.setStyle({ color, fillColor: color });
    marker.setRadius(8000 + score * 300);
    marker.setPopupContent(`<b>${zone.name}</b><br>Risk: ${score.toFixed(1)} (${zone.risk_level})`);
  } else {
    const circle = L.circle([zone.lat, zone.lng], {
      radius: 8000 + score * 300,
      color,
      fillColor: color,
      fillOpacity: 0.5
    }).addTo(map);
    circle.bindPopup(`<b>${zone.name}</b><br>Risk: ${score.toFixed(1)} (${zone.risk_level})`);
    zoneMarkers[id] = circle;
  }
}

function updateRiskStrip() {
  const zones = Object.values(zoneData);
  if (zones.length === 0) return;

  const highest = zones.reduce((a, b) => (b.risk_score > a.risk_score ? b : a));

  const zoneEl = document.getElementById('strip-highest-zone');
  const levelEl = document.getElementById('strip-highest-level');
  const scoreEl = document.getElementById('strip-highest-score');
  const monitoredEl = document.getElementById('strip-zones-monitored');

  if (zoneEl) zoneEl.textContent = highest.name;
  if (levelEl) {
    levelEl.textContent = highest.risk_level.toUpperCase();
    levelEl.style.color = riskColors[highest.risk_level] || riskColors.low;
  }
  if (scoreEl) scoreEl.textContent = `(${highest.risk_score.toFixed(1)})`;
  if (monitoredEl) monitoredEl.textContent = zones.length;
}

const socket = io();

socket.on('initialZones', (zones) => {
  zones.forEach(zone => {
    zoneData[zone.id] = zone;
    renderZone(zone);
  });
  updateRiskStrip();
});

socket.on('zoneUpdate', (update) => {
  const cached = zoneData[update.zoneId];
  if (!cached) return;

  const merged = {
    ...cached,
    risk_score: update.riskScore,
    risk_level: update.riskLevel
  };
  zoneData[update.zoneId] = merged;
  renderZone(merged);
  updateRiskStrip();
});

const roadColors = { clear: '#2ecc71', at_risk: '#f39c12', blocked: '#e74c3c' };
const roadLines = {};

function renderRoad(road) {
  const color = roadColors[road.status] || roadColors.clear;

  if (roadLines[road.id]) {
    roadLines[road.id].setStyle({ color });
    roadLines[road.id].setPopupContent(`<b>${road.name}</b><br>Status: ${road.status.replace('_', ' ')}`);
  } else {
    const line = L.polyline(road.path, { color, weight: 5, opacity: 0.8 }).addTo(map);
    line.bindPopup(`<b>${road.name}</b><br>Status: ${road.status.replace('_', ' ')}`);
    roadLines[road.id] = line;
  }
}

fetch('/api/roads')
  .then(res => res.json())
  .then(roads => roads.forEach(renderRoad))
  .catch(err => console.error('Failed to load roads:', err));

socket.on('roadStatusUpdate', (road) => {
  renderRoad(road);
});