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
