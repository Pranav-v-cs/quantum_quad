import sqlite3
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Lock
from math import isfinite

from flask import Flask, jsonify, request

app = Flask(__name__)

DB_LOCK = Lock()
DB_PATH = Path(__file__).resolve().parent / "data" / "telemetry.db"
MAX_TELEMETRY_ROWS = 5000
MAX_GPS_ROWS = 10000
PREDICTION_FEATURES = ("temperature", "turbidity", "ph", "tds", "dissolved_oxygen")
PREDICTION_TARGETS = ("temperature", "turbidity", "ph", "tds", "do")
PREDICTION_TARGET_TO_INDEX = {
    "temperature": 0,
    "turbidity": 1,
    "ph": 2,
    "tds": 3,
    "do": 4,
}


def _get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DB_LOCK:
        conn = _get_db_connection()
        try:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS telemetry (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    station_id TEXT NOT NULL,
                    temperature REAL NOT NULL,
                    turbidity REAL NOT NULL,
                    ph REAL NOT NULL,
                    tds REAL NOT NULL,
                    dissolved_oxygen REAL NOT NULL,
                    source TEXT NOT NULL CHECK (source IN ('mock', 'sensor')),
                    raw_line TEXT,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS gps_readings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    lat REAL NOT NULL,
                    lng REAL NOT NULL,
                    raw_line TEXT,
                    created_at TEXT NOT NULL
                )
                """
            )
            conn.commit()

            row = conn.execute("SELECT COUNT(*) AS count FROM telemetry").fetchone()
            if row and row["count"] == 0:
                _insert_reading(
                    conn,
                    station_id="QQ-dbafa5-A",
                    temperature=29.44,
                    turbidity=14,
                    ph=6.76,
                    tds=97,
                    dissolved_oxygen=3.82,
                    source="mock",
                    raw_line="Seed mock data",
                )
                _prune_telemetry(conn)
                conn.commit()
        finally:
            conn.close()


def _insert_reading(
    conn,
    *,
    station_id,
    temperature,
    turbidity,
    ph,
    tds,
    dissolved_oxygen,
    source,
    raw_line=None,
):
    created_at = datetime.now(timezone.utc).isoformat()
    cur = conn.execute(
        """
        INSERT INTO telemetry (
            station_id, temperature, turbidity, ph, tds, dissolved_oxygen, source, raw_line, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            station_id,
            float(temperature),
            float(turbidity),
            float(ph),
            float(tds),
            float(dissolved_oxygen),
            source,
            raw_line,
            created_at,
        ),
    )
    return cur.lastrowid


def _serialize_reading(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "station_id": row["station_id"],
        "temperature": row["temperature"],
        "turbidity": row["turbidity"],
        "ph": row["ph"],
        "tds": row["tds"],
        "do": row["dissolved_oxygen"],
        "source": row["source"],
        "raw_line": row["raw_line"],
        "created_at": row["created_at"],
    }


def _insert_gps(conn, *, lat, lng, raw_line=None):
    created_at = datetime.now(timezone.utc).isoformat()
    cur = conn.execute(
        """
        INSERT INTO gps_readings (lat, lng, raw_line, created_at)
        VALUES (?, ?, ?, ?)
        """,
        (float(lat), float(lng), raw_line, created_at),
    )
    return cur.lastrowid


def _serialize_gps(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "lat": row["lat"],
        "lng": row["lng"],
        "raw_line": row["raw_line"],
        "created_at": row["created_at"],
    }


def _prune_telemetry(conn):
    conn.execute(
        """
        DELETE FROM telemetry
        WHERE id NOT IN (
            SELECT id
            FROM telemetry
            ORDER BY id DESC
            LIMIT ?
        )
        """,
        (MAX_TELEMETRY_ROWS,),
    )


def _prune_gps(conn):
    conn.execute(
        """
        DELETE FROM gps_readings
        WHERE id NOT IN (
            SELECT id
            FROM gps_readings
            ORDER BY id DESC
            LIMIT ?
        )
        """,
        (MAX_GPS_ROWS,),
    )


def _distance_sq(a, b):
    return sum((a[i] - b[i]) ** 2 for i in range(len(a)))


