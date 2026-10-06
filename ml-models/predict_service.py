import numpy as np
from flask import Flask, request, jsonify
import pickle
import pandas as pd
import os
import h5py
import torch
from Networks import unet

app = Flask(__name__)

MODEL_DIR = os.path.dirname(os.path.abspath(__file__))

with open(os.path.join(MODEL_DIR, 'sensor_extratrees_model.pkl'), 'rb') as f:
    sensor_model = pickle.load(f)

with open(os.path.join(MODEL_DIR, 'landslide_rf_model.pkl'), 'rb') as f:
    rainfall_model = pickle.load(f)

SATELLITE_MEAN = [-0.4914, -0.3074, -0.1277, -0.0625, 0.0439, 0.0803, 0.0644, 0.0802, 0.3000, 0.4082, 0.0823, 0.0516, 0.3338, 0.7819]
SATELLITE_STD = [0.9325, 0.8775, 0.8860, 0.8869, 0.8857, 0.8418, 0.8354, 0.8491, 0.9061, 1.6072, 0.8848, 0.9232, 0.9018, 1.2913]

satellite_model = unet(n_classes=2, n_channels=14)
satellite_checkpoint = torch.load(
    os.path.join(MODEL_DIR, 'batch500_F1_5340.pth'), map_location='cpu'
)
satellite_model.load_state_dict(satellite_checkpoint)
satellite_model.eval()

rainfall_columns = rainfall_model.feature_names_in_.tolist()

SENSOR_FEATURES = [
    'soil_moisture_pct',
    'tilt_change_deg',
    'vibration_events_per_hr',
    'pore_pressure_kpa',
    'rainfall_mm_24hr'
]


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'models_loaded': ['sensor_extratrees', 'rainfall_random_forest']
    })


@app.route('/predict-sensor-risk', methods=['POST'])
def predict_sensor_risk():
    data = request.get_json()

    missing = [f for f in SENSOR_FEATURES if f not in data]
    if missing:
        return jsonify({'error': f'Missing required fields: {missing}'}), 400

    row = pd.DataFrame([{f: data[f] for f in SENSOR_FEATURES}])

    proba = sensor_model.predict_proba(row)[0][1]
    label = 'high_risk' if proba >= 0.5 else 'normal'

    return jsonify({
        'risk_probability': round(float(proba), 4),
        'risk_label': label
    })


@app.route('/predict-satellite-risk', methods=['GET'])
def predict_satellite_risk():
    with h5py.File(os.path.join(MODEL_DIR, 'sample_satellite_image.h5'), 'r') as hf:
        image = hf['img'][:]

    image = np.asarray(image, np.float32)
    image = image.transpose((-1, 0, 1))

    for i in range(len(SATELLITE_MEAN)):
        image[i, :, :] -= SATELLITE_MEAN[i]
        image[i, :, :] /= SATELLITE_STD[i]

    image_tensor = torch.from_numpy(image).unsqueeze(0)

    with torch.no_grad():
        logits = satellite_model(image_tensor)
        pred_mask = torch.argmax(logits, dim=1).squeeze(0).numpy()

    total_pixels = pred_mask.size
    landslide_pixels = int(np.sum(pred_mask == 1))
    risk_percentage = round((landslide_pixels / total_pixels) * 100, 2)

    return jsonify({
        'landslide_pixel_percentage': risk_percentage,
        'risk_label': 'high_risk' if risk_percentage > 5 else 'normal',
        'note': 'Using sample validation image, not live satellite feed (planned for December build)'
    })


@app.route('/predict-rainfall-severity', methods=['POST'])
def predict_rainfall_severity():
    data = request.get_json()

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
    print("Available endpoints: /health, /predict-sensor-risk, /predict-satellite-risk, /predict-rainfall-severity")
    app.run(host='0.0.0.0', port=5001, debug=True)