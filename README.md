# Quantum Quad

Water quality monitoring project with:

- Sensor firmware (`ino files/main.ino`) that reads pH, turbidity, TDS, DO, temperature
- ESP32 bridge firmware (`ino files/esp32_interfacing.ino`) that posts readings to backend
- ESP32-CAM streaming firmware (`ino files/esp32_cam_live_stream.ino`) for live MJPEG feed
- Flask backend (`backend/`) that stores telemetry in SQLite and serves APIs
- Vite frontend dashboard (`frontend/`) that visualizes live readings

## Repository Structure

- `frontend/` React + Vite dashboard
- `backend/` Flask API + SQLite persistence
- `ino files/` Arduino + ESP32 firmware files
- `.env` Local secrets and environment variables (gitignored)

## Data Flow

1. Arduino (`main.ino`) reads sensor values.
2. Arduino sends a formatted line over serial.
3. ESP32 (`esp32_interfacing.ino`) parses the line and sends JSON to backend:
   - `POST /api/readings`
4. ESP32-CAM serves MJPEG stream over HTTP:
   - `http://<esp32-ip>:81/stream`
5. Backend can expose stream config and proxy:
   - `GET /api/camera/stream-url`
   - `GET /api/camera/stream`
6. Backend stores readings in `backend/data/telemetry.db`.
7. Frontend polls backend every 10 seconds using:
   - `GET /api/readings/latest?sensor_only=1`
6. Frontend polls prediction endpoint for forecast points:
   - `GET /api/predictions?horizon=24&limit_history=all&history_preview=16&source=sensor&target=temperature`

## Prerequisites

- Python 3.10+
- Node.js 18+
- Arduino IDE / PlatformIO for firmware flashing
- ESP32 board support installed in Arduino IDE

## Environment Variables

Root `.env` is for local secrets and credentials.

Current keys:

- `WIFI_SSID`
- `WIFI_PASSWORD`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `OPENAI_API_KEY`
- `JWT_SECRET`
- `APP_ENV`
- `PORT`
- `ESP32_CAM_STREAM_URL` (example: `http://192.168.1.55:81/stream`)

Security guidance:

- Never commit real credentials.
- Keep `.env` local only.
- Rotate secrets if they were ever shared in code history.

## Backend Setup (Flask)

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Backend runs on `http://localhost:9999`.

### Backend API

- `GET /health`
- `GET /` (service info)
- `POST /api/readings`
- `GET /api/readings/latest?sensor_only=1`
- `GET /api/readings?limit=50&source=sensor`
- `GET /api/predictions?horizon=24&limit_history=all&history_preview=16&source=sensor&target=temperature`
- `GET /api/camera/stream-url`
- `GET /api/camera/stream`
- `GET /api/db/details`

### Sample POST Payload

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

### Database

- SQLite file: `backend/data/telemetry.db`
- Table: `telemetry`
- Retention: keeps latest `5000` rows
- Sources supported: `sensor`, `mock`

## Frontend Setup (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

Frontend defaults to backend base URL:

- `http://localhost:9999`

You can override with Vite env variable:

```bash
VITE_API_BASE_URL=http://localhost:9999 npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

## Firmware Notes

### `ino files/main.ino`

- Reads analog and digital sensors
- Computes values for temperature, turbidity, pH, TDS, and DO
- Sends serial output for ESP32 bridge

### `ino files/esp32_interfacing.ino`

- Connects to Wi-Fi
- Parses serial line
- POSTs parsed readings to Flask backend (`SERVER_URL`)

### `ino files/esp32_cam_live_stream.ino`

- Runs MJPEG camera server on ESP32-CAM
- Stream URL: `http://<esp32-ip>:81/stream`
- Lightweight HTML preview: `http://<esp32-ip>/`

## Live Camera Integration

1. Flash `ino files/esp32_cam_live_stream.ino` to your ESP32-CAM (AI Thinker board).
2. Open serial monitor at `115200` and note camera IP.
3. Set backend environment:
   - `ESP32_CAM_STREAM_URL=http://<esp32-ip>:81/stream`
4. Restart Flask backend.
5. In dashboard, click the camera icon near each pond GPS block to open live stream modal.

Notes:
- Frontend first tries proxied stream (`/api/camera/stream`) for same-origin behavior.
- If proxy URL is not configured, modal shows a helpful fallback state.


## Local Run Order

1. Start backend (`python app.py` in `backend/`)
2. Start frontend (`npm run dev` in `frontend/`)
3. Flash sensor firmware to Arduino (`main.ino`)
4. Flash bridge firmware to ESP32 (`esp32_interfacing.ino`)
5. Confirm backend receives readings at `/api/readings/latest?sensor_only=1`

## Troubleshooting

- Frontend shows stale/mock values:
  - Check backend is running on port `9999`
  - Check CORS/network and `VITE_API_BASE_URL`
- ESP32 not posting:
  - Verify Wi-Fi credentials and `SERVER_URL`
  - Ensure ESP32 and backend host are on same LAN
- No DB rows:
  - Check backend logs for `POST /api/readings` errors
  - Validate payload numeric fields: `temperature`, `turbidity`, `ph`, `tds`, `do`

