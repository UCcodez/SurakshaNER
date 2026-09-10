function predictTrajectory(history) {
  // history: array of { risk_score, recorded_at }, oldest first
  if (history.length < 4) return null; // not enough data yet

  const points = history.map((h, i) => ({ x: i, y: h.risk_score }));
  const n = points.length;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const stepsAhead = 6; // project 6 readings into the future
  const projectedScore = Math.max(0, Math.min(100, slope * (n - 1 + stepsAhead) + intercept));

  return {
    slope: Number(slope.toFixed(2)),
    trend: slope > 0.5 ? 'rising' : slope < -0.5 ? 'falling' : 'stable',
    projectedScore: Number(projectedScore.toFixed(1))
  };
}

module.exports = { predictTrajectory };