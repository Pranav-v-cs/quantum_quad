import sqlite3
import os
import base64
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Lock

from flask import Flask, jsonify, request
import requests

app = Flask(__name__)

DB_LOCK = Lock()
DB_PATH = Path(__file__).resolve().parent / "data" / "telemetry.db"
MAX_TELEMETRY_ROWS = 5000
MAX_GPS_ROWS = 10000
MAX_CAMERA_FRAME_BYTES = 300 * 1024
CAMERA_REFRESH_MIN_SECONDS = 0.25
ESP_CAM_STREAM_URL = (os.getenv("ESP_CAM_STREAM_URL") or "").strip()

CAMERA_LOCK = Lock()
LATEST_CAMERA_FRAME = {
    "camera_id": None,
    "created_at": None,
    "content_type": None,
    "bytes": None,
    "fetched_at": None,
    "source": None,
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
                    raw_turbidity REAL,
                    ph REAL NOT NULL,
                    tds REAL NOT NULL,
                    dissolved_oxygen REAL NOT NULL,
                    source TEXT NOT NULL CHECK (source IN ('mock', 'sensor')),
                    raw_line TEXT,
                    created_at TEXT NOT NULL
                )
                """
            )
            cols = conn.execute("PRAGMA table_info(telemetry)").fetchall()
            col_names = {row["name"] for row in cols}
            if "raw_turbidity" not in col_names:
                conn.execute("ALTER TABLE telemetry ADD COLUMN raw_turbidity REAL")
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
                    raw_turbidity=None,
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
    raw_turbidity,
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
            station_id, temperature, turbidity, raw_turbidity, ph, tds, dissolved_oxygen, source, raw_line, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            station_id,
            float(temperature),
            float(turbidity),
            float(raw_turbidity) if raw_turbidity is not None else None,
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
        "raw_turbidity": row["raw_turbidity"] if "raw_turbidity" in row.keys() else None,
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


def _prediction_target_column(target):
    key = str(target or "").strip().lower()
    mapping = {
        "temperature": "temperature",
        "turbidity": "turbidity",
        "ph": "ph",
        "tds": "tds",
        "do": "dissolved_oxygen",
    }
    return key, mapping.get(key)


def _safe_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _estimate_step_seconds(rows):
    if len(rows) < 2:
        return 60
    deltas = []
    prev = None
    for row in rows:
        dt = datetime.fromisoformat(row["created_at"])
        if prev is not None:
            delta = int((dt - prev).total_seconds())
            if delta > 0:
                deltas.append(delta)
        prev = dt
    if not deltas:
        return 60
    deltas.sort()
    return deltas[len(deltas) // 2]


def _cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


def _extract_jpeg_from_chunk(chunk):
    start = chunk.find(b"\xff\xd8")
    if start == -1:
        return None
    end = chunk.find(b"\xff\xd9", start + 2)
    if end == -1:
        return None
    jpeg = chunk[start : end + 2]
    if not jpeg:
        return None
    if len(jpeg) > MAX_CAMERA_FRAME_BYTES:
        return None
    return jpeg


def _pull_frame_from_stream(url):
    with requests.get(url, stream=True, timeout=(3, 8)) as response:
        response.raise_for_status()
        for chunk in response.iter_content(chunk_size=16 * 1024):
            if not chunk:
                continue
            jpeg = _extract_jpeg_from_chunk(chunk)
            if jpeg:
                return jpeg
    return None


def _refresh_camera_frame_if_needed(force=False):
    if not ESP_CAM_STREAM_URL:
        return False, "ESP_CAM_STREAM_URL is not configured"

    now = datetime.now(timezone.utc)
    with CAMERA_LOCK:
        fetched_at = LATEST_CAMERA_FRAME["fetched_at"]
        if (
            not force
            and fetched_at is not None
            and (now - fetched_at).total_seconds() < CAMERA_REFRESH_MIN_SECONDS
            and LATEST_CAMERA_FRAME["bytes"]
        ):
            return True, None

    try:
        frame = _pull_frame_from_stream(ESP_CAM_STREAM_URL)
    except requests.RequestException as exc:
        return False, f"Failed to reach ESP stream: {exc}"

    if not frame:
        return False, "No JPEG frame found in stream response"

    created_at = datetime.now(timezone.utc).isoformat()
    with CAMERA_LOCK:
        LATEST_CAMERA_FRAME["camera_id"] = "QQ-CAM-01"
        LATEST_CAMERA_FRAME["created_at"] = created_at
        LATEST_CAMERA_FRAME["content_type"] = "image/jpeg"
        LATEST_CAMERA_FRAME["bytes"] = frame
        LATEST_CAMERA_FRAME["fetched_at"] = datetime.now(timezone.utc)
        LATEST_CAMERA_FRAME["source"] = ESP_CAM_STREAM_URL

    return True, None


@app.after_request
def after_request(response):
    return _cors(response)


@app.route("/api/readings", methods=["OPTIONS"])
@app.route("/api/readings/latest", methods=["OPTIONS"])
@app.route("/api/gps", methods=["OPTIONS"])
@app.route("/api/gps/latest", methods=["OPTIONS"])
@app.route("/api/predictions", methods=["OPTIONS"])
@app.route("/api/calibration/turbidity/latest", methods=["OPTIONS"])
@app.route("/api/camera/frame", methods=["OPTIONS"])
@app.route("/api/camera/frame/latest", methods=["OPTIONS"])
@app.route("/api/camera/source", methods=["OPTIONS"])
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
                "turbidity_calibration": "/api/calibration/turbidity/latest?window=30",
                "post_gps": "/api/gps",
                "latest_gps": "/api/gps/latest",
                "post_camera_frame": "/api/camera/frame?camera_id=QQ-CAM-01",
                "latest_camera_frame": "/api/camera/frame/latest",
                "camera_source": "/api/camera/source",
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
    raw_turbidity = payload.get("raw_turbidity")

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
                    raw_turbidity=raw_turbidity,
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

    if source == "sensor":
        print(
            "[CAL] station=%s raw_turbidity=%s turbidity_ntu=%s created_at=%s"
            % (
                row["station_id"],
                row["raw_turbidity"],
                row["turbidity"],
                row["created_at"],
            )
        )

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


@app.get("/api/calibration/turbidity/latest")
def get_turbidity_calibration_latest():
    try:
        window = max(1, min(500, int(request.args.get("window", "30"))))
    except ValueError:
        window = 30

    with DB_LOCK:
        conn = _get_db_connection()
        try:
            latest = conn.execute(
                """
                SELECT *
                FROM telemetry
                WHERE source = 'sensor' AND raw_turbidity IS NOT NULL
                ORDER BY id DESC
                LIMIT 1
                """
            ).fetchone()
            rows = conn.execute(
                """
                SELECT raw_turbidity, turbidity, created_at
                FROM telemetry
                WHERE source = 'sensor' AND raw_turbidity IS NOT NULL
                ORDER BY id DESC
                LIMIT ?
                """,
                (window,),
            ).fetchall()
        finally:
            conn.close()

    if not latest:
        return jsonify({"error": "No sensor rows with raw_turbidity yet", "latest": None}), 404

    raw_values = [float(r["raw_turbidity"]) for r in rows if r["raw_turbidity"] is not None]
    ntu_values = [float(r["turbidity"]) for r in rows if r["turbidity"] is not None]
    avg_raw = (sum(raw_values) / len(raw_values)) if raw_values else None
    avg_ntu = (sum(ntu_values) / len(ntu_values)) if ntu_values else None

    return jsonify(
        {
            "latest": _serialize_reading(latest),
            "window": window,
            "window_count": len(rows),
            "raw_turbidity_avg": round(avg_raw, 3) if avg_raw is not None else None,
            "turbidity_avg": round(avg_ntu, 3) if avg_ntu is not None else None,
        }
    )


@app.get("/api/predictions")
def get_predictions():
    target_key, target_col = _prediction_target_column(request.args.get("target", "temperature"))
    if not target_col:
        return jsonify({"error": "target must be one of: temperature, turbidity, ph, tds, do"}), 400

    source = str(request.args.get("source", "sensor")).strip().lower()
    if source not in {"sensor", "mock", "all"}:
        source = "sensor"

    try:
        horizon = max(1, min(200, int(request.args.get("horizon", "24"))))
    except ValueError:
        horizon = 24

    limit_history_raw = str(request.args.get("limit_history", "all")).strip().lower()
    history_preview_raw = str(request.args.get("history_preview", "16")).strip()
    try:
        history_preview = max(1, min(200, int(history_preview_raw)))
    except ValueError:
        history_preview = 16

    where = []
    values = []
    if source in {"sensor", "mock"}:
        where.append("source = ?")
        values.append(source)

    sql = "SELECT * FROM telemetry"
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY id DESC"
    if limit_history_raw != "all":
        try:
            limit_history = max(2, min(10000, int(limit_history_raw)))
        except ValueError:
            limit_history = 500
        sql += " LIMIT ?"
        values.append(limit_history)

    with DB_LOCK:
        conn = _get_db_connection()
        try:
            rows_desc = conn.execute(sql, values).fetchall()
        finally:
            conn.close()

    rows = list(reversed(rows_desc))
    if len(rows) < 2:
        return (
            jsonify(
                {
                    "error": "Need at least 2 historical readings for predictions",
                    "history_points": len(rows),
                    "horizon": horizon,
                    "target": target_key,
                }
            ),
            400,
        )

    history_values = []
    for row in rows:
        val = _safe_float(row[target_col])
        if val is not None:
            history_values.append(val)
    if len(history_values) < 2:
        return jsonify({"error": "Insufficient numeric history for selected target"}), 400

    step_seconds = _estimate_step_seconds(rows)
    last_row = rows[-1]
    last_value = float(last_row[target_col])

    lookback = min(12, len(history_values) - 1)
    deltas = []
    for idx in range(len(history_values) - lookback, len(history_values)):
        if idx <= 0:
            continue
        deltas.append(history_values[idx] - history_values[idx - 1])
    avg_delta = sum(deltas) / len(deltas) if deltas else 0.0

    mean = sum(history_values) / len(history_values)
    variance = sum((v - mean) ** 2 for v in history_values) / max(1, len(history_values) - 1)
    std = variance ** 0.5
    anomaly_threshold = 2.5

    ts = datetime.fromisoformat(last_row["created_at"])
    predictions = []
    predicted_anomaly_count = 0
    for i in range(1, horizon + 1):
        predicted = last_value + avg_delta * i
        next_ts = ts + timedelta(seconds=step_seconds * i)
        z = 0.0 if std == 0 else (predicted - mean) / std
        is_anomaly = abs(z) > anomaly_threshold
        if is_anomaly:
            predicted_anomaly_count += 1
        predictions.append(
            {
                "timestamp": next_ts.isoformat(),
                target_key: round(predicted, 4),
                "z_score": round(z, 4),
                "is_anomaly": is_anomaly,
            }
        )

    history_context = [_serialize_reading(row) for row in rows[-history_preview:]]
    return jsonify(
        {
            "history_points": len(rows),
            "horizon": horizon,
            "step_seconds": step_seconds,
            "target": target_key,
            "anomaly_threshold": anomaly_threshold,
            "history_anomaly_count": 0,
            "predicted_anomaly_count": predicted_anomaly_count,
            "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "last_observation": _serialize_reading(last_row),
            "history_context": history_context,
            "predictions": predictions,
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


@app.post("/api/camera/frame")
def post_camera_frame():
    return (
        jsonify(
            {
                "error": "Push upload is disabled. Configure ESP_CAM_STREAM_URL and use /api/camera/frame/latest",
                "configured_stream": bool(ESP_CAM_STREAM_URL),
            }
        ),
        410,
    )


@app.get("/api/camera/source")
def get_camera_source():
    return jsonify(
        {
            "configured": bool(ESP_CAM_STREAM_URL),
            "stream_url": ESP_CAM_STREAM_URL or None,
            "mode": "backend_pull",
        }
    )


@app.get("/api/camera/frame/latest")
def get_latest_camera_frame():
    ok, err = _refresh_camera_frame_if_needed(force=False)
    if not ok:
        return (
            jsonify(
                {
                    "configured": bool(ESP_CAM_STREAM_URL),
                    "frame": None,
                    "error": err,
                }
            ),
            502 if ESP_CAM_STREAM_URL else 404,
        )

    with CAMERA_LOCK:
        if not LATEST_CAMERA_FRAME["bytes"]:
            return jsonify({"configured": False, "frame": None}), 404
        frame_payload = {
            "camera_id": LATEST_CAMERA_FRAME["camera_id"],
            "created_at": LATEST_CAMERA_FRAME["created_at"],
            "content_type": LATEST_CAMERA_FRAME["content_type"],
            "bytes": len(LATEST_CAMERA_FRAME["bytes"]),
            "data_base64": base64.b64encode(LATEST_CAMERA_FRAME["bytes"]).decode("ascii"),
            "source": LATEST_CAMERA_FRAME["source"],
        }
    return jsonify({"configured": True, "frame": frame_payload})


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
