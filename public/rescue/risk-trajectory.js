const socket = io();

const trajectoryCache = {};
const zoneNames = {};

const levelColors = {
  low: '#2ecc71',
  medium: '#f39c12',
  high: '#e74c3c'
};

function formatNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  return number.toFixed(1);
}

function formatTrend(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return '—';
  }

  if (number > 0) {
    return `+${number.toFixed(2)}/hr`;
  }

  return `${number.toFixed(2)}/hr`;
}

function trendClass(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number === 0) {
    return 'neutral';
  }

  return number > 0 ? 'positive' : 'negative';
}

function getLevelClass(level) {
  return `level-${level || 'low'}`;
}

function renderSummary(entries) {
  const countElement = document.getElementById('zones-count');
  const highestElement = document.getElementById('highest-risk');
  const updatedElement = document.getElementById('last-updated');

  countElement.textContent = entries.length;

  if (entries.length === 0) {
    highestElement.textContent = '—';
    updatedElement.textContent = '—';
    return;
  }

  const highest = entries.reduce((current, entry) => {
    return Number(entry.projectedScore) > Number(current.projectedScore)
      ? entry
      : current;
  });

  highestElement.textContent = formatNumber(highest.projectedScore);
  updatedElement.textContent = new Date().toLocaleTimeString();
}

function renderTrajectoryList() {
  const container = document.getElementById('trajectory-list');
  const entries = Object.values(trajectoryCache);

  renderSummary(entries);

  if (entries.length === 0) {
    container.innerHTML = `
      <p class="empty-message">
        Waiting for enough history to project a trend...
      </p>
    `;

    return;
  }

  entries.sort((a, b) => {
    return Number(b.projectedScore) - Number(a.projectedScore);
  });

  container.innerHTML = entries.map(trajectory => {
    const zoneName =
      zoneNames[trajectory.zoneId] || trajectory.zoneId;

    const level =
      trajectory.projectedLevel || 'low';

    const color =
      levelColors[level] || levelColors.low;

    return `
      <article
        class="trajectory-card"
        style="border-left-color: ${color};"
      >
        <div class="zone-name">
          ${zoneName}
        </div>

        <span class="projected-level ${getLevelClass(level)}">
          Projected ${level}
        </span>

        <div class="projected-score">
          ${formatNumber(trajectory.projectedScore)}
          <span style="font-size:14px; color:#8eaaa0;">/ 100</span>
        </div>

        <div class="trend-row">
          <span>Ground sensors</span>
          <strong class="${trendClass(trajectory.sensorTrendPerHour)}">
            ${formatTrend(trajectory.sensorTrendPerHour)}
          </strong>
        </div>

        <div class="trend-row">
          <span>Rainfall risk</span>
          <strong class="${trendClass(trajectory.rainfallTrendPerHour)}">
            ${formatTrend(trajectory.rainfallTrendPerHour)}
          </strong>
        </div>

        <div class="trend-row">
          <span>Satellite / soil</span>
          <strong class="${trendClass(trajectory.satelliteTrendPerHour)}">
            ${formatTrend(trajectory.satelliteTrendPerHour)}
          </strong>
        </div>

        <div class="explanation">
          ${trajectory.explanation || 'No explanation available.'}
        </div>
      </article>
    `;
  }).join('');
}

async function loadZones() {
  try {
    const response = await fetch('/api/zones');

    if (!response.ok) {
      throw new Error('Failed to load zones');
    }

    const zones = await response.json();

    zones.forEach(zone => {
      zoneNames[zone.id] = zone.name;
    });

    renderTrajectoryList();
  } catch (error) {
    console.error('Failed to load zones:', error);
  }
}

async function loadInitialTrajectory() {
  try {
    const response = await fetch('/api/trajectory');

    if (!response.ok) {
      throw new Error('Failed to load trajectory');
    }

    const trajectories = await response.json();

    trajectories.forEach(trajectory => {
      trajectoryCache[trajectory.zoneId] = trajectory;
    });

    renderTrajectoryList();
  } catch (error) {
    console.error('Failed to load trajectory:', error);

    document.getElementById('trajectory-list').innerHTML = `
      <p class="empty-message">
        Unable to load risk trajectory data.
      </p>
    `;
  }
}

socket.on('riskTrajectory', trajectory => {
  trajectoryCache[trajectory.zoneId] = trajectory;
  renderTrajectoryList();
});

loadZones();
loadInitialTrajectory();