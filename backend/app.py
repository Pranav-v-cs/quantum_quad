import sqlite3
import os
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock

import requests
from flask import Flask, Response, jsonify, request, stream_with_context

app = Flask(__name__)

DB_LOCK = Lock()
DB_PATH = Path(__file__).resolve().parent / "data" / "telemetry.db"
MAX_TELEMETRY_ROWS = 5000
MAX_GPS_ROWS = 10000
CAMERA_STREAM_URL = "http://192.168.1.9:81/stream"


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
@app.route("/api/gps", methods=["OPTIONS"])
@app.route("/api/gps/latest", methods=["OPTIONS"])
@app.route("/api/camera/stream-url", methods=["OPTIONS"])
@app.route("/api/camera/stream", methods=["OPTIONS"])
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
                "post_gps": "/api/gps",
                "latest_gps": "/api/gps/latest",
                "camera_stream_url": "/api/camera/stream-url",
                "camera_stream_proxy": "/api/camera/stream",
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


@app.get("/api/camera/stream-url")
def get_camera_stream_url():
    stream_url = CAMERA_STREAM_URL or None
    return jsonify(
        {
            "stream_url": stream_url,
            "proxy_url": "/api/camera/stream" if stream_url else None,
            "configured": bool(stream_url),
        }
    )


@app.get("/api/camera/stream")
def proxy_camera_stream():
    if not CAMERA_STREAM_URL:
        return jsonify(
            {
                "error": "ESP32_CAM_STREAM_URL is not configured",
                "hint": "Set ESP32_CAM_STREAM_URL (example: http://192.168.1.55:81/stream)",
            }
        ), 400

    try:
        upstream = requests.get(CAMERA_STREAM_URL, stream=True, timeout=(4, 20))
    except requests.RequestException as exc:
        return jsonify({"error": f"Failed to connect camera stream: {exc}"}), 502

    content_type = upstream.headers.get("Content-Type", "multipart/x-mixed-replace; boundary=frame")

    @stream_with_context
    def generate():
        try:
            for chunk in upstream.iter_content(chunk_size=16 * 1024):
                if chunk:
                    yield chunk
        finally:
            upstream.close()

    return Response(generate(), status=upstream.status_code, content_type=content_type)


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
