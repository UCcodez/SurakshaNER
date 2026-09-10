const map = L.map('rescueMap').setView([25.8, 91.8], 7);

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
const sosMarkers = {};

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
      fillOpacity: 0.4
    }).addTo(map);
    circle.bindPopup(`<b>${zone.name}</b><br>Risk: ${score.toFixed(1)} (${zone.risk_level})`);
    zoneMarkers[id] = circle;
  }
}

function renderSOSPin(alert) {
  if (sosMarkers[alert.id]) return; // already on the map

  const marker = L.marker([alert.lat, alert.lng]).addTo(map);
  marker.bindPopup(`<b>SOS #${alert.id}</b><br>${alert.message || ''}<br>Status: ${alert.status}`);
  sosMarkers[alert.id] = marker;
}

const socket = io();

socket.on('initialZones', (zones) => {
  zones.forEach(zone => {
    zoneData[zone.id] = zone;
    renderZone(zone);
  });
});

socket.on('zoneUpdate', (update) => {
  const cached = zoneData[update.zoneId];
  if (!cached) return;
  const merged = { ...cached, risk_score: update.riskScore, risk_level: update.riskLevel };
  zoneData[update.zoneId] = merged;
  renderZone(merged);
});

socket.on('newSOS', (alert) => {
  renderSOSPin(alert);
  loadSOSList(); // refresh the side panel list too
});

// --- Load existing SOS pins on page load ---
async function loadExistingSOS() {
  const res = await fetch('/api/sos');
  const alerts = await res.json();
  alerts.forEach(renderSOSPin);
}
loadExistingSOS();

// --- Post announcement ---
async function postAnnouncement() {
  const title = document.getElementById('annTitle').value.trim();
  const body = document.getElementById('annBody').value.trim();
  const status = document.getElementById('annStatus');

  if (!title || !body) {
    status.textContent = 'Please fill in both fields.';
    return;
  }

  try {
    const res = await fetch('/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, audience: 'citizens' })
    });
    await res.json();
    status.textContent = 'Announcement posted!';
    document.getElementById('annTitle').value = '';
    document.getElementById('annBody').value = '';
  } catch (err) {
    status.textContent = 'Failed to post announcement.';
  }
}

// --- SOS list panel ---
async function loadSOSList() {
  const container = document.getElementById('sosList');
  const res = await fetch('/api/sos');
  let alerts = await res.json();

  alerts.sort((a, b) => b.priority_score - a.priority_score);

  if (alerts.length === 0) {
    container.innerHTML = '<p style="color:#888">No active alerts.</p>';
    return;
  }

  container.innerHTML = alerts.map(a => `
    <div class="sos-item">
      <strong>SOS #${a.id} — Priority ${a.priority_score.toFixed(1)}</strong> — ${a.message || 'No message'}
      <div class="sos-meta">
        ${new Date(a.created_at).toLocaleString()} · (${a.lat.toFixed(4)}, ${a.lng.toFixed(4)})
        · ${a.victim_count} ${a.victim_count === 1 ? 'person' : 'people'} · ${a.vulnerability !== 'none' ? a.vulnerability : ''}
      </div>
      <select onchange="updateStatus(${a.id}, this.value)">
        <option value="open" ${a.status === 'open' ? 'selected' : ''}>Open</option>
        <option value="assigned" ${a.status === 'assigned' ? 'selected' : ''}>Assigned</option>
        <option value="resolved" ${a.status === 'resolved' ? 'selected' : ''}>Resolved</option>
      </select>
      <select onchange="updateSeverity(${a.id}, this.value)">
        <option value="low" ${a.severity === 'low' ? 'selected' : ''}>Low severity</option>
        <option value="medium" ${a.severity === 'medium' ? 'selected' : ''}>Medium severity</option>
        <option value="high" ${a.severity === 'high' ? 'selected' : ''}>High severity</option>
      </select>
      <button onclick="deleteSOS(${a.id})" style="margin-left:8px; background:#e74c3c; color:#fff; border:none; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px;">Delete</button>
    </div>
  `).join('');
}

async function deleteSOS(id) {
  if (!confirm('Delete this SOS alert?')) return;
  await fetch(`/api/sos/${id}`, { method: 'DELETE' });
  loadSOSList();
}

socket.on('sosDeleted', (data) => {
  if (sosMarkers[data.id]) {
    map.removeLayer(sosMarkers[data.id]);
    delete sosMarkers[data.id];
  }
  loadSOSList();
});

