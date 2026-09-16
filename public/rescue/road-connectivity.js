const map = L.map('road-map').setView([25.8, 91.8], 7);

L.tileLayer(
  'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  {
    attribution: '&copy; OpenStreetMap contributors'
  }
).addTo(map);

const socket = io();

const roadColors = {
  clear: '#2ecc71',
  at_risk: '#f39c12',
  blocked: '#e74c3c'
};

const roadLines = {};
const roads = {};

function formatStatus(status) {
  return status.replace('_', ' ');
}

function renderRoadOnMap(road) {
  const color = roadColors[road.status] || roadColors.clear;

  if (roadLines[road.id]) {
    roadLines[road.id].setStyle({ color });

    roadLines[road.id].setPopupContent(`
      <b>${road.name}</b><br>
      Status: ${formatStatus(road.status)}
    `);
  } else {
    const line = L.polyline(road.path, {
      color,
      weight: 6,
      opacity: 0.85
    }).addTo(map);

    line.bindPopup(`
      <b>${road.name}</b><br>
      Status: ${formatStatus(road.status)}
    `);

    roadLines[road.id] = line;
  }
}

function renderRoadList() {
  const roadList = document.getElementById('road-list');

  roadList.innerHTML = '';

  const roadArray = Object.values(roads);

  if (roadArray.length === 0) {
    roadList.innerHTML = `
      <p class="empty-message">No roads available.</p>
    `;
    return;
  }

  roadArray.forEach(road => {
    const card = document.createElement('div');
    card.className = 'road-card';

    card.innerHTML = `
      <div class="road-name">${road.name}</div>

      <div class="road-status">
        Current status:
        <strong>${formatStatus(road.status)}</strong>
      </div>

      <select class="status-select" data-road-id="${road.id}">
        <option value="clear" ${road.status === 'clear' ? 'selected' : ''}>
          Clear
        </option>

        <option value="at_risk" ${road.status === 'at_risk' ? 'selected' : ''}>
          At Risk
        </option>

        <option value="blocked" ${road.status === 'blocked' ? 'selected' : ''}>
          Blocked
        </option>
      </select>
    `;

    const select = card.querySelector('.status-select');

    select.addEventListener('change', () => {
      updateRoadStatus(road.id, select.value);
    });

    roadList.appendChild(card);
  });
}

async function updateRoadStatus(roadId, status) {
  try {
    const response = await fetch(`/api/roads/${roadId}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update road status');
    }

    const updatedRoad = await response.json();

    roads[updatedRoad.id] = updatedRoad;

    renderRoadOnMap(updatedRoad);
    renderRoadList();

    console.log(
      `Road ${updatedRoad.id} updated to ${updatedRoad.status}`
    );
  } catch (error) {
    console.error('Road status update failed:', error);
    alert('Unable to update road status. Please try again.');
    loadRoads();
  }
}

async function loadRoads() {
  try {
    const response = await fetch('/api/roads');

    if (!response.ok) {
      throw new Error('Failed to load roads');
    }

    const roadData = await response.json();

    roadData.forEach(road => {
      roads[road.id] = road;
      renderRoadOnMap(road);
    });

    renderRoadList();
  } catch (error) {
    console.error('Failed to load roads:', error);

    document.getElementById('road-list').innerHTML = `
      <p class="empty-message">
        Failed to load road data.
      </p>
    `;
  }
}

socket.on('roadStatusUpdate', road => {
  roads[road.id] = road;

  renderRoadOnMap(road);
  renderRoadList();
});

loadRoads();