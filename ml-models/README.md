# ML Models — SurakshaNER

This folder contains the trained machine learning models for SurakshaNER's
multi-modal risk fusion architecture, plus a small Python service so our
Node.js backend can call them.

## What's in here

| File | What it is |
|---|---|
| `sensor_extratrees_model.pkl` | ExtraTrees classifier, trained on simulated sensor readings grounded in published field thresholds (Kerala LoRa IoT study, Joginder Nagar Himalayan study). Test accuracy: 91.2%, AUC: 0.906 |
| `landslide_rf_model.pkl` | Random Forest classifier, trained on the NASA Global Landslide Catalog (rainfall-triggered subset). Test accuracy: 71.6%, AUC: 0.665 |
| `sensor_model_columns.csv` | Feature importance + column reference for the sensor model |
| `rainfall_model_columns.csv` | Feature importance + exact column order the rainfall model expects (needed for one-hot encoding alignment) |
| `predict_service.py` | Flask microservice exposing both models as HTTP endpoints |
| `requirements.txt` | Python dependencies for this service |

## Status (as of this build)

- Models are real, trained on real/grounded data — not placeholders
- Service is standalone — **not yet called from `server.js`**
- Satellite model (U-Net / Landslide4Sense) currently lives separately as a
  Colab notebook, not yet part of this service — planned addition
- Stacking fusion layer (combining all three models into one final score)
  not yet implemented — planned for grand finale build phase

## How to run this locally

```bash
cd ml-models
pip install -r requirements.txt
python predict_service.py
```

Service starts at `http://localhost:5001`. Test it's alive:

```bash
curl http://localhost:5001/health
```

## Next steps (December build phase)

1. Add the trained U-Net/ResU-Net model + a `/predict-satellite-risk` endpoint
2. Build the stacking meta-model combining all three models' outputs
3. Wire `server.js` to call this service instead of (or alongside) the
   current hardcoded z-score/blend logic in `calculateRiskForSensor`
4. Replace rainfall model's NASA-catalog training data with real
   Open-Meteo historical rainfall intensity data for better accuracy
5. Replace simulated sensor training data with real sensor logs, once
   enough real deployment history exists
