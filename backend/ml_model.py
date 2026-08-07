"""
APEMS ML Endurance Predictor
================================
A GradientBoostingRegressor + GradientBoostingClassifier trained on real
flight/simulation data from training_data.csv to:

  1. Predict UAV endurance (minutes) from four design variables.
  2. Classify the limiting resource (battery vs hydrogen).

Both models are retrained whenever training_data.csv is available.
If the CSV cannot be found, the code falls back to generating 1,000
synthetic samples from the physics engine — ensuring the backend always
starts even without the CSV present.

Training data columns (CSV):
  battery_kwh, fc_kw, h2_kg, fuel_kg, endurance_hours, limiting_resource
  (fuel_kg is an alias for jeta_kg throughout the API)

When real bench / flight-test data become available, simply replace
training_data.csv and delete model.pkl / scaler.pkl / classifier.pkl
so they are retrained on the next server start.
"""

import os
import pickle
import numpy as np

# ── File paths ─────────────────────────────────────────────────────────────────
_DIR            = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH      = os.path.join(_DIR, "model.pkl")
SCALER_PATH     = os.path.join(_DIR, "scaler.pkl")
CLASSIFIER_PATH = os.path.join(_DIR, "classifier.pkl")

# Primary CSV location; also checked relative to the backend directory
_DEFAULT_CSV_LOCATIONS = [
    os.path.join(_DIR, "training_data.csv"),
    os.path.join(os.path.dirname(_DIR), "training_data.csv"),
    os.path.join(os.getcwd(), "training_data.csv"),
]

# ── Feature / label column names ──────────────────────────────────────────────
_FEATURE_COLS  = ["battery_kwh", "fc_kw", "h2_kg", "fuel_kg"]
_TARGET_COL    = "endurance_hours"   # → converted to minutes internally
_CLASS_COL     = "limiting_resource" # "battery" | "hydrogen"

# ── Class mapping (must stay consistent across train/predict) ──────────────────
CLASS_MAP   = {"battery": 0, "hydrogen": 1}
CLASS_NAMES = {v: k for k, v in CLASS_MAP.items()}

# ── Fallback synthetic-data ranges (only used when CSV is absent) ─────────────
_FALLBACK_RANGES = {
    "battery_kwh": (5.0,  100.0),
    "fc_kw":       (5.0,   60.0),
    "h2_kg":       (0.5,   30.0),
    "fuel_kg":     (2.0,   80.0),
}
_N_FALLBACK = 1000


# ─────────────────────────────────────────────────────────────────────────────
# Data loading
# ─────────────────────────────────────────────────────────────────────────────

def _find_csv() -> str | None:
    """Return the first CSV path that exists, or None."""
    for path in _DEFAULT_CSV_LOCATIONS:
        if os.path.exists(path):
            return path
    return None


