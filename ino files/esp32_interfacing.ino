#include <WiFi.h>
#include <HTTPClient.h>

HardwareSerial mySerial(2);

const char* WIFI_SSID = "WIFI_SSID_FROM_ENV";
const char* WIFI_PASS = "WIFI_PASSWORD_FROM_ENV";
const char* SERVER_URL = "http://192.168.225.118:9999/api/readings";
const char* STATION_ID = "QQ-dbafa5-A";

bool extractValue(const String& line, const String& key, float& out) {
  int start = line.indexOf(key);
  if (start < 0) return false;
  start += key.length();

  while (start < (int)line.length() && (line[start] == ' ' || line[start] == ':')) start++;

  int end = start;
  while (end < (int)line.length()) {
    char c = line[end];
    if ((c >= '0' && c <= '9') || c == '.' || c == '-') end++;
    else break;
  }
  if (end <= start) return false;

  out = line.substring(start, end).toFloat();
  return true;
}

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void setup() {
  Serial.begin(115200);
  mySerial.begin(9600, SERIAL_8N1, 16, 17);
  connectWiFi();
}

void postReading(const String& rawLine) {
  float temperature, turbidity, ph, tds, dO;

  bool ok =
    extractValue(rawLine, "Temperature", temperature) &&
    extractValue(rawLine, "Turbidity", turbidity) &&
    extractValue(rawLine, "pH", ph) &&
    extractValue(rawLine, "TDS", tds) &&
    extractValue(rawLine, "DO", dO);

  if (!ok) {
    Serial.println("Parse failed: " + rawLine);
    return;
  }

  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String json =
    "{"
    "\"station_id\":\"" + String(STATION_ID) + "\","
    "\"temperature\":" + String(temperature, 2) + ","
    "\"turbidity\":" + String(turbidity, 2) + ","
    "\"ph\":" + String(ph, 2) + ","
    "\"tds\":" + String(tds, 2) + ","
    "\"do\":" + String(dO, 2) + ","
    "\"source\":\"sensor\","
    "\"raw_line\":\"" + rawLine + "\""
    "}";

  int code = http.POST(json);
  Serial.print("POST code: ");
  Serial.println(code);
  Serial.println(http.getString());
  http.end();
}

void loop() {
  if (mySerial.available()) {
    String data = mySerial.readStringUntil('\n');
    data.trim();
    if (data.length() > 0) {
      Serial.println("Received: " + data);
      postReading(data);
    }
  }
}

/*
#include <WiFi.h>
#include <HTTPClient.h>

HardwareSerial mySerial(2);

const char* WIFI_SSID = "WIFI_SSID_FROM_ENV";
const char* WIFI_PASS = "WIFI_PASSWORD_FROM_ENV";
const char* SERVER_URL = "http://192.168.1.14:9999/api/readings";
const char* STATION_ID = "QQ-dbafa5-A";

unsigned long lastHeartbeatMs = 0;
unsigned long lastReceiveMs = 0;

bool extractValue(const String& line, const String& key, float& out) {
  int start = line.indexOf(key);
  if (start < 0) return false;
  start += key.length();

  while (start < (int)line.length() && (line[start] == ' ' || line[start] == ':')) start++;

  int end = start;
  while (end < (int)line.length()) {
    char c = line[end];
    if ((c >= '0' && c <= '9') || c == '.' || c == '-') end++;
    else break;
  }
  if (end <= start) return false;

  out = line.substring(start, end).toFloat();
  return true;
}

void connectWiFi() {
  Serial.print("[WIFI] Connecting");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("[WIFI] Connected. IP: ");
  Serial.println(WiFi.localIP());
}

void postReading(const String& rawLine) {
  float temperature, turbidity, ph, tds, dO;

  bool ok =
    extractValue(rawLine, "Temperature", temperature) &&
    extractValue(rawLine, "Turbidity", turbidity) &&
    extractValue(rawLine, "pH", ph) &&
    extractValue(rawLine, "TDS", tds) &&
    extractValue(rawLine, "DO", dO);

  if (!ok) {
    Serial.println("[PARSE] Failed to parse expected keys from line.");
    return;
  }

  Serial.printf("[PARSE] temp=%.2f turb=%.2f ph=%.2f tds=%.2f do=%.2f\n",
                temperature, turbidity, ph, tds, dO);

  if (WiFi.status() != WL_CONNECTED) connectWiFi();

  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  String json =
    "{"
    "\"station_id\":\"" + String(STATION_ID) + "\","
    "\"temperature\":" + String(temperature, 2) + ","
    "\"turbidity\":" + String(turbidity, 2) + ","
    "\"ph\":" + String(ph, 2) + ","
    "\"tds\":" + String(tds, 2) + ","
    "\"do\":" + String(dO, 2) + ","
    "\"source\":\"sensor\","
    "\"raw_line\":\"" + rawLine + "\""
    "}";

  Serial.println("[HTTP] POST -> " + String(SERVER_URL));
  int code = http.POST(json);
  Serial.printf("[HTTP] status=%d\n", code);
  Serial.println("[HTTP] response: " + http.getString());
  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n[BOOT] ESP32 starting...");

  // UART2 RX=16, TX=17
  mySerial.begin(9600, SERIAL_8N1, 16, 17);
  Serial.println("[UART2] Started @9600 on RX=16 TX=17");

  connectWiFi();
}

void loop() {
  // Heartbeat every 5s so you know firmware is alive
  if (millis() - lastHeartbeatMs > 5000) {
    lastHeartbeatMs = millis();
    Serial.printf("[HB] alive. UART available bytes=%d, last RX %lus ago\n",
                  mySerial.available(),
                  (millis() - lastReceiveMs) / 1000);
  }

  if (mySerial.available()) {
    String data = mySerial.readStringUntil('\n');
    data.trim();

    if (data.length() > 0) {
      lastReceiveMs = millis();
      Serial.println("[UART2] RAW: " + data);
      postReading(data);
    } else {
      Serial.println("[UART2] Received empty line");
    }
  }
}
*/