async function updateSeverity(id, severity) {
  await fetch(`/api/sos/${id}/severity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ severity })
  });
  loadSOSList();
}

async function updateStatus(id, status) {
  await fetch(`/api/sos/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
}

loadSOSList();


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

async function loadRoadsOnMap() {
  const res = await fetch('/api/roads');
  const roads = await res.json();
  roads.forEach(renderRoad);
}
loadRoadsOnMap();

socket.on('roadStatusUpdate', (road) => {
  renderRoad(road);
  loadRoadList(); // keep the side panel in sync too
});

async function loadRoadList() {
  const container = document.getElementById('roadList');
  const res = await fetch('/api/roads');
  const roads = await res.json();

  container.innerHTML = roads.map(r => `
    <div class="road-item">
      <strong>${r.name}</strong>
      <div class="sos-meta">Last updated: ${new Date(r.updated_at).toLocaleString()}</div>
      <select onchange="updateRoadStatus('${r.id}', this.value)">
        <option value="clear" ${r.status === 'clear' ? 'selected' : ''}>Clear</option>
        <option value="at_risk" ${r.status === 'at_risk' ? 'selected' : ''}>At Risk</option>
        <option value="blocked" ${r.status === 'blocked' ? 'selected' : ''}>Blocked</option>
      </select>
    </div>
  `).join('');
}

async function updateRoadStatus(id, status) {
  await fetch(`/api/roads/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
}

loadRoadList();

async function loadDemoControls() {
  const container = document.getElementById('demoControls');
  const res = await fetch('/api/sensors');
  const sensors = await res.json();

  container.innerHTML = sensors.map(s => `
    <div class="road-item">
      <strong>${s.id}</strong> (${s.type}) — zone: ${s.zone_id}
      <button class="post-btn" onclick="triggerSpike('${s.id}')">Trigger Spike</button>
    </div>
  `).join('');
}

async function triggerSpike(sensorId) {
  await fetch('/api/simulate-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sensorId })
  });
}

loadDemoControls();

socket.on('smsSimulated', (data) => {
  const container = document.getElementById('smsPanel');
  if (container.querySelector('p')) container.innerHTML = '';

  const entry = document.createElement('div');
  entry.className = 'sos-item';
  entry.innerHTML = `
    <strong>📱 SMS → ${data.zoneName}</strong>
    <div class="sos-meta">${new Date(data.time).toLocaleTimeString()}</div>
    <div style="margin-top:6px;">${data.smsText}</div>
    <div style="margin-top:6px; font-size:12px; color:#888;">📞 ${data.ivrScript}</div>
  `;
  container.prepend(entry);
});

socket.on('tieredAlert', (alert) => {
  const container = document.getElementById('tieredAlertsList');
  if (container.querySelector('p')) container.innerHTML = '';

  const entry = document.createElement('div');
  entry.className = 'sos-item';
  entry.innerHTML = `
    <strong>${alert.zone_name} — ${alert.risk_level.toUpperCase()}</strong>
    <div class="sos-meta">${new Date(alert.created_at).toLocaleTimeString()}</div>
    <div style="margin-top:8px;"><strong>Citizens:</strong> ${alert.citizen_message}</div>
    <div style="margin-top:6px;"><strong>District:</strong> ${alert.district_message}</div>
    <div style="margin-top:6px;"><strong>Authority:</strong> ${alert.authority_message}</div>
  `;
  container.prepend(entry);
});

const trajectoryCache = {};

async function loadInitialTrajectory() {
  const res = await fetch('/api/trajectory');
  const trajectories = await res.json();
  trajectories.forEach(t => { trajectoryCache[t.zoneId] = t; });
  renderTrajectoryList();
}
loadInitialTrajectory();

socket.on('riskTrajectory', (data) => {
  trajectoryCache[data.zoneId] = data;
  renderTrajectoryList();
});

function renderTrajectoryList() {
  const container = document.getElementById('trajectoryList');
  const entries = Object.values(trajectoryCache);

  if (entries.length === 0) {
    container.innerHTML = '<p style="color:#888">Waiting for enough history to project a trend...</p>';
    return;
  }

  const levelColors = { low: '#2ecc71', medium: '#f39c12', high: '#e74c3c' };

  container.innerHTML = entries.map(t => {
    const zoneName = zoneData[t.zoneId]?.name || t.zoneId;
    const color = levelColors[t.projectedLevel] || levelColors.low;
    return `
      <div class="sos-item" style="border-left-color:${color};">
        <strong>${zoneName} — Projected ${t.projectedLevel.toUpperCase()} (${t.projectedScore.toFixed(1)})</strong>
        <div class="sos-meta">${t.explanation}</div>
      </div>
    `;
  }).join('');
}

async function loadPhotoReports() {
  const container = document.getElementById('photoReportsList');
  if (!container) return;
  const res = await fetch('/api/photo-reports');
  const reports = await res.json();

  if (reports.length === 0) {
    container.innerHTML = '<p style="color:#888">No field reports yet.</p>';
    return;
  }

  container.innerHTML = reports.map(r => `
    <div class="sos-item">
      <strong>${r.hazard_type.toUpperCase()}</strong> — ${r.media_type}
      <div class="sos-meta">${new Date(r.created_at).toLocaleString()} · (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)})</div>
      ${r.description ? `<div style="margin-top:6px;">${r.description}</div>` : ''}
      ${r.media_type === 'photo'
        ? `<img src="${r.photo_url}" style="max-width:100%; border-radius:8px; margin-top:8px;">`
        : `<video src="${r.photo_url}" controls style="max-width:100%; border-radius:8px; margin-top:8px;"></video>`}
    </div>
  `).join('');
}

socket.on('newPhotoReport', () => loadPhotoReports());
loadPhotoReports();

let lostFoundManageData = [];
let expandedLostFoundId = null;

async function loadLostFoundManage() {
  const container = document.getElementById('lostFoundManage');
  const res = await fetch('/api/lost-found');
  lostFoundManageData = await res.json();
  renderLostFoundManage();
}

function renderLostFoundManage() {
  const container = document.getElementById('lostFoundManage');

  if (lostFoundManageData.length === 0) {
    container.innerHTML = '<p style="color:#7fa08c">No entries yet.</p>';
    return;
  }

  container.innerHTML = lostFoundManageData.map(e => {
    const isExpanded = expandedLostFoundId === e.id;
    return `
      <div class="sos-item" style="cursor:pointer;" onclick="toggleLostFoundDetail(${e.id})">
        <div style="display:flex; gap:10px; align-items:center;">
          ${e.photo_url ? `<img src="${e.photo_url}" style="width:48px; height:48px; object-fit:cover; border-radius:6px; flex-shrink:0;">` : `<div style="width:48px; height:48px; background:#1c2b24; border-radius:6px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-size:20px;">${e.report_type === 'person' ? '🧍' : '📦'}</div>`}
          <div style="flex:1;">
            <strong>${e.status === 'found' ? '✓ FOUND — ' : ''}${e.name}</strong>
            <div class="sos-meta">${new Date(e.created_at).toLocaleString()}</div>
          </div>
          <span style="color:#7fa08c; font-size:12px;">${isExpanded ? '▲' : '▼'}</span>
        </div>

        ${isExpanded ? `
          <div style="margin-top:12px; padding-top:12px; border-top:0.5px solid #3a5245;">
            ${e.photo_url ? `<img src="${e.photo_url}" style="max-width:100%; border-radius:8px; margin-bottom:10px;">` : ''}
            <div><strong>Type:</strong> ${e.report_type === 'person' ? 'Missing person' : 'Lost item'}</div>
            ${e.description ? `<div style="margin-top:6px;"><strong>Description:</strong> ${e.description}</div>` : ''}
            ${e.contact_info ? `<div style="margin-top:6px;"><strong>Contact:</strong> ${e.contact_info}</div>` : ''}
            ${e.lat ? `<div style="margin-top:6px;"><strong>Location:</strong> (${e.lat.toFixed(4)}, ${e.lng.toFixed(4)})</div>` : ''}
            ${e.status !== 'found' ? `<button onclick="event.stopPropagation(); markFound(${e.id})" style="margin-top:10px; background:#2ecc71; color:#fff; border:none; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:12px;">Mark Found</button>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function toggleLostFoundDetail(id) {
  expandedLostFoundId = expandedLostFoundId === id ? null : id;
  renderLostFoundManage();
}

async function markFound(id) {
  await fetch(`/api/lost-found/${id}/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'found' })
  });
  loadLostFoundManage();
}

socket.on('newLostFound', () => loadLostFoundManage());
socket.on('lostFoundStatusUpdate', () => loadLostFoundManage());
loadLostFoundManage();

async function loadInDangerList() {
  const container = document.getElementById('inDangerList');
  const res = await fetch('/api/in-danger');
  const alerts = await res.json();
  const active = alerts.filter(a => a.status === 'active');

  if (active.length === 0) {
    container.innerHTML = '<p style="color:#7fa08c">No active in-danger alerts.</p>';
    return;
  }

  container.innerHTML = active.map(a => `
    <div class="sos-item" style="border-left-color:#b91c1c;">
      <strong>⚠ IN DANGER — Alert #${a.id}</strong>
      <div class="sos-meta">${new Date(a.created_at).toLocaleString()} · (${a.lat.toFixed(4)}, ${a.lng.toFixed(4)})</div>
      <button onclick="resolveInDanger(${a.id})" style="margin-top:6px; background:#2ecc71; color:#fff; border:none; padding:4px 10px; border-radius:6px; cursor:pointer; font-size:12px;">Mark Resolved</button>
    </div>
  `).join('');
}

async function resolveInDanger(id) {
  await fetch(`/api/in-danger/${id}/resolve`, { method: 'POST' });
  loadInDangerList();
}

socket.on('newInDanger', () => loadInDangerList());
socket.on('inDangerResolved', () => loadInDangerList());
loadInDangerList();