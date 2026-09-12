"""
predict_service.py
-------------------
Small Flask microservice that loads the trained scikit-learn models
(sensor ExtraTrees classifier, rainfall/severity Random Forest classifier)
and exposes them as simple HTTP endpoints.

WHY THIS EXISTS:
Our main backend (server.js) is Node.js/Express, but our ML models are
trained in Python (scikit-learn). Node can't directly run a .pkl file,
so this service acts as a small bridge: Node makes a normal HTTP request
to this service, this service runs the actual model, and sends back a
JSON response Node can use like any other API call.

HOW TO RUN (for local development):
    pip install flask scikit-learn pandas joblib
    python predict_service.py
    -> service starts on http://localhost:5001

HOW server.js WOULD CALL THIS (example, not yet wired into server.js):
    const res = await fetch('http://localhost:5001/predict-sensor-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            soil_moisture_pct: 28.5,
            tilt_change_deg: 1.1,
            vibration_events_per_hr: 6,
            pore_pressure_kpa: 0.34,
            rainfall_mm_24hr: 180
        })
    });
    const data = await res.json();
    // data.risk_probability, data.risk_label

STATUS: Currently a standalone service, not yet called from server.js.
Full integration (Node -> this service -> live sensor stream) is planned
for the December build phase, once live satellite/sensor feeds replace
the current trained-on-historical-data models.
"""

from flask import Flask, request, jsonify
import pickle
import pandas as pd
import os

app = Flask(__name__)

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

# ---- Load models once at startup (not per-request, for speed) ----
with open(os.path.join(MODEL_DIR, 'sensor_extratrees_model.pkl'), 'rb') as f:
    sensor_model = pickle.load(f)

with open(os.path.join(MODEL_DIR, 'landslide_rf_model.pkl'), 'rb') as f:
    rainfall_model = pickle.load(f)

# Exact feature column order the rainfall model was trained on
# (needed because the model was trained on one-hot encoded categorical
# columns - any new input must be reshaped to match this exact structure)
rainfall_columns = rainfall_model.feature_names_in_.tolist()

# Sensor model's expected column order (no encoding needed, all numeric)
SENSOR_FEATURES = [
    'soil_moisture_pct',
    'tilt_change_deg',
    'vibration_events_per_hr',
    'pore_pressure_kpa',
    'rainfall_mm_24hr'
]


@app.route('/health', methods=['GET'])
def health():
    """Quick check that the service is up and models loaded correctly."""
    return jsonify({
        'status': 'ok',
        'models_loaded': ['sensor_extratrees', 'rainfall_random_forest']
    })


@app.route('/predict-sensor-risk', methods=['POST'])
def predict_sensor_risk():
    """
    Expects JSON body:
    {
        "soil_moisture_pct": float,
        "tilt_change_deg": float,
        "vibration_events_per_hr": float,
        "pore_pressure_kpa": float,
        "rainfall_mm_24hr": float
    }
    Returns:
    {
        "risk_probability": float (0-1),
        "risk_label": "normal" | "high_risk"
    }
    """
    data = request.get_json()

    missing = [f for f in SENSOR_FEATURES if f not in data]
    if missing:
        return jsonify({'error': f'Missing required fields: {missing}'}), 400

    row = pd.DataFrame([{f: data[f] for f in SENSOR_FEATURES}])

    proba = sensor_model.predict_proba(row)[0][1]  # probability of class "1" (high_risk)
    label = 'high_risk' if proba >= 0.5 else 'normal'

    return jsonify({
        'risk_probability': round(float(proba), 4),
        'risk_label': label
    })


@app.route('/predict-rainfall-severity', methods=['POST'])
def predict_rainfall_severity():
    """
    Expects JSON body describing an event, e.g.:
    {
        "landslide_trigger": "downpour",
        "landslide_category": "landslide",
        "landslide_setting": "above_road",
        "month": 7,
        "log_population": 10.2,
        "gazeteer_distance": 5.0
    }
    Returns:
    {
        "high_severity_probability": float (0-1),
        "severity_label": "low_severity" | "high_severity"
    }

    NOTE: This model was trained on the NASA Global Landslide Catalog
    (metadata-based), not live rainfall telemetry. Treat this as a
    starting point for the "rainfall model" slot in our fusion
    architecture - swapping in real Open-Meteo-derived features
    (rainfall intensity/duration) is the natural next upgrade.
    """
    data = request.get_json()

    # Build a one-row dataframe matching the categorical inputs, then
    # one-hot encode and reindex to match exactly what the model saw
    # during training (missing categories get filled with 0).
        # Build the row directly, matching the exact training columns and
    # order - avoids the fragile get_dummies + reindex approach, which
    # can produce a feature-name/order mismatch scikit-learn rejects.
    row = pd.DataFrame(0.0, index=[0], columns=rainfall_columns)

    trigger_col = f"landslide_trigger_{data.get('landslide_trigger', 'unknown')}"
    category_col = f"landslide_category_{data.get('landslide_category', 'unknown')}"
    setting_col = f"landslide_setting_{data.get('landslide_setting', 'unknown')}"

    for col in [trigger_col, category_col, setting_col]:
        if col in row.columns:
            row.at[0, col] = 1.0

    for col, val in [
        ('month', data.get('month', 6)),
        ('log_population', data.get('log_population', 0)),
        ('gazeteer_distance', data.get('gazeteer_distance', 0)),
    ]:
        if col in row.columns:
            row.at[0, col] = float(val)

    proba = rainfall_model.predict_proba(row)[0][1]
    label = 'high_severity' if proba >= 0.5 else 'low_severity'

    return jsonify({
        'high_severity_probability': round(float(proba), 4),
        'severity_label': label
    })


if __name__ == '__main__':
    print("Starting ML prediction service on http://localhost:5001")
    print("Available endpoints: /health, /predict-sensor-risk, /predict-rainfall-severity")
    app.run(host='0.0.0.0', port=5001, debug=True)
