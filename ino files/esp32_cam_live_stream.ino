#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

// AI Thinker ESP32-CAM pin map
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* FLASK_HEALTH_URL = "http://192.168.225.118:9999/health";
const char* FLASK_FRAME_UPLOAD_URL = "http://192.168.225.118:9999/api/camera/frame";
const char* CAMERA_ID = "QQ-CAM-01";
const uint32_t FRAME_UPLOAD_MS = 5000;

uint32_t lastUploadMs = 0;

bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 12;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 16;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM] Init failed with error 0x%x\n", err);
    return false;
  }
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

void postFrameToFlask() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi disconnected");
    return;
  }

  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[CAM] Frame capture failed");
    return;
  }

  String endpoint = String(FLASK_FRAME_UPLOAD_URL) + "?camera_id=" + CAMERA_ID;
  size_t frameBytes = fb->len;
  HTTPClient http;
  http.begin(endpoint);
  http.addHeader("Content-Type", "image/jpeg");
  int statusCode = http.POST(fb->buf, fb->len);
  String responseBody = http.getString();
  http.end();
  esp_camera_fb_return(fb);

  Serial.printf("[HTTP] POST %s -> %d, bytes=%u\n", endpoint.c_str(), statusCode, (unsigned)frameBytes);
  if (responseBody.length() > 0) {
    Serial.printf("[HTTP] Response: %s\n", responseBody.c_str());
  }
}

void checkFlaskHealth() {
  if (WiFi.status() != WL_CONNECTED) return;
  HTTPClient http;
  http.begin(FLASK_HEALTH_URL);
  int statusCode = http.GET();
  String responseBody = http.getString();
  http.end();
  Serial.printf("[HTTP] Health %s -> %d\n", FLASK_HEALTH_URL, statusCode);
  if (responseBody.length() > 0) {
    Serial.printf("[HTTP] Health body: %s\n", responseBody.c_str());
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);

  if (!initCamera()) {
    Serial.println("[BOOT] Camera init failed. Rebooting in 5s...");
    delay(5000);
    ESP.restart();
  }

  connectWiFi();
  checkFlaskHealth();

  Serial.println("[BOOT] Camera upload client ready");
  Serial.printf("[BOOT] Upload target: %s\n", FLASK_FRAME_UPLOAD_URL);
}

void loop() {
  if (millis() - lastUploadMs >= FRAME_UPLOAD_MS) {
    lastUploadMs = millis();
    postFrameToFlask();
  }
  delay(20);
}
