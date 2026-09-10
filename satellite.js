const https = require('https');

function formatDate(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

function fetchSatelliteDataForZone(zone) {
  return new Promise((resolve, reject) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6); // NASA POWER data has a few days' publishing lag

    const url = `https://power.larc.nasa.gov/api/temporal/daily/point?parameters=GWETTOP&community=AG&longitude=${zone.lng}&latitude=${zone.lat}&start=${formatDate(start)}&end=${formatDate(end)}&format=JSON`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const series = parsed.properties.parameter.GWETTOP;
          const values = Object.values(series).filter(v => v !== -999); // NASA uses -999 for missing days
          if (values.length === 0) return resolve(null);
          resolve(values[values.length - 1]); // most recent available reading, 0-1 fraction
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function calculateSatelliteRisk(wetness) {
  if (wetness === null || wetness === undefined) return 0;
  if (wetness < 0.3) return 10;
  if (wetness < 0.5) return 30;
  if (wetness < 0.7) return 55;
  if (wetness < 0.85) return 75;
  return 90;
}

module.exports = { fetchSatelliteDataForZone, calculateSatelliteRisk };