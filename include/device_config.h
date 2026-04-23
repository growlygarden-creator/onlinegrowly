#pragma once

namespace DeviceConfig {
constexpr bool RGB_STATUS_LED_ENABLED = true;
constexpr char DEVICE_NAME[] = "growly-esp32-s3";
constexpr char AP_SSID[] = "Growly Garden";
constexpr char PREFS_NAMESPACE[] = "growly_wifi";
constexpr char PREFS_WIFI_SSID_KEY[] = "ssid";
constexpr char PREFS_WIFI_PASSWORD_KEY[] = "password";
constexpr char PREFS_PAIRING_CODE_KEY[] = "pair_code";
constexpr char PREFS_HUB_ID_KEY[] = "hub_id";
constexpr char PREFS_SAMPLE_SOIL_KEY[] = "soil_ms";
constexpr char PREFS_SAMPLE_LIGHT_KEY[] = "light_ms";
constexpr char PREFS_SAMPLE_AIR_KEY[] = "air_ms";
constexpr char PREFS_SAMPLE_CLOUD_KEY[] = "cloud_ms";
constexpr char BACKEND_BASE_URL[] = "https://onlinegrowly.onrender.com";
constexpr char BACKEND_INGEST_URL[] = "";
constexpr char SUPABASE_PROJECT_URL[] = "https://ffxkxsclgiojrzmxvyuk.supabase.co";
constexpr char SUPABASE_REST_ENDPOINT[] = "https://ffxkxsclgiojrzmxvyuk.supabase.co/rest/v1/sensor_data";
// Supabase REST works with the anon public JWT in the apikey/Bearer headers.
constexpr char SUPABASE_API_KEY[] = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmeGt4c2NsZ2lvanJ6bXh2eXVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzOTI1MzYsImV4cCI6MjA4OTk2ODUzNn0.yOtn_wNGOje0QAEdWYll8XJkojFANCxpmWd5F1eoPzA";
constexpr char HUB_PAIR_PATH[] = "/api/hubs/pair";
constexpr int WIFI_RESET_BUTTON_PIN = 0;
constexpr unsigned long WIFI_FORCE_SETUP_HOLD_MS = 2000;
constexpr unsigned long WIFI_RESET_HOLD_MS = 10000;
constexpr unsigned long WIFI_CONNECT_TIMEOUT_MS = 20000;
constexpr unsigned long WIFI_SCAN_REFRESH_MS = 30000;
// Avoid GPIO19/GPIO20 on ESP32-S3 DevKitC because they are commonly used for native USB.
// Keeping BH1750 off the USB pins prevents the serial port from disappearing after boot.
constexpr int I2C_SDA_PIN = 8;
constexpr int I2C_SCL_PIN = 9;
#ifdef LED_BUILTIN
constexpr int STATUS_LED_PIN = LED_BUILTIN;
#else
constexpr int STATUS_LED_PIN = 48;
#endif
constexpr unsigned long STATUS_LED_BOOT_BLINK_MS = 150;
constexpr unsigned long STATUS_LED_WARN_BLINK_MS = 700;
constexpr unsigned long STATUS_LED_AP_BLINK_MS = 250;

constexpr int RS485_TX_PIN = 17;
constexpr int RS485_RX_PIN = 18;
constexpr int RS485_DIR_PIN = 16;
constexpr unsigned long RS485_BAUD = 4800;
constexpr uint8_t SENSOR_SLAVE_ADDRESS = 1;
constexpr uint16_t SENSOR_START_REGISTER = 1;
constexpr uint16_t SENSOR_REGISTER_COUNT = 9;
constexpr unsigned long SAMPLE_INTERVAL_MIN_MS = 5000;
constexpr unsigned long SAMPLE_INTERVAL_MAX_MS = 3600000;
constexpr unsigned long SENSOR_POLL_INTERVAL_MS = 60000;
constexpr unsigned long BACKEND_UPLOAD_INTERVAL_MS = 60000;
constexpr unsigned long MODBUS_RESPONSE_TIMEOUT_MS = 1200;
}