def _mean_vector(vectors):
    count = len(vectors)
    if count == 0:
        return []
    width = len(vectors[0])
    return [sum(v[i] for v in vectors) / count for i in range(width)]


def _clip_prediction(point):
    clipped = list(point)
    if len(clipped) != 5:
        return clipped

    # Keep values in plausible physical bounds.
    clipped[0] = max(-5.0, min(60.0, clipped[0]))  # temperature
    clipped[1] = max(0.0, min(2000.0, clipped[1]))  # turbidity
    clipped[2] = max(0.0, min(14.0, clipped[2]))  # pH
    clipped[3] = max(0.0, min(10000.0, clipped[3]))  # TDS
    clipped[4] = max(0.0, min(25.0, clipped[4]))  # dissolved oxygen
    return clipped


def _run_kmeans(vectors, k, max_iter=24):
    # Deterministic centroid bootstrap so results are stable across runs.
    step = max(1, len(vectors) // k)
    centroids = [list(vectors[min(i * step, len(vectors) - 1)]) for i in range(k)]
    labels = [0] * len(vectors)

    for _ in range(max_iter):
        changed = False

        for idx, vector in enumerate(vectors):
            nearest = min(range(k), key=lambda c: _distance_sq(vector, centroids[c]))
            if labels[idx] != nearest:
                labels[idx] = nearest
                changed = True

        for cluster_idx in range(k):
            members = [vectors[i] for i, label in enumerate(labels) if label == cluster_idx]
            if members:
                centroids[cluster_idx] = _mean_vector(members)

        if not changed:
            break

    return labels, centroids


def _percentile(values, ratio):
    if not values:
        return 0.0
    if ratio <= 0:
        return float(min(values))
    if ratio >= 1:
        return float(max(values))

    sorted_values = sorted(values)
    position = ratio * (len(sorted_values) - 1)
    lower = int(position)
    upper = min(len(sorted_values) - 1, lower + 1)
    if lower == upper:
        return float(sorted_values[lower])
    weight = position - lower
    return float(
        sorted_values[lower] * (1.0 - weight) + sorted_values[upper] * weight
    )


def _normalize_target(target):
    if not target:
        return "temperature"
    cleaned = str(target).strip().lower()
    return cleaned if cleaned in PREDICTION_TARGETS else "temperature"


def _iso_to_datetime(value):
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except ValueError:
        return None


def _estimate_step_seconds(rows):
    if len(rows) < 2:
        return 10

    dts = [_iso_to_datetime(row["created_at"]) for row in rows]
    deltas = []
    for i in range(1, len(dts)):
        if dts[i] is None or dts[i - 1] is None:
            continue
        diff = (dts[i] - dts[i - 1]).total_seconds()
        if diff > 0 and isfinite(diff):
            deltas.append(diff)

    if not deltas:
        return 10
    return int(round(sum(deltas) / len(deltas))) or 10


def _build_predictions(rows, horizon, target):
    vectors = []
    for row in rows:
        vector = [float(row[key]) for key in PREDICTION_FEATURES]
        vectors.append(vector)

    if len(vectors) < 12:
        return None, "Need at least 12 historical sensor rows for predictions."

    means = []
    stds = []
    for feature_idx in range(len(PREDICTION_FEATURES)):
        values = [v[feature_idx] for v in vectors]
        mean = sum(values) / len(values)
        variance = sum((value - mean) ** 2 for value in values) / len(values)
        std = variance ** 0.5
        if std == 0:
            std = 1.0
        means.append(mean)
        stds.append(std)

    normalized = [
        [(vector[i] - means[i]) / stds[i] for i in range(len(PREDICTION_FEATURES))]
        for vector in vectors
    ]
    target_idx = PREDICTION_TARGET_TO_INDEX[target]
    historical_target_z = [
        abs((vector[target_idx] - means[target_idx]) / stds[target_idx])
        for vector in vectors
    ]
    anomaly_threshold = max(2.0, _percentile(historical_target_z, 0.95))

    k = max(2, min(6, len(normalized) // 6))
    labels, centroids = _run_kmeans(normalized, k)

    transition_counts = [[0 for _ in range(k)] for _ in range(k)]
    for i in range(len(labels) - 1):
        transition_counts[labels[i]][labels[i + 1]] += 1

    current_cluster = labels[-1]
    current_vector = normalized[-1]
    step_seconds = _estimate_step_seconds(rows)
    base_time = _iso_to_datetime(rows[-1]["created_at"]) or datetime.now(timezone.utc)

    predictions = []
    for step in range(1, horizon + 1):
        transitions = transition_counts[current_cluster]
        if any(transitions):
            next_cluster = max(range(k), key=lambda idx: transitions[idx])
        else:
            next_cluster = current_cluster

        current_centroid = centroids[current_cluster]
        next_centroid = centroids[next_cluster]
        shifted = [
            current_vector[i] + (next_centroid[i] - current_centroid[i])
            for i in range(len(PREDICTION_FEATURES))
        ]
        normalized_pred = [
            (shifted[i] + next_centroid[i]) / 2.0
            for i in range(len(PREDICTION_FEATURES))
        ]
        raw_pred = [
            normalized_pred[i] * stds[i] + means[i] for i in range(len(PREDICTION_FEATURES))
        ]
        raw_pred = _clip_prediction(raw_pred)
        target_anomaly_score = abs(
            (raw_pred[target_idx] - means[target_idx]) / stds[target_idx]
        )
        is_anomaly = target_anomaly_score >= anomaly_threshold

        predictions.append(
            {
                "timestamp": (
                    base_time.replace(microsecond=0)
                    + step * timedelta(seconds=step_seconds)
                ).isoformat(),
                "temperature": round(raw_pred[0], 2),
                "turbidity": round(raw_pred[1], 2),
                "ph": round(raw_pred[2], 2),
                "tds": round(raw_pred[3], 2),
                "do": round(raw_pred[4], 2),
                "cluster": int(next_cluster),
                "anomaly_score": round(float(target_anomaly_score), 3),
                "is_anomaly": bool(is_anomaly),
            }
        )
        current_vector = normalized_pred
        current_cluster = next_cluster
    predicted_anomaly_count = sum(1 for item in predictions if item["is_anomaly"])
    history_anomaly_count = sum(
        1 for score in historical_target_z if score >= anomaly_threshold
    )

    return {
        "model": "kmeans_markov_unsupervised",
        "history_points": len(rows),
        "step_seconds": step_seconds,
        "target": target,
        "anomaly_threshold": round(float(anomaly_threshold), 3),
        "history_anomaly_count": int(history_anomaly_count),
        "predicted_anomaly_count": int(predicted_anomaly_count),
        "predictions": predictions,
    }, None


def _cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


@app.after_request
def after_request(response):
    return _cors(response)


@app.route("/api/readings", methods=["OPTIONS"])
@app.route("/api/readings/latest", methods=["OPTIONS"])
@app.route("/api/predictions", methods=["OPTIONS"])
@app.route("/api/gps", methods=["OPTIONS"])
@app.route("/api/gps/latest", methods=["OPTIONS"])
@app.route("/api/db/details", methods=["OPTIONS"])
@app.route("/health", methods=["OPTIONS"])
def options_handler():
    return _cors(app.response_class(status=204))


@app.get("/health")
def health_check():
    return jsonify({"status": "ok", "message": "Flask backend is running", "port": 9999})


@app.get("/")
def root():
    return jsonify(
        {
            "service": "quantumquad-backend",
            "message": "Backend ready",
            "routes": {
                "post_reading": "/api/readings",
                "latest_reading": "/api/readings/latest",
                "history": "/api/readings?limit=50",
                "predictions": "/api/predictions?horizon=24&limit_history=all&source=sensor&target=temperature",
                "post_gps": "/api/gps",
                "latest_gps": "/api/gps/latest",
                "db_details": "/api/db/details",
            },
        }
    )


@app.post("/api/readings")
def post_reading():
    payload = request.get_json(silent=True) or {}
    station_id = payload.get("station_id", "QQ-dbafa5-A")
    source = payload.get("source", "sensor")
    raw_line = payload.get("raw_line")

    required = ["temperature", "turbidity", "ph", "tds", "do"]
    missing = [key for key in required if payload.get(key) is None]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
    if source not in {"sensor", "mock"}:
        return jsonify({"error": "source must be 'sensor' or 'mock'"}), 400

    try:
        with DB_LOCK:
            conn = _get_db_connection()
            try:
                row_id = _insert_reading(
                    conn,
                    station_id=station_id,
                    temperature=payload["temperature"],
                    turbidity=payload["turbidity"],
                    ph=payload["ph"],
                    tds=payload["tds"],
                    dissolved_oxygen=payload["do"],
                    source=source,
                    raw_line=raw_line,
                )
                _prune_telemetry(conn)
                conn.commit()
                row = conn.execute("SELECT * FROM telemetry WHERE id = ?", (row_id,)).fetchone()
            finally:
                conn.close()
    except (TypeError, ValueError):
        return jsonify({"error": "temperature, turbidity, ph, tds, do must be numeric"}), 400

    return jsonify({"status": "ok", "reading": _serialize_reading(row)}), 201


@app.get("/api/readings/latest")
def get_latest_reading():
    sensor_only = request.args.get("sensor_only", "0") == "1"
    source = request.args.get("source")

    where = []
    values = []
    if sensor_only:
        where.append("source = ?")
        values.append("sensor")
    elif source in {"sensor", "mock"}:
        where.append("source = ?")
        values.append(source)

    sql = "SELECT * FROM telemetry"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY id DESC LIMIT 1"

    with DB_LOCK:
        conn = _get_db_connection()
        try:
            row = conn.execute(sql, values).fetchone()
        finally:
            conn.close()
    return jsonify({"reading": _serialize_reading(row)})


@app.get("/api/readings")
def get_reading_history():
    limit_raw = request.args.get("limit", "50")
    source = request.args.get("source")
    try:
        limit = max(1, min(1000, int(limit_raw)))
    except ValueError:
        limit = 50

    sql = "SELECT * FROM telemetry"
    values = []
    if source in {"sensor", "mock"}:
        sql += " WHERE source = ?"
        values.append(source)
    sql += " ORDER BY id DESC LIMIT ?"
    values.append(limit)

    with DB_LOCK:
        conn = _get_db_connection()
        try:
            rows = conn.execute(sql, values).fetchall()
        finally:
            conn.close()

    return jsonify({"count": len(rows), "readings": [_serialize_reading(row) for row in rows]})


@app.get("/api/predictions")
def get_predictions():
    horizon_raw = request.args.get("horizon", "24")
    limit_raw = request.args.get("limit_history", "all")
    history_preview_raw = request.args.get("history_preview", "16")
    source = request.args.get("source", "sensor")
    target = _normalize_target(request.args.get("target", "temperature"))

    try:
        horizon = max(1, min(96, int(horizon_raw)))
    except ValueError:
        horizon = 24
    use_all_history = str(limit_raw).strip().lower() in {"all", "*", "max"}
    try:
        limit = None if use_all_history else max(20, min(5000, int(limit_raw)))
    except ValueError:
        limit = None
    try:
        history_preview = max(0, min(120, int(history_preview_raw)))
    except ValueError:
        history_preview = 16

    if source != "sensor":
        return jsonify(
            {
                "error": "Predictions currently support source=sensor only.",
                "predictions": [],
            }
        ), 400
    source_filter = "sensor"

    with DB_LOCK:
        conn = _get_db_connection()
        try:
            if limit is None:
                rows = conn.execute(
                    """
                    SELECT *
                    FROM telemetry
                    WHERE source = ?
                    ORDER BY id DESC
                    """,
                    (source_filter,),
                ).fetchall()
            else:
                rows = conn.execute(
                    """
                    SELECT *
                    FROM telemetry
                    WHERE source = ?
                    ORDER BY id DESC
                    LIMIT ?
                    """,
                    (source_filter, limit),
                ).fetchall()
        finally:
            conn.close()

    if not rows:
        return jsonify(
            {
                "error": "No historical readings available for predictions.",
                "predictions": [],
            }
        ), 404

    rows = list(reversed(rows))
    model_out, err = _build_predictions(rows, horizon, target)
    if err:
        return jsonify({"error": err, "predictions": []}), 400

    last = rows[-1]
    history_context = (
        [_serialize_reading(row) for row in rows[-history_preview:]]
        if history_preview > 0
        else []
    )
    return jsonify(
        {
            "model": model_out["model"],
            "source": source_filter,
            "history_points": model_out["history_points"],
            "horizon": horizon,
            "step_seconds": model_out["step_seconds"],
            "target": model_out["target"],
            "anomaly_threshold": model_out["anomaly_threshold"],
            "history_anomaly_count": model_out["history_anomaly_count"],
            "predicted_anomaly_count": model_out["predicted_anomaly_count"],
            "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "last_observation": _serialize_reading(last),
            "history_context": history_context,
            "predictions": model_out["predictions"],
        }
    )


@app.post("/api/gps")
def post_gps():
    payload = request.get_json(silent=True) or {}
    lat = payload.get("lat")
    lng = payload.get("lng")
    raw_line = payload.get("raw_line")

    if lat is None or lng is None:
        return jsonify({"error": "Missing required fields: lat, lng"}), 400

    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        return jsonify({"error": "lat and lng must be numeric"}), 400

    if not (-90 <= lat <= 90):
        return jsonify({"error": "lat must be between -90 and 90"}), 400
    if not (-180 <= lng <= 180):
        return jsonify({"error": "lng must be between -180 and 180"}), 400

    with DB_LOCK:
        conn = _get_db_connection()
        try:
            row_id = _insert_gps(conn, lat=lat, lng=lng, raw_line=raw_line)
            _prune_gps(conn)
            conn.commit()
            row = conn.execute("SELECT * FROM gps_readings WHERE id = ?", (row_id,)).fetchone()
        finally:
            conn.close()

    return jsonify({"status": "ok", "gps": _serialize_gps(row)}), 201


@app.get("/api/gps/latest")
def get_latest_gps():
    with DB_LOCK:
        conn = _get_db_connection()
        try:
            row = conn.execute("SELECT * FROM gps_readings ORDER BY id DESC LIMIT 1").fetchone()
        finally:
            conn.close()
    return jsonify({"gps": _serialize_gps(row)})


@app.get("/api/db/details")
def get_db_details():
    with DB_LOCK:
        conn = _get_db_connection()
        try:
            table_exists = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='telemetry'"
            ).fetchone()
            if not table_exists:
                return jsonify(
                    {
                        "db_path": str(DB_PATH),
                        "db_exists": DB_PATH.exists(),
                        "table_exists": False,
                        "error": "telemetry table does not exist",
                    }
                ), 404

            schema_rows = conn.execute("PRAGMA table_info(telemetry)").fetchall()
            schema = [
                {
                    "cid": row["cid"],
                    "name": row["name"],
                    "type": row["type"],
                    "notnull": bool(row["notnull"]),
                    "default": row["dflt_value"],
                    "pk": bool(row["pk"]),
                }
                for row in schema_rows
            ]

            total = conn.execute("SELECT COUNT(*) AS c FROM telemetry").fetchone()["c"]
            sensor_count = conn.execute(
                "SELECT COUNT(*) AS c FROM telemetry WHERE source = 'sensor'"
            ).fetchone()["c"]
            mock_count = conn.execute(
                "SELECT COUNT(*) AS c FROM telemetry WHERE source = 'mock'"
            ).fetchone()["c"]

            first_row = conn.execute(
                "SELECT id, created_at FROM telemetry ORDER BY id ASC LIMIT 1"
            ).fetchone()
            latest_row = conn.execute(
                "SELECT id, created_at FROM telemetry ORDER BY id DESC LIMIT 1"
            ).fetchone()

            latest_samples = conn.execute(
                """
                SELECT * FROM telemetry
                ORDER BY id DESC
                LIMIT 10
                """
            ).fetchall()
        finally:
            conn.close()

    return jsonify(
        {
            "db_path": str(DB_PATH),
            "db_exists": DB_PATH.exists(),
            "table_exists": True,
            "retention_max_rows": MAX_TELEMETRY_ROWS,
            "table": "telemetry",
            "schema": schema,
            "stats": {
                "total_rows": total,
                "sensor_rows": sensor_count,
                "mock_rows": mock_count,
                "oldest": {
                    "id": first_row["id"] if first_row else None,
                    "created_at": first_row["created_at"] if first_row else None,
                },
                "latest": {
                    "id": latest_row["id"] if latest_row else None,
                    "created_at": latest_row["created_at"] if latest_row else None,
                },
            },
            "latest_samples": [_serialize_reading(row) for row in latest_samples],
        }
    )


_init_db()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=9999, debug=True)