def _load_training_data(csv_path: str) -> tuple:
    """
    Read training_data.csv and return (X, y_reg, y_cls) numpy arrays.

    X       : float (N, 4) — [battery_kwh, fc_kw, h2_kg, fuel_kg]
    y_reg   : float (N,)   — endurance_min  (CSV stores endurance_hours × 60)
    y_cls   : int   (N,)   — 0 = battery, 1 = hydrogen
    """
    import csv

    X, y_reg, y_cls = [], [], []
    with open(csv_path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            try:
                features = [float(row[c]) for c in _FEATURE_COLS]
                end_hr   = float(row[_TARGET_COL])
                label    = row[_CLASS_COL].strip().lower()
                if label not in CLASS_MAP:
                    continue  # skip malformed rows
            except (KeyError, ValueError):
                continue
            X.append(features)
            y_reg.append(end_hr * 60.0)          # convert hours → minutes
            y_cls.append(CLASS_MAP[label])

    n = len(X)
    print(f"[APEMS ML] Loaded {n} rows from {csv_path}")
    return (
        np.array(X,     dtype=float),
        np.array(y_reg, dtype=float),
        np.array(y_cls, dtype=int),
    )


def _generate_fallback_data() -> tuple:
    """
    Produce (X, y_reg, y_cls) by sampling the physics engine.
    Used only when training_data.csv is not found.
    """
    from physics_engine import simulate

    rng = np.random.default_rng(seed=42)
    X, y_reg, y_cls = [], [], []

    for _ in range(_N_FALLBACK):
        bat  = rng.uniform(*_FALLBACK_RANGES["battery_kwh"])
        fc   = rng.uniform(*_FALLBACK_RANGES["fc_kw"])
        h2   = rng.uniform(*_FALLBACK_RANGES["h2_kg"])
        fuel = rng.uniform(*_FALLBACK_RANGES["fuel_kg"])
        res  = simulate(bat, fc, h2, fuel)
        X.append([bat, fc, h2, fuel])
        y_reg.append(res["endurance_min"])
        # Determine limiting resource from the most-depleted resource at
        # mission end (physics_engine.simulate always runs the full mission).
        summ = res.get("summary", {})
        soc_pct  = summ.get("final_soc", 100.0)
        h2_pct   = summ.get("final_h2_kg", 0.0) / max(h2, 1e-9) * 100.0
        fuel_pct = summ.get("final_jeta_kg", 0.0) / max(fuel, 1e-9) * 100.0
        # The resource with the lowest remaining percentage is the limiter
        if h2_pct <= fuel_pct and h2_pct <= soc_pct:
            cls = 1  # hydrogen
        else:
            cls = 0  # battery
        y_cls.append(cls)

    print(f"[APEMS ML] Generated {_N_FALLBACK} synthetic samples (CSV not found).")
    return (
        np.array(X,     dtype=float),
        np.array(y_reg, dtype=float),
        np.array(y_cls, dtype=int),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Training
# ─────────────────────────────────────────────────────────────────────────────

def _train() -> tuple:
    """
    Train regressor + classifier, persist both to disk, return
    (model, scaler, classifier).
    """
    from sklearn.ensemble import GradientBoostingRegressor, GradientBoostingClassifier
    from sklearn.preprocessing import StandardScaler

    csv_path = _find_csv()
    if csv_path:
        X, y_reg, y_cls = _load_training_data(csv_path)
    else:
        print("[APEMS ML] training_data.csv not found — using synthetic fallback.")
        X, y_reg, y_cls = _generate_fallback_data()

    # ── Scale features (shared scaler for both models) ────────────────────────
    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    # Store training-data min/max for OOD checks (StandardScaler has no data_min_/data_max_)
    scaler.fit_min = np.min(X, axis=0)
    scaler.fit_max = np.max(X, axis=0)

    # ── Regressor — predict endurance_min ────────────────────────────────────
    print("[APEMS ML] Training endurance regressor …")
    model = GradientBoostingRegressor(
        n_estimators=300,
        learning_rate=0.05,
        max_depth=4,
        subsample=0.8,
        min_samples_leaf=3,
        validation_fraction=0.1,
        n_iter_no_change=20,
        random_state=42,
    )
    model.fit(X_scaled, y_reg)
    y_pred = model.predict(X_scaled)
    rmse   = float(np.sqrt(np.mean((y_reg - y_pred) ** 2)))
    print(f"[APEMS ML] Regressor trained — train RMSE = {rmse:.2f} min")

    # ── Classifier — predict limiting_resource ────────────────────────────────
    print("[APEMS ML] Training limiting-resource classifier …")
    classifier = GradientBoostingClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=3,
        subsample=0.8,
        random_state=42,
    )
    classifier.fit(X_scaled, y_cls)
    acc = float(np.mean(classifier.predict(X_scaled) == y_cls)) * 100
    print(f"[APEMS ML] Classifier trained — train accuracy = {acc:.1f}%")

    # ── Persist ──────────────────────────────────────────────────────────────
    with open(MODEL_PATH,      "wb") as f: pickle.dump(model,      f)
    with open(SCALER_PATH,     "wb") as f: pickle.dump(scaler,     f)
    with open(CLASSIFIER_PATH, "wb") as f: pickle.dump(classifier, f)
    print(f"[APEMS ML] Artifacts saved to {_DIR}")

    return model, scaler, classifier


# ─────────────────────────────────────────────────────────────────────────────
# Public API
# ─────────────────────────────────────────────────────────────────────────────

def load_model() -> tuple:
    """
    Load model + scaler + classifier from disk, training first if they
    don't all exist.  Returns (model, scaler, classifier).
    """
    all_exist = all(
        os.path.exists(p)
        for p in (MODEL_PATH, SCALER_PATH, CLASSIFIER_PATH)
    )
    if all_exist:
        with open(MODEL_PATH,      "rb") as f: model      = pickle.load(f)
        with open(SCALER_PATH,     "rb") as f: scaler     = pickle.load(f)
        with open(CLASSIFIER_PATH, "rb") as f: classifier = pickle.load(f)
        print("[APEMS ML] Model, scaler, and classifier loaded from disk.")
        return model, scaler, classifier
    return _train()


def predict(
    model,
    scaler,
    classifier,
    battery_kwh: float,
    fc_kw: float,
    h2_kg: float,
    jeta_kg: float,
) -> dict:
    """
    Return instant ML-predicted endurance + limiting resource.

    Parameters
    ----------
    model       : trained GradientBoostingRegressor
    scaler      : fitted StandardScaler
    classifier  : trained GradientBoostingClassifier (or None → skipped)
    battery_kwh : battery energy capacity (kWh)
    fc_kw       : fuel-cell rated power (kW)
    h2_kg       : hydrogen mass on-board (kg)
    jeta_kg     : Jet-A1 fuel mass on-board (kg)  — aliased as fuel_kg in CSV

    Returns
    -------
    dict with keys:
        predicted_endurance_min   – float
        predicted_endurance_hr    – float
        sigma_min                 – ±uncertainty estimate (min)
        limiting_resource         – "battery" | "hydrogen" | "unknown"
        resource_confidence_pct   – float 0–100 (classifier probability)
        ood_warning               – bool (True if inputs outside training range)
    """
    from physics_engine import TOTAL_MISSION_MIN

    # ── Out-of-distribution check ─────────────────────────────────────────────
    # Use scaler.fit_min/_fit_max (set during _train) so bounds always match
    # whatever CSV was used to train. A 10 % tolerance buffer avoids spurious
    # warnings for inputs that are near — but not outside — the training distribution.
    _OOD_BUFFER = 0.10
    x_vec = np.array([battery_kwh, fc_kw, h2_kg, jeta_kg], dtype=float)
    train_min = getattr(scaler, "fit_min", None)
    train_max = getattr(scaler, "fit_max", None)
    if train_min is not None and train_max is not None:
        lo = train_min * (1 - _OOD_BUFFER)   # allow 10 % below training min
        hi = train_max * (1 + _OOD_BUFFER)   # allow 10 % above training max
        ood = bool(np.any(x_vec < lo) or np.any(x_vec > hi))
    else:
        ood = False

    X   = np.array([[battery_kwh, fc_kw, h2_kg, jeta_kg]], dtype=float)
    Xs  = scaler.transform(X)

    # ── Endurance regression ───────────────────────────────────────────────────
    pred  = float(model.predict(Xs)[0])
    pred  = max(0.0, min(pred, float(TOTAL_MISSION_MIN)))
    sigma = pred * 0.065    # ≈ 6.5 % model uncertainty

    # ── Limiting-resource classification ─────────────────────────────────────
    if classifier is not None:
        proba      = classifier.predict_proba(Xs)[0]   # [P(battery), P(hydrogen)]
        cls_idx    = int(np.argmax(proba))
        lim_res    = CLASS_NAMES[cls_idx]
        confidence = float(proba[cls_idx]) * 100.0
    else:
        lim_res    = "unknown"
        confidence = 0.0

    return {
        "predicted_endurance_min": round(pred,  2),
        "predicted_endurance_hr":  round(pred / 60.0, 3),
        "sigma_min":               round(sigma, 2),
        "limiting_resource":       lim_res,
        "resource_confidence_pct": round(confidence, 1),
        "ood_warning":             ood,
    }
