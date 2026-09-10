const https = require('https');

function fetchWeatherForZone(zone) {
  return new Promise((resolve, reject) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${zone.lat}&longitude=${zone.lng}&current=precipitation`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const mm = parsed.current?.precipitation ?? 0;
          resolve(mm);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function calculateRainfallRisk(mm) {
  // Bands loosely based on IMD rainfall intensity classification (mm/hr)
  if (mm <= 0) return 0;
  if (mm < 2.5) return 15;   // light rain
  if (mm < 7.5) return 35;   // moderate rain
  if (mm < 35.5) return 60;  // heavy rain
  if (mm < 64.5) return 80;  // very heavy rain
  return 95;                 // extremely heavy rain
}

module.exports = { fetchWeatherForZone, calculateRainfallRisk };