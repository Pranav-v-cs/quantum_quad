#include <WiFi.h>
#include <HTTPClient.h>
#include <TinyGPS++.h>

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);  // UART2 on ESP32

// Update these before upload.
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* GPS_API_URL = "http://192.168.1.14:9999/api/gps";

// NEO-6M serial pins on ESP32
const int GPS_RX_PIN = 16;  // ESP32 RX <- NEO-6M TX
const int GPS_TX_PIN = 17;  // ESP32 TX -> NEO-6M RX (optional)

// How often to push a location update (ms)
const unsigned long POST_INTERVAL_MS = 10000;
unsigned long lastPostMs = 0;

double lastPostedLat = 0.0;
double lastPostedLng = 0.0;
bool hasPostedBefore = false;

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("[WIFI] Connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("[WIFI] Connected. IP: ");
  Serial.println(WiFi.localIP());
}

bool shouldPost(double lat, double lng) {
  if (!hasPostedBefore) return true;
  const double eps = 0.000001;  // ~0.11 m at equator
  return fabs(lat - lastPostedLat) > eps || fabs(lng - lastPostedLng) > eps;
}

void postGps(double lat, double lng) {
  connectWiFi();
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(GPS_API_URL);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\"lat\":";
  payload += String(lat, 6);
  payload += ",\"lng\":";
  payload += String(lng, 6);
  payload += "}";

  int code = http.POST(payload);
  String response = http.getString();
  Serial.printf("[GPS] POST code=%d lat=%.6f lng=%.6f\n", code, lat, lng);
  if (response.length() > 0) {
    Serial.println("[GPS] Response: " + response);
  }
  http.end();

  if (code > 0 && code < 400) {
    lastPostedLat = lat;
    lastPostedLng = lng;
    hasPostedBefore = true;
  }
}

void setup() {
  Serial.begin(115200);
  delay(250);
  Serial.println("[BOOT] ESP32 GPS portable sender starting...");

  // NEO-6M default baud is typically 9600.
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.printf("[GPS] UART2 started RX=%d TX=%d\n", GPS_RX_PIN, GPS_TX_PIN);

  connectWiFi();
}

void loop() {
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // Only proceed when we have a valid GPS fix.
  if (!gps.location.isValid()) {
    static unsigned long lastNoFixLog = 0;
    if (millis() - lastNoFixLog > 5000) {
      Serial.println("[GPS] Waiting for valid fix...");
      lastNoFixLog = millis();
    }
    delay(50);
    return;
  }

  if (millis() - lastPostMs < POST_INTERVAL_MS) {
    delay(20);
    return;
  }
  lastPostMs = millis();

  const double lat = gps.location.lat();
  const double lng = gps.location.lng();

  if (shouldPost(lat, lng)) {
    postGps(lat, lng);
  } else {
    Serial.printf("[GPS] Unchanged lat/lng %.6f, %.6f (skip)\n", lat, lng);
  }
}
