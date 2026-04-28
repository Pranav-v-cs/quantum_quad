#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

// Select your module here. AI Thinker is most common.
#define CAMERA_MODEL_AI_THINKER

#if defined(CAMERA_MODEL_AI_THINKER)
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
#else
#error "Unsupported camera model"
#endif

const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASS = "YOUR_WIFI_PASSWORD";
const char* CAMERA_API_URL = "http://192.168.1.14:9999/api/camera/capture";
const char* STATION_ID = "QQ-dbafa5-A";

const unsigned long UPLOAD_INTERVAL_MS = 15000;
unsigned long lastUploadMs = 0;

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
  Serial.print("[WIFI] Connected, IP: ");
  Serial.println(WiFi.localIP());
}

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
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM] Init failed 0x%x\n", err);
    return false;
  }

  sensor_t * s = esp_camera_sensor_get();
  s->set_brightness(s, 0);
  s->set_contrast(s, 0);
  s->set_saturation(s, 0);
  Serial.println("[CAM] Init success");
  return true;
}

void postImage() {
  connectWiFi();
  if (WiFi.status() != WL_CONNECTED) return;

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("[CAM] Capture failed");
    return;
  }

  HTTPClient http;
  String boundary = "----qqesp32cam";
  String head =
      "--" + boundary + "\r\n"
      "Content-Disposition: form-data; name=\"station_id\"\r\n\r\n" + String(STATION_ID) + "\r\n"
      "--" + boundary + "\r\n"
      "Content-Disposition: form-data; name=\"source\"\r\n\r\n"
      "esp32_cam\r\n"
      "--" + boundary + "\r\n"
      "Content-Disposition: form-data; name=\"image\"; filename=\"capture.jpg\"\r\n"
      "Content-Type: image/jpeg\r\n\r\n";
  String tail = "\r\n--" + boundary + "--\r\n";

  int bodyLen = head.length() + fb->len + tail.length();

  http.begin(CAMERA_API_URL);
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  http.addHeader("Content-Length", String(bodyLen));

  WiFiClient *stream = http.getStreamPtr();
  int code = http.sendRequest("POST", (uint8_t *)NULL, 0);
  if (code == HTTP_CODE_OK || code == HTTP_CODE_CREATED || code == -1) {
    stream->print(head);
    stream->write(fb->buf, fb->len);
    stream->print(tail);
  }

  code = http.POST((uint8_t*)nullptr, 0);
  String response = http.getString();

  Serial.printf("[CAM] POST code=%d bytes=%u\n", code, fb->len);
  if (response.length() > 0) {
    Serial.println("[CAM] Response: " + response);
  }

  http.end();
  esp_camera_fb_return(fb);
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("[BOOT] ESP32-CAM uploader starting...");

  if (!initCamera()) {
    Serial.println("[BOOT] Camera init failed; rebooting in 5s...");
    delay(5000);
    ESP.restart();
  }

  connectWiFi();
}

void loop() {
  if (millis() - lastUploadMs >= UPLOAD_INTERVAL_MS) {
    lastUploadMs = millis();
    postImage();
  }
  delay(50);
}
