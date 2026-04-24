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
