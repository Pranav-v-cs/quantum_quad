# Backend (Flask)

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
python app.py
```

Backend runs on `http://localhost:9999`.

## Data Storage

- SQLite DB: `backend/data/telemetry.db`
- Table: `telemetry`
- Stores both `mock` and `sensor` readings
- Retention: keeps latest `5000` rows, deletes older rows automatically after inserts
- GPS table: `gps_readings`
- GPS retention: keeps latest `10000` rows

## API

### `POST /api/readings`

Expected JSON payload:

```json
{
  "station_id": "QQ-dbafa5-A",
  "temperature": 29.44,
  "turbidity": 14,
  "ph": 6.76,
  "tds": 97,
  "do": 3.82,
  "source": "sensor",
  "raw_line": "Temperature: 29.44 °C | Turbidity: 14 NTU | pH: 6.76 | TDS: 97 ppm | DO: 3.82 mg/L."
}
```

### `GET /api/readings/latest?sensor_only=1`

- Returns latest sensor reading only.
- Frontend uses this endpoint every 10 seconds.

### `GET /api/readings?limit=50`

- Returns history for charts/debugging.
- Optional: `source=sensor` or `source=mock`.

### `GET /api/predictions?horizon=24&limit_history=all&history_preview=16&source=sensor&target=temperature`

- Returns unsupervised forecast points from sensor history.
- `limit_history=all` uses all available sensor points in DB.
- `history_preview` controls how many recent historical points are returned for chart overlay.
- `target` options: `temperature`, `turbidity`, `ph`, `tds`, `do`.
- Includes anomaly fields (`is_anomaly`, `anomaly_score`) for each forecast point.

### `POST /api/gps`

Expected JSON payload:

```json
{
  "lat": 11.016844,
  "lng": 76.955833,
  "raw_line": "{\"lat\":11.016844,\"lng\":76.955833}"
}
```

### `GET /api/gps/latest`

- Returns latest GPS fix.
- Frontend add-pond flow auto-reads this endpoint.

## GPS Serial Bridge

`gps_bridge.py` reads JSON GPS lines from serial and pushes to backend.

```bash
python gps_bridge.py --port /dev/cu.usbmodem1101 --baud 9600
```

Arduino serial output should be JSON per line, for example:

```json
{"lat":11.016844,"lng":76.955833}
```
