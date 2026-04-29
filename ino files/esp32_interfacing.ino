#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoOTA.h>

HardwareSerial mySerial(2);

const char* WIFI_SSID = "WIFI_SSID_FROM_ENV";
const char* WIFI_PASS = "WIFI_PASSWORD_FROM_ENV";
const char* SERVER_URL = "http://192.168.225.118:9999/api/readings";
const char* STATION_ID = "QQ-dbafa5-A";
const char* OTA_HOSTNAME = "qq-esp32-interfacing";
const char* OTA_PASSWORD = "CHANGE_OTA_PASSWORD";

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
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("[WIFI] Connecting");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("[WIFI] Connected IP: ");
  Serial.println(WiFi.localIP());
}

void setupOTA() {
  ArduinoOTA.setHostname(OTA_HOSTNAME);
  ArduinoOTA.setPassword(OTA_PASSWORD);

  ArduinoOTA.onStart([]() {
    Serial.println("[OTA] Start");
  });
  ArduinoOTA.onEnd([]() {
    Serial.println("\n[OTA] End");
  });
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("[OTA] Progress: %u%%\r", (progress * 100U) / total);
  });
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("[OTA] Error[%u]\n", error);
  });

  ArduinoOTA.begin();
  Serial.println("[OTA] Ready");
}

void setup() {
  Serial.begin(115200);
  mySerial.begin(9600, SERIAL_8N1, 16, 17);
  connectWiFi();
  setupOTA();
}

void postReading(const String& rawLine) {
  float temperature, turbidity, ph, tds, dO, rawTurbidity;

  bool ok =
    extractValue(rawLine, "Temperature", temperature) &&
    extractValue(rawLine, "Turbidity", turbidity) &&
    extractValue(rawLine, "RawTurbidity", rawTurbidity) &&
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
    "\"raw_turbidity\":" + String(rawTurbidity, 0) + ","
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
  ArduinoOTA.handle();

  if (mySerial.available()) {
    String data = mySerial.readStringUntil('\n');
    data.trim();
    if (data.length() > 0) {
      Serial.println("Received: " + data);
      postReading(data);
    }
  }
}
