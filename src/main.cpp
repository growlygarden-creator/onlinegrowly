#include <Arduino.h>
#include <Adafruit_BME280.h>
#include <Adafruit_BMP280.h>
#include <DNSServer.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <Wire.h>
#include <WiFi.h>
#include <WebServer.h>

#include "device_config.h"

namespace {
constexpr byte kDnsPort = 53;
constexpr size_t kMaxVisibleNetworks = 20;

WebServer server(80);
HardwareSerial rs485Serial(1);
DNSServer dnsServer;
Preferences preferences;
Adafruit_BME280 bme280;
Adafruit_BMP280 bmp280;

String configuredWifiSsid;
String configuredWifiPassword;
String configuredPairingCode;
String pairedHubId;
String pairingStatusMessage = "Huben er ikke paret ennå.";
bool captivePortalActive = false;
unsigned long lastWifiScanAt = 0;
bool wifiScanLoaded = false;
bool wifiResetTriggered = false;
bool wifiResetCounting = false;
unsigned long wifiResetStartedAt = 0;
unsigned long wifiResetLastNoticeAt = 0;
unsigned long lastBackendUploadAt = 0;
unsigned long lastSupabaseUploadAt = 0;
unsigned long lastStatusLedUpdateAt = 0;
unsigned long lastSoilPollAt = 0;
unsigned long lastLightPollAt = 0;
unsigned long lastPairingAttemptAt = 0;
unsigned long wifiConnectedAt = 0;
bool statusLedOn = false;
unsigned long soilSampleIntervalMs = DeviceConfig::SENSOR_POLL_INTERVAL_MS;
unsigned long lightSampleIntervalMs = DeviceConfig::SENSOR_POLL_INTERVAL_MS;
unsigned long airSampleIntervalMs = DeviceConfig::SENSOR_POLL_INTERVAL_MS;
unsigned long cloudSampleIntervalMs = DeviceConfig::BACKEND_UPLOAD_INTERVAL_MS;

constexpr uint8_t kBh1750PrimaryAddress = 0x23;
constexpr uint8_t kBh1750SecondaryAddress = 0x5C;
constexpr uint8_t kBh1750ContinuousHighResMode = 0x10;
constexpr uint8_t kBm280PrimaryAddress = 0x76;
constexpr uint8_t kBm280SecondaryAddress = 0x77;

struct Bh1750State {
    bool available = false;
    bool valid = false;
    uint8_t address = 0;
    float lux = 0.0f;
    unsigned long lastReadAt = 0;
};

Bh1750State bh1750State;

struct AirSensorState {
    bool available = false;
    bool valid = false;
    bool humidityAvailable = false;
    bool bmpOnly = false;
    uint8_t address = 0;
    uint8_t chipId = 0;
    float temperature = 0.0f;
    float humidity = 0.0f;
    float pressureHpa = 0.0f;
    unsigned long lastReadAt = 0;
};

AirSensorState airSensorState;

struct SensorReading {
    bool valid = false;
    unsigned long lastReadAt = 0;
    uint16_t humidityRaw = 0;
    int16_t temperatureRaw = 0;
    uint16_t conductivity = 0;
    uint16_t phRaw = 0;
    uint16_t nitrogen = 0;
    uint16_t phosphorus = 0;
    uint16_t potassium = 0;
    uint16_t salinity = 0;
    uint16_t tds = 0;
    String lastError;
};

SensorReading latestReading;

struct VisibleNetwork {
    String ssid;
    int32_t rssi;
    wifi_auth_mode_t authMode;
};

VisibleNetwork visibleNetworks[kMaxVisibleNetworks];
size_t visibleNetworkCount = 0;

void printSensorReading();
bool ensureHubPairing(bool forceRetry = false);

enum class StatusLedColor {
    Off,
    Orange,
    Blue,
    Green,
    Red,
};

enum class BootAction {
    None,
    ForceSetup,
    FactoryReset,
};

String backendUrl(const char* path) {
    String base = DeviceConfig::BACKEND_BASE_URL;
    base.trim();
    if (base.length() == 0) {
        return "";
    }
    if (base.endsWith("/")) {
        base.remove(base.length() - 1);
    }
    return base + String(path);
}

unsigned long sanitizeSampleInterval(long value) {
    if (value < static_cast<long>(DeviceConfig::SAMPLE_INTERVAL_MIN_MS)) {
        return DeviceConfig::SAMPLE_INTERVAL_MIN_MS;
    }
    if (value > static_cast<long>(DeviceConfig::SAMPLE_INTERVAL_MAX_MS)) {
        return DeviceConfig::SAMPLE_INTERVAL_MAX_MS;
    }
    return static_cast<unsigned long>(value);
}

void setStatusLedColor(StatusLedColor color) {
    statusLedOn = color != StatusLedColor::Off;
#if defined(RGB_BUILTIN)
    if (DeviceConfig::RGB_STATUS_LED_ENABLED) {
        switch (color) {
            case StatusLedColor::Orange:
                neopixelWrite(RGB_BUILTIN, 64, 24, 0);
                return;
            case StatusLedColor::Blue:
                neopixelWrite(RGB_BUILTIN, 0, 24, 64);
                return;
            case StatusLedColor::Green:
                neopixelWrite(RGB_BUILTIN, 0, 64, 0);
                return;
            case StatusLedColor::Red:
                neopixelWrite(RGB_BUILTIN, 64, 0, 0);
                return;
            case StatusLedColor::Off:
            default:
                neopixelWrite(RGB_BUILTIN, 0, 0, 0);
                return;
        }
    }
#endif

    digitalWrite(DeviceConfig::STATUS_LED_PIN, color == StatusLedColor::Off ? LOW : HIGH);
}

void blinkStatusLed(StatusLedColor color, unsigned long intervalMs) {
    const unsigned long now = millis();
    if (now - lastStatusLedUpdateAt < intervalMs) {
        return;
    }
    lastStatusLedUpdateAt = now;
    setStatusLedColor(statusLedOn ? StatusLedColor::Off : color);
}

void loadSampleIntervals() {
    preferences.begin(DeviceConfig::PREFS_NAMESPACE, true);
    soilSampleIntervalMs = sanitizeSampleInterval(
        preferences.getULong(
            DeviceConfig::PREFS_SAMPLE_SOIL_KEY,
            DeviceConfig::SENSOR_POLL_INTERVAL_MS));
    lightSampleIntervalMs = sanitizeSampleInterval(
        preferences.getULong(
            DeviceConfig::PREFS_SAMPLE_LIGHT_KEY,
            DeviceConfig::SENSOR_POLL_INTERVAL_MS));
    airSampleIntervalMs = sanitizeSampleInterval(
        preferences.getULong(
            DeviceConfig::PREFS_SAMPLE_AIR_KEY,
            DeviceConfig::SENSOR_POLL_INTERVAL_MS));
    cloudSampleIntervalMs = sanitizeSampleInterval(
        preferences.getULong(
            DeviceConfig::PREFS_SAMPLE_CLOUD_KEY,
            DeviceConfig::BACKEND_UPLOAD_INTERVAL_MS));
    preferences.end();
}

void saveSampleIntervals() {
    preferences.begin(DeviceConfig::PREFS_NAMESPACE, false);
    preferences.putULong(DeviceConfig::PREFS_SAMPLE_SOIL_KEY, soilSampleIntervalMs);
    preferences.putULong(DeviceConfig::PREFS_SAMPLE_LIGHT_KEY, lightSampleIntervalMs);
    preferences.putULong(DeviceConfig::PREFS_SAMPLE_AIR_KEY, airSampleIntervalMs);
    preferences.putULong(DeviceConfig::PREFS_SAMPLE_CLOUD_KEY, cloudSampleIntervalMs);
    preferences.end();
}

void loadPairingState() {
    preferences.begin(DeviceConfig::PREFS_NAMESPACE, true);
    configuredPairingCode = preferences.getString(DeviceConfig::PREFS_PAIRING_CODE_KEY, "");
    pairedHubId = preferences.getString(DeviceConfig::PREFS_HUB_ID_KEY, "");
    preferences.end();

    configuredPairingCode.trim();
    pairedHubId.trim();
}

void savePairingCode(const String& pairingCode) {
    preferences.begin(DeviceConfig::PREFS_NAMESPACE, false);
    preferences.putString(DeviceConfig::PREFS_PAIRING_CODE_KEY, pairingCode);
    preferences.end();
    configuredPairingCode = pairingCode;
    configuredPairingCode.trim();
}

void savePairedHubId(const String& hubId) {
    preferences.begin(DeviceConfig::PREFS_NAMESPACE, false);
    preferences.putString(DeviceConfig::PREFS_HUB_ID_KEY, hubId);
    preferences.end();
    pairedHubId = hubId;
    pairedHubId.trim();
}

String sampleIntervalsJson() {
    return String("{\"ok\":true,\"settings\":{") +
           "\"sample_time_soil_ms\":" + String(soilSampleIntervalMs) + "," +
           "\"sample_time_light_ms\":" + String(lightSampleIntervalMs) + "," +
           "\"sample_time_air_ms\":" + String(airSampleIntervalMs) + "," +
           "\"sample_time_cloud_ms\":" + String(cloudSampleIntervalMs) +
           "}}";
}

void setupStatusLed() {
#if !defined(RGB_BUILTIN)
    pinMode(DeviceConfig::STATUS_LED_PIN, OUTPUT);
#endif
    setStatusLedColor(StatusLedColor::Off);
}

bool systemHealthy() {
    return WiFi.status() == WL_CONNECTED &&
           !captivePortalActive &&
           bh1750State.available &&
           bh1750State.valid &&
           airSensorState.available &&
           airSensorState.valid &&
           latestReading.valid;
}

void updateStatusLed() {
    const bool wifiConnected = WiFi.status() == WL_CONNECTED;
    if (wifiConnected) {
        if (wifiConnectedAt == 0) {
            wifiConnectedAt = millis();
        }
    } else {
        wifiConnectedAt = 0;
    }

    if (captivePortalActive) {
        blinkStatusLed(StatusLedColor::Orange, DeviceConfig::STATUS_LED_AP_BLINK_MS);
        return;
    }

    if (systemHealthy()) {
        setStatusLedColor(StatusLedColor::Green);
        return;
    }

    if (wifiConnected && wifiConnectedAt != 0 && millis() - wifiConnectedAt < 15000) {
        blinkStatusLed(StatusLedColor::Blue, DeviceConfig::STATUS_LED_WARN_BLINK_MS);
        return;
    }

    if (!wifiConnected ||
        !bh1750State.available ||
        !bh1750State.valid ||
        !airSensorState.available ||
        !airSensorState.valid ||
        !latestReading.valid) {
        blinkStatusLed(StatusLedColor::Red, DeviceConfig::STATUS_LED_WARN_BLINK_MS);
        return;
    }

    blinkStatusLed(StatusLedColor::Blue, DeviceConfig::STATUS_LED_BOOT_BLINK_MS);
}

bool writeBh1750Command(uint8_t address, uint8_t command) {
    Wire.beginTransmission(address);
    Wire.write(command);
    return Wire.endTransmission() == 0;
}

bool initBh1750AtAddress(uint8_t address) {
    if (!writeBh1750Command(address, 0x01)) {
        return false;
    }
    delay(10);
    if (!writeBh1750Command(address, kBh1750ContinuousHighResMode)) {
        return false;
    }
    return true;
}

bool initBm280AtAddress(uint8_t address) {
    Wire.beginTransmission(address);
    Wire.write(0xD0);
    if (Wire.endTransmission() != 0) {
        Serial.printf("BM280 probe failed to read chip ID at 0x%02X\n", address);
        return false;
    }
    delay(2);
    Wire.beginTransmission(address);
    Wire.write(0xD0);
    if (Wire.endTransmission(false) != 0) {
        Serial.printf("BM280 register select failed at 0x%02X\n", address);
        return false;
    }
    if (Wire.requestFrom(static_cast<int>(address), 1, true) != 1 || Wire.available() < 1) {
        Serial.printf("BM280 chip ID not available at 0x%02X\n", address);
        return false;
    }

    const uint8_t chipId = Wire.read();
    Serial.printf("BM280 raw chip ID at 0x%02X: 0x%02X\n", address, chipId);

    if (chipId == 0x60) {
        if (!bme280.begin(address, &Wire)) {
            return false;
        }

        airSensorState.available = true;
        airSensorState.address = address;
        airSensorState.chipId = chipId;
        airSensorState.bmpOnly = false;
        airSensorState.humidityAvailable = true;
        return true;
    }

    if (chipId == 0x58) {
        delay(5);
        if (!bmp280.begin(address, 0x58)) {
            Serial.printf("BMP280 begin failed at 0x%02X\n", address);
            return false;
        }

        airSensorState.available = true;
        airSensorState.address = address;
        airSensorState.chipId = chipId;
        airSensorState.bmpOnly = true;
        airSensorState.humidityAvailable = false;
        return true;
    }

    airSensorState.chipId = chipId;
    airSensorState.bmpOnly = false;
    airSensorState.humidityAvailable = false;
    if (chipId != 0x58 && chipId != 0x60) {
        Serial.printf("Unsupported BMx280 chip ID 0x%02X at 0x%02X\n", chipId, address);
        return false;
    }
    return false;
}

void scanI2cDevices() {
    bool foundAny = false;
    Serial.printf("Scanning I2C bus on SDA=%d SCL=%d\n", DeviceConfig::I2C_SDA_PIN, DeviceConfig::I2C_SCL_PIN);

    for (uint8_t address = 1; address < 127; ++address) {
        Wire.beginTransmission(address);
        const uint8_t error = Wire.endTransmission();
        if (error == 0) {
            foundAny = true;
            Serial.printf("I2C device found at 0x%02X\n", address);
        }
    }

    if (!foundAny) {
        Serial.println("No I2C devices found");
    }
}

void setupBh1750() {
    Wire.begin(DeviceConfig::I2C_SDA_PIN, DeviceConfig::I2C_SCL_PIN);

    if (initBh1750AtAddress(kBh1750PrimaryAddress)) {
        bh1750State.available = true;
        bh1750State.address = kBh1750PrimaryAddress;
    } else if (initBh1750AtAddress(kBh1750SecondaryAddress)) {
        bh1750State.available = true;
        bh1750State.address = kBh1750SecondaryAddress;
    }

    if (bh1750State.available) {
        bh1750State.valid = false;
        Serial.printf("BH1750 ready on I2C address 0x%02X (SDA=%d, SCL=%d)\n",
                      bh1750State.address,
                      DeviceConfig::I2C_SDA_PIN,
                      DeviceConfig::I2C_SCL_PIN);
    } else {
        Serial.println("BH1750 not found on 0x23 or 0x5C");
    }
}

void setupAirSensor() {
    if (initBm280AtAddress(kBm280PrimaryAddress) || initBm280AtAddress(kBm280SecondaryAddress)) {
        Serial.printf(
            "%s ready on I2C address 0x%02X (SDA=%d, SCL=%d)\n",
            airSensorState.bmpOnly ? "BMP280" : "BME280",
            airSensorState.address,
            DeviceConfig::I2C_SDA_PIN,
            DeviceConfig::I2C_SCL_PIN);
    } else {
        Serial.println("BME280/BMP280 not found on 0x76 or 0x77");
    }
}

bool readBh1750Lux(float& lux) {
    if (!bh1750State.available) {
        return false;
    }

    const int bytesRequested = Wire.requestFrom(static_cast<int>(bh1750State.address), 2);
    if (bytesRequested != 2 || Wire.available() < 2) {
        return false;
    }

    const uint16_t raw = (static_cast<uint16_t>(Wire.read()) << 8) | Wire.read();
    lux = raw / 1.2f;
    return true;
}

void pollBh1750() {
    if (!bh1750State.available) {
        return;
    }

    float lux = 0.0f;
    if (!readBh1750Lux(lux)) {
        bh1750State.valid = false;
        Serial.println("BH1750 read failed");
        return;
    }

    bh1750State.lux = lux;
    bh1750State.valid = true;
    bh1750State.lastReadAt = millis();
    Serial.printf("BH1750 | lux=%.2f\n", bh1750State.lux);
}

void pollAirSensor() {
    if (!airSensorState.available) {
        return;
    }

    const float temperature = airSensorState.bmpOnly ? bmp280.readTemperature() : bme280.readTemperature();
    const float pressurePa = airSensorState.bmpOnly ? bmp280.readPressure() : bme280.readPressure();
    const float humidity = airSensorState.humidityAvailable ? bme280.readHumidity() : NAN;

    if (isnan(temperature) || isnan(pressurePa) || (airSensorState.humidityAvailable && isnan(humidity))) {
        airSensorState.valid = false;
        Serial.println("BME280/BMP280 read failed");
        return;
    }

    airSensorState.temperature = temperature;
    airSensorState.pressureHpa = pressurePa / 100.0f;
    airSensorState.humidity = airSensorState.humidityAvailable ? humidity : NAN;
    airSensorState.valid = true;
    airSensorState.lastReadAt = millis();

    if (airSensorState.humidityAvailable) {
        Serial.printf(
            "BME280 | air_temperature=%.2f air_humidity=%.2f air_pressure=%.2f hPa\n",
            airSensorState.temperature,
            airSensorState.humidity,
            airSensorState.pressureHpa);
    } else {
        Serial.printf(
            "BMP280 | air_temperature=%.2f air_pressure=%.2f hPa\n",
            airSensorState.temperature,
            airSensorState.pressureHpa);
    }
}

uint16_t modbusCrc(const uint8_t* data, size_t length) {
    uint16_t crc = 0xFFFF;
    for (size_t pos = 0; pos < length; ++pos) {
        crc ^= static_cast<uint16_t>(data[pos]);
        for (int i = 0; i < 8; ++i) {
            if ((crc & 0x0001U) != 0U) {
                crc >>= 1;
                crc ^= 0xA001U;
            } else {
                crc >>= 1;
            }
        }
    }
    return crc;
}

String hexDump(const uint8_t* data, size_t length) {
    String dump;
    for (size_t i = 0; i < length; ++i) {
        if (i > 0) {
            dump += ' ';
        }
        if (data[i] < 0x10) {
            dump += '0';
        }
        dump += String(data[i], HEX);
    }
    dump.toUpperCase();
    return dump;
}

void setReceiveMode() {
    digitalWrite(DeviceConfig::RS485_DIR_PIN, LOW);
}

void setTransmitMode() {
    digitalWrite(DeviceConfig::RS485_DIR_PIN, HIGH);
}

bool readHoldingRegisters(uint8_t slaveAddress, uint16_t startRegister, uint16_t registerCount, uint8_t* response, size_t responseSize, size_t& responseLength, String& error) {
    if (responseSize < 5 + registerCount * 2) {
        error = "response_buffer_too_small";
        return false;
    }

    uint8_t frame[8];
    frame[0] = slaveAddress;
    frame[1] = 0x03;
    frame[2] = static_cast<uint8_t>((startRegister - 1) >> 8);
    frame[3] = static_cast<uint8_t>((startRegister - 1) & 0xFF);
    frame[4] = static_cast<uint8_t>(registerCount >> 8);
    frame[5] = static_cast<uint8_t>(registerCount & 0xFF);
    const uint16_t crc = modbusCrc(frame, 6);
    frame[6] = static_cast<uint8_t>(crc & 0xFF);
    frame[7] = static_cast<uint8_t>((crc >> 8) & 0xFF);

    Serial.printf(
        "RS485 request | slave=%u start=%u count=%u frame=%s\n",
        slaveAddress,
        startRegister,
        registerCount,
        hexDump(frame, sizeof(frame)).c_str());

    while (rs485Serial.available() > 0) {
        rs485Serial.read();
    }

    setTransmitMode();
    rs485Serial.write(frame, sizeof(frame));
    rs485Serial.flush();
    delay(3);
    setReceiveMode();

    const size_t expectedLength = 5 + registerCount * 2;
    responseLength = 0;
    const unsigned long startedAt = millis();

    while (millis() - startedAt < DeviceConfig::MODBUS_RESPONSE_TIMEOUT_MS) {
        while (rs485Serial.available() > 0 && responseLength < responseSize) {
            response[responseLength++] = static_cast<uint8_t>(rs485Serial.read());
        }
        if (responseLength >= expectedLength) {
            break;
        }
        delay(10);
    }

    if (responseLength < expectedLength) {
        if (responseLength > 0) {
            Serial.printf(
                "RS485 timeout | expected=%u got=%u partial=%s\n",
                static_cast<unsigned>(expectedLength),
                static_cast<unsigned>(responseLength),
                hexDump(response, responseLength).c_str());
        } else {
            Serial.printf(
                "RS485 timeout | expected=%u got=0\n",
                static_cast<unsigned>(expectedLength));
        }
        error = "timeout";
        return false;
    }

    if (response[0] != slaveAddress) {
        Serial.printf("RS485 invalid slave | expected=%u got=%u frame=%s\n",
                      slaveAddress,
                      response[0],
                      hexDump(response, responseLength).c_str());
        error = "wrong_slave_address";
        return false;
    }

    if (response[1] != 0x03) {
        Serial.printf("RS485 invalid function | expected=3 got=%u frame=%s\n",
                      response[1],
                      hexDump(response, responseLength).c_str());
        error = "wrong_function_code";
        return false;
    }

    if (response[2] != registerCount * 2) {
        Serial.printf("RS485 invalid payload size | expected=%u got=%u frame=%s\n",
                      registerCount * 2,
                      response[2],
                      hexDump(response, responseLength).c_str());
        error = "wrong_payload_size";
        return false;
    }

    const uint16_t responseCrc = static_cast<uint16_t>(response[responseLength - 1] << 8) | response[responseLength - 2];
    const uint16_t calculatedCrc = modbusCrc(response, responseLength - 2);
    if (responseCrc != calculatedCrc) {
        Serial.printf("RS485 CRC mismatch | expected=%04X got=%04X frame=%s\n",
                      calculatedCrc,
                      responseCrc,
                      hexDump(response, responseLength).c_str());
        error = "crc_mismatch";
        return false;
    }

    Serial.printf("RS485 response OK | frame=%s\n", hexDump(response, responseLength).c_str());

    return true;
}

uint16_t readRegisterBigEndian(const uint8_t* payload, size_t registerIndex) {
    const size_t offset = 3 + registerIndex * 2;
    return static_cast<uint16_t>(payload[offset] << 8) | payload[offset + 1];
}

bool pollSensor(SensorReading& reading) {
    uint8_t response[64];
    size_t responseLength = 0;
    String error;

    if (!readHoldingRegisters(
            DeviceConfig::SENSOR_SLAVE_ADDRESS,
            DeviceConfig::SENSOR_START_REGISTER,
            DeviceConfig::SENSOR_REGISTER_COUNT,
            response,
            sizeof(response),
            responseLength,
            error)) {
        reading.valid = false;
        reading.lastError = error;
        return false;
    }

    reading.valid = true;
    reading.lastReadAt = millis();
    reading.humidityRaw = readRegisterBigEndian(response, 0);
    reading.temperatureRaw = static_cast<int16_t>(readRegisterBigEndian(response, 1));
    reading.conductivity = readRegisterBigEndian(response, 2);
    reading.phRaw = readRegisterBigEndian(response, 3);
    reading.nitrogen = readRegisterBigEndian(response, 4);
    reading.phosphorus = readRegisterBigEndian(response, 5);
    reading.potassium = readRegisterBigEndian(response, 6);
    reading.salinity = readRegisterBigEndian(response, 7);
    reading.tds = readRegisterBigEndian(response, 8);
    reading.lastError = "";
    return true;
}

String sensorReadingJson() {
    String json = "{";
    json += "\"valid\":" + String(latestReading.valid ? "true" : "false");
    json += ",\"last_read_ms\":" + String(latestReading.lastReadAt);
    json += ",\"device\":\"" + String(DeviceConfig::DEVICE_NAME) + "\"";
    json += ",\"air_temperature\":";
    if (airSensorState.valid) {
        json += String(airSensorState.temperature, 2);
    } else {
        json += "null";
    }
    json += ",\"air_humidity\":";
    if (airSensorState.valid && airSensorState.humidityAvailable) {
        json += String(airSensorState.humidity, 2);
    } else {
        json += "null";
    }
    json += ",\"air_pressure\":";
    if (airSensorState.valid) {
        json += String(airSensorState.pressureHpa, 2);
    } else {
        json += "null";
    }
    json += ",\"lux\":";
    if (bh1750State.available) {
        json += String(bh1750State.lux, 2);
    } else {
        json += "null";
    }
    json += ",\"humidity\":" + String(latestReading.humidityRaw / 10.0f, 1);
    json += ",\"temperature\":" + String(latestReading.temperatureRaw / 10.0f, 1);
    json += ",\"conductivity\":" + String(latestReading.conductivity);
    json += ",\"ph\":" + String(latestReading.phRaw / 10.0f, 1);
    json += ",\"nitrogen\":" + String(latestReading.nitrogen);
    json += ",\"phosphorus\":" + String(latestReading.phosphorus);
    json += ",\"potassium\":" + String(latestReading.potassium);
    json += ",\"salinity\":" + String(latestReading.salinity);
    json += ",\"tds\":" + String(latestReading.tds);
    json += ",\"error\":\"" + latestReading.lastError + "\"";
    json += "}";
    return json;
}

String supabasePayloadJson() {
    String json = "{";
    json += "\"air_temperature\":";
    if (airSensorState.valid) {
        json += String(airSensorState.temperature, 2);
    } else {
        json += "null";
    }
    json += ",\"air_humidity\":";
    if (airSensorState.valid && airSensorState.humidityAvailable) {
        json += String(airSensorState.humidity, 2);
    } else {
        json += "null";
    }
    json += ",\"air_pressure\":";
    if (airSensorState.valid) {
        json += String(airSensorState.pressureHpa, 2);
    } else {
        json += "null";
    }
    json += ",\"temperature\":" + String(latestReading.temperatureRaw / 10.0f, 1);
    json += ",\"humidity\":" + String(latestReading.humidityRaw / 10.0f, 1);
    json += ",\"ph\":" + String(latestReading.phRaw / 10.0f, 1);
    json += ",\"conductivity\":" + String(latestReading.conductivity);
    json += ",\"nitrogen\":" + String(latestReading.nitrogen);
    json += ",\"phosphorus\":" + String(latestReading.phosphorus);
    json += ",\"potassium\":" + String(latestReading.potassium);
    json += ",\"salinity\":" + String(latestReading.salinity);
    json += ",\"tds\":" + String(latestReading.tds);
    json += ",\"lux\":";
    if (bh1750State.valid) {
        json += String(bh1750State.lux, 2);
    } else {
        json += "null";
    }
    json += "}";
    return json;
}

String wifiModeLabel() {
    return WiFi.getMode() == WIFI_AP ? "ap" : "station";
}

String activeIpAddress() {
    if (WiFi.getMode() == WIFI_AP) {
        return WiFi.softAPIP().toString();
    }
    return WiFi.localIP().toString();
}

String htmlEscape(const String& text) {
    String escaped = text;
    escaped.replace("&", "&amp;");
    escaped.replace("<", "&lt;");
    escaped.replace(">", "&gt;");
    escaped.replace("\"", "&quot;");
    escaped.replace("'", "&#39;");
    return escaped;
}

String extractJsonStringValue(const String& payload, const char* key) {
    const String quotedKey = String("\"") + key + "\":";
    const int keyIndex = payload.indexOf(quotedKey);
    if (keyIndex < 0) {
        return "";
    }

    int valueIndex = keyIndex + quotedKey.length();
    while (valueIndex < payload.length() && isspace(static_cast<unsigned char>(payload[valueIndex]))) {
        ++valueIndex;
    }
    if (valueIndex >= payload.length() || payload[valueIndex] != '"') {
        return "";
    }

    ++valueIndex;
    String value;
    bool escaped = false;
    while (valueIndex < payload.length()) {
        const char ch = payload[valueIndex++];
        if (escaped) {
            value += ch;
            escaped = false;
            continue;
        }
        if (ch == '\\') {
            escaped = true;
            continue;
        }
        if (ch == '"') {
            break;
        }
        value += ch;
    }
    return value;
}

bool ensureHubPairing(bool forceRetry) {
    if (pairedHubId.length() > 0) {
        pairingStatusMessage = "Huben er paret som " + pairedHubId + ".";
        return true;
    }

    if (configuredPairingCode.length() == 0) {
        pairingStatusMessage = "Skriv inn pairing-kode for å fullfore oppsettet.";
        return false;
    }

    if (strlen(DeviceConfig::BACKEND_BASE_URL) == 0) {
        pairingStatusMessage = "Manglende backend-adresse i firmware.";
        return false;
    }

    if (WiFi.status() != WL_CONNECTED) {
        pairingStatusMessage = "Venter pa Wi-Fi for aa pare huben.";
        return false;
    }

    const unsigned long now = millis();
    if (!forceRetry && now - lastPairingAttemptAt < 5000) {
        return false;
    }
    lastPairingAttemptAt = now;

    const String pairUrl = backendUrl(DeviceConfig::HUB_PAIR_PATH);
    if (pairUrl.length() == 0) {
        pairingStatusMessage = "Kunne ikke bygge pairing-URL.";
        return false;
    }

    String body = String("{\"pairing_token\":\"") + configuredPairingCode + "\"";
    body += ",\"local_ip\":\"" + WiFi.localIP().toString() + "\"}";

    HTTPClient http;
    http.setTimeout(5000);
    if (!http.begin(pairUrl)) {
        pairingStatusMessage = "Kunne ikke kontakte Growly backend.";
        return false;
    }

    http.addHeader("Content-Type", "application/json");
    const int statusCode = http.POST(body);
    const String responseBody = http.getString();
    http.end();

    if (statusCode <= 0) {
        pairingStatusMessage = "Pairing feilet: " + String(statusCode);
        return false;
    }

    if (statusCode < 200 || statusCode >= 300) {
        const String backendError = extractJsonStringValue(responseBody, "error");
        pairingStatusMessage = backendError.length() > 0 ? ("Pairing feilet: " + backendError) : ("Pairing feilet med HTTP " + String(statusCode));
        return false;
    }

    const String hubId = extractJsonStringValue(responseBody, "hub_id");
    if (hubId.length() == 0) {
        pairingStatusMessage = "Pairing-svar manglet hub-ID.";
        return false;
    }

    savePairedHubId(hubId);
    savePairingCode("");
    pairingStatusMessage = "Huben er paret som " + hubId + ".";
    Serial.printf("Hub pairing completed: %s\n", hubId.c_str());
    return true;
}

String authLabel(wifi_auth_mode_t authMode) {
    switch (authMode) {
        case WIFI_AUTH_OPEN:
            return "Open";
        case WIFI_AUTH_WEP:
            return "WEP";
        case WIFI_AUTH_WPA_PSK:
            return "WPA";
        case WIFI_AUTH_WPA2_PSK:
            return "WPA2";
        case WIFI_AUTH_WPA_WPA2_PSK:
            return "WPA/WPA2";
        case WIFI_AUTH_WPA2_ENTERPRISE:
            return "WPA2-ENT";
        case WIFI_AUTH_WPA3_PSK:
            return "WPA3";
        case WIFI_AUTH_WPA2_WPA3_PSK:
            return "WPA2/WPA3";
        default:
            return "Secure";
    }
}

String networkListHtml() {
    if (visibleNetworkCount == 0) {
        return "<p class='empty'>Fant ingen nettverk ennå. Trykk oppdater og prøv igjen.</p>";
    }

    String networkOptions;
    for (size_t i = 0; i < visibleNetworkCount; ++i) {
        networkOptions += "<label class='network-option'>";
        networkOptions += "<input type='radio' name='ssid' value='" + htmlEscape(visibleNetworks[i].ssid) + "'";
        if (configuredWifiSsid == visibleNetworks[i].ssid) {
            networkOptions += " checked";
        }
        networkOptions += ">";
        networkOptions += "<span><strong>" + htmlEscape(visibleNetworks[i].ssid) + "</strong>";
        networkOptions += "<small>" + authLabel(visibleNetworks[i].authMode) + " · " + String(visibleNetworks[i].rssi) + " dBm</small></span>";
        networkOptions += "</label>";
    }
    return networkOptions;
}

void loadWifiCredentials() {
    preferences.begin(DeviceConfig::PREFS_NAMESPACE, true);
    configuredWifiSsid = preferences.getString(DeviceConfig::PREFS_WIFI_SSID_KEY, "");
    configuredWifiPassword = preferences.getString(DeviceConfig::PREFS_WIFI_PASSWORD_KEY, "");
    preferences.end();

    configuredWifiSsid.trim();
    configuredWifiPassword.trim();
}

void saveWifiCredentials(const String& ssid, const String& password) {
    preferences.begin(DeviceConfig::PREFS_NAMESPACE, false);
    preferences.putString(DeviceConfig::PREFS_WIFI_SSID_KEY, ssid);
    preferences.putString(DeviceConfig::PREFS_WIFI_PASSWORD_KEY, password);
    preferences.end();
    configuredWifiSsid = ssid;
    configuredWifiPassword = password;
}

void clearWifiCredentials() {
    preferences.begin(DeviceConfig::PREFS_NAMESPACE, false);
    preferences.remove(DeviceConfig::PREFS_WIFI_SSID_KEY);
    preferences.remove(DeviceConfig::PREFS_WIFI_PASSWORD_KEY);
    preferences.remove(DeviceConfig::PREFS_PAIRING_CODE_KEY);
    preferences.remove(DeviceConfig::PREFS_HUB_ID_KEY);
    preferences.end();
    configuredWifiSsid = "";
    configuredWifiPassword = "";
    configuredPairingCode = "";
    pairedHubId = "";
    pairingStatusMessage = "Huben ble nullstilt. Klar for nytt oppsett.";
}

void scanVisibleNetworks() {
    Serial.println("Scanning nearby Wi-Fi networks");
    visibleNetworkCount = 0;

    WiFi.mode(WIFI_AP_STA);
    const int foundNetworks = WiFi.scanNetworks(false, true, false, 300, 0, nullptr, nullptr);
    if (foundNetworks <= 0) {
        Serial.println("No Wi-Fi networks found");
        WiFi.scanDelete();
        wifiScanLoaded = true;
        return;
    }

    for (int i = 0; i < foundNetworks; ++i) {
        const String ssid = WiFi.SSID(i);
        if (ssid.length() == 0) {
            continue;
        }

        const int32_t rssi = WiFi.RSSI(i);
        const wifi_auth_mode_t authMode = WiFi.encryptionType(i);

        bool replacedExisting = false;
        for (size_t existing = 0; existing < visibleNetworkCount; ++existing) {
            if (visibleNetworks[existing].ssid == ssid) {
                if (rssi > visibleNetworks[existing].rssi) {
                    visibleNetworks[existing].rssi = rssi;
                    visibleNetworks[existing].authMode = authMode;
                }
                replacedExisting = true;
                break;
            }
        }

        if (replacedExisting || visibleNetworkCount >= kMaxVisibleNetworks) {
            continue;
        }

        visibleNetworks[visibleNetworkCount++] = {ssid, rssi, authMode};
    }

    for (size_t i = 0; i < visibleNetworkCount; ++i) {
        for (size_t j = i + 1; j < visibleNetworkCount; ++j) {
            if (visibleNetworks[j].rssi > visibleNetworks[i].rssi) {
                const VisibleNetwork tmp = visibleNetworks[i];
                visibleNetworks[i] = visibleNetworks[j];
                visibleNetworks[j] = tmp;
            }
        }
    }

    lastWifiScanAt = millis();
    wifiScanLoaded = true;
    WiFi.scanDelete();
}

String captivePortalHtml(const String& message = "", bool error = false) {
    if (!wifiScanLoaded || millis() - lastWifiScanAt > DeviceConfig::WIFI_SCAN_REFRESH_MS) {
        scanVisibleNetworks();
    }

    String infoBanner;
    if (message.length() > 0) {
        infoBanner = "<div class='notice";
        if (error) {
            infoBanner += " error";
        }
        infoBanner += "'>" + htmlEscape(message) + "</div>";
    }

    const String pairingValue = htmlEscape(configuredPairingCode);
    const String pairedHubValue = htmlEscape(pairedHubId);
    const String pairingStatus = htmlEscape(pairingStatusMessage);

    String html = R"rawliteral(
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Growly Garden Setup</title>
  <style>
    :root {
      --bg: #f6f9f4;
      --bg-soft: #eef6e9;
      --panel: rgba(255, 255, 255, 0.78);
      --panel-strong: rgba(255, 255, 255, 0.94);
      --text: #183326;
      --muted: #647469;
      --line: rgba(72, 111, 82, 0.14);
      --accent: #2f9d64;
      --accent-soft: rgba(47, 157, 100, 0.12);
      --danger: #bd5548;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Avenir Next", "Segoe UI", Arial, sans-serif;
      color: var(--text);
      background:
        radial-gradient(circle at 12% 18%, rgba(52, 103, 62, 0.22), transparent 24%),
        radial-gradient(circle at 84% 78%, rgba(52, 103, 62, 0.16), transparent 22%),
        linear-gradient(180deg, var(--bg-soft) 0%, var(--bg) 100%);
      display: grid;
      place-items: center;
      padding: 20px;
    }
    .shell {
      width: min(100%, 760px);
      padding: 24px;
      border: 1px solid var(--line);
      border-radius: 28px;
      background: linear-gradient(180deg, var(--panel-strong) 0%, var(--panel) 100%);
      box-shadow: 0 18px 48px rgba(35, 76, 48, 0.12);
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 18px;
    }
    .brand-mark {
      width: 56px;
      height: 56px;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(47, 157, 100, 0.18) 0%, rgba(47, 157, 100, 0.06) 100%);
      border: 1px solid var(--line);
      display: grid;
      place-items: center;
      flex: 0 0 auto;
    }
    .brand-copy strong {
      display: block;
      font-size: 1rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .brand-copy span {
      display: block;
      color: var(--muted);
      margin-top: 4px;
      font-size: 0.92rem;
    }
    h1 { margin: 0 0 10px; font-size: clamp(2rem, 4vw, 3rem); line-height: 0.98; }
    p { color: var(--muted); line-height: 1.6; }
    .notice {
      margin: 18px 0;
      padding: 12px 14px;
      border-radius: 16px;
      background: var(--accent-soft);
      color: var(--accent);
      border: 1px solid var(--line);
    }
    .notice.error {
      background: rgba(240, 141, 116, 0.12);
      color: var(--danger);
      border-color: rgba(240, 141, 116, 0.18);
    }
    .section-label {
      margin: 20px 0 10px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.78rem;
      font-weight: 700;
    }
    .network-list {
      display: grid;
      gap: 10px;
      margin-bottom: 18px;
    }
    .network-option {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 14px;
      border-radius: 18px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.62);
    }
    .network-option small {
      display: block;
      margin-top: 6px;
      color: var(--muted);
    }
    .field {
      display: grid;
      gap: 8px;
      margin-bottom: 14px;
      font-weight: 700;
    }
    input[type="password"],
    input[type="text"] {
      width: 100%;
      padding: 13px 14px;
      border-radius: 16px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.92);
      color: var(--text);
      font: inherit;
    }
    .pairing-input {
      font-size: 1.4rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      text-align: center;
    }
    .pairing-status {
      margin-top: 8px;
      color: var(--muted);
      font-size: 0.92rem;
    }
    .detail-list {
      display: grid;
      gap: 10px;
      margin: 18px 0 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 14px;
      border-radius: 16px;
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.62);
      color: var(--muted);
    }
    .detail-row strong {
      color: var(--text);
      text-align: right;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 18px;
    }
    button, .link-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 44px;
      padding: 10px 16px;
      border-radius: 999px;
      border: 1px solid transparent;
      text-decoration: none;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    button {
      background: var(--accent);
      color: #f6f9f4;
    }
    .link-button {
      color: var(--text);
      border-color: var(--line);
      background: rgba(255, 255, 255, 0.72);
    }
  </style>
</head>
<body>
  <main class="shell">
    <div class="brand">
      <div class="brand-mark" aria-hidden="true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M6 15C6 10 9.5 6.5 15 6C15.5 11.5 12 15 7 15H6Z" stroke="#2F9D64" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 18C12 14.5 14.5 12 18 12C18 15.5 15.5 18 12 18Z" stroke="#2F9D64" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="brand-copy">
        <strong>Growly Garden</strong>
        <span>Sett opp huben din og koble den til kontoen din.</span>
      </div>
    </div>
    <p class="section-label">Oppsett</p>
    <h1>Koble Growly Hub til Wi-Fi</h1>
    <p>Velg nettverket du vil bruke, og skriv inn pairing-koden fra Growly Garden-appen. Like mesh-navn vises bare én gang, så listen blir ryddigere.</p>
)rawliteral";

    html += infoBanner;
    html += "<p class='section-label'>Nettverk i nærheten</p><form method='post' action='/configure'><div id='network-list' class='network-list'>";
    html += networkListHtml();
    html += "</div>";
    html += "<label class='field'><span>Passord</span><input type='password' name='password' placeholder='Skriv inn Wi-Fi-passord'></label>";
    html += "<label class='field'><span>Pairing-kode</span><input class='pairing-input' type='text' name='pairing_code' inputmode='numeric' maxlength='6' placeholder='123456' value='" + pairingValue + "'></label>";
    html += "<p class='pairing-status'>" + pairingStatus + "</p>";
    html += "<div class='detail-list'>";
    html += "<div class='detail-row'><span>Hub-ID</span><strong>" + (pairedHubValue.length() > 0 ? pairedHubValue : String("Tildeles automatisk")) + "</strong></div>";
    html += "<div class='detail-row'><span>Enhetsnavn</span><strong>" + htmlEscape(DeviceConfig::DEVICE_NAME) + "</strong></div>";
    html += "</div>";
    html += "<div class='actions'><button type='submit'>Koble til</button><a class='link-button' href='/refresh'>Oppdater liste</a></div></form>";
    html += "<p>Tips: hold BOOT inne i ca. 2 sekunder under oppstart for setup-modus, eller i 10 sekunder for full nullstilling av Wi-Fi og pairing.</p>";
    html += "</main></body></html>";
    return html;
}

BootAction detectBootAction() {
    pinMode(DeviceConfig::WIFI_RESET_BUTTON_PIN, INPUT_PULLUP);
    if (digitalRead(DeviceConfig::WIFI_RESET_BUTTON_PIN) != LOW) {
        return BootAction::None;
    }

    Serial.println("BOOT detected during startup. Hold for setup mode or keep holding for full reset.");
    const unsigned long startedAt = millis();
    while (millis() - startedAt < DeviceConfig::WIFI_RESET_HOLD_MS) {
        if (digitalRead(DeviceConfig::WIFI_RESET_BUTTON_PIN) != LOW) {
            const unsigned long heldMs = millis() - startedAt;
            if (heldMs >= DeviceConfig::WIFI_FORCE_SETUP_HOLD_MS) {
                Serial.println("Force setup mode confirmed.");
                return BootAction::ForceSetup;
            }
            Serial.println("BOOT released too early. Continuing normal startup.");
            return BootAction::None;
        }
        delay(50);
    }

    Serial.println("Wi-Fi reset confirmed.");
    return BootAction::FactoryReset;
}

void triggerWifiFactoryReset() {
    if (wifiResetTriggered) {
        return;
    }

    wifiResetTriggered = true;
    Serial.println("Resetting saved Wi-Fi settings now.");
    clearWifiCredentials();
    delay(200);
    Serial.println("Restarting device...");
    delay(300);
    ESP.restart();
}

void handleWifiResetButton() {
    const bool pressed = digitalRead(DeviceConfig::WIFI_RESET_BUTTON_PIN) == LOW;

    if (!pressed) {
        if (wifiResetCounting) {
            Serial.println("Wi-Fi reset cancelled.");
        }
        wifiResetCounting = false;
        wifiResetStartedAt = 0;
        wifiResetLastNoticeAt = 0;
        return;
    }

    if (!wifiResetCounting) {
        wifiResetCounting = true;
        wifiResetStartedAt = millis();
        wifiResetLastNoticeAt = 0;
        Serial.println("Hold BOOT to reset saved Wi-Fi...");
        return;
    }

    const unsigned long heldMs = millis() - wifiResetStartedAt;
    if (millis() - wifiResetLastNoticeAt >= 1000) {
        wifiResetLastNoticeAt = millis();
        const unsigned long secondsLeft =
            (DeviceConfig::WIFI_RESET_HOLD_MS > heldMs)
                ? (DeviceConfig::WIFI_RESET_HOLD_MS - heldMs + 999) / 1000
                : 0;
        Serial.printf("Keep holding BOOT... %lu second(s) left\n", secondsLeft);
    }

    if (heldMs >= DeviceConfig::WIFI_RESET_HOLD_MS) {
        triggerWifiFactoryReset();
    }
}

bool connectToStoredWifi() {
    if (configuredWifiSsid.length() == 0) {
        Serial.println("No saved Wi-Fi credentials found.");
        return false;
    }

    WiFi.mode(WIFI_STA);
    WiFi.begin(configuredWifiSsid.c_str(), configuredWifiPassword.c_str());

    Serial.print("Connecting to saved Wi-Fi ");
    Serial.println(configuredWifiSsid);

    const unsigned long startedAt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startedAt < DeviceConfig::WIFI_CONNECT_TIMEOUT_MS) {
        delay(400);
        Serial.print(".");
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("Connected with IP ");
        Serial.println(WiFi.localIP());
        return true;
    }

    Serial.println("Saved Wi-Fi connection failed.");
    WiFi.disconnect(true, true);
    return false;
}

void stopCaptivePortal() {
    if (!captivePortalActive) {
        return;
    }
    dnsServer.stop();
    WiFi.softAPdisconnect(true);
    captivePortalActive = false;
}

void startCaptivePortal() {
    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(DeviceConfig::AP_SSID);
    dnsServer.start(kDnsPort, "*", WiFi.softAPIP());
    captivePortalActive = true;
    if (!wifiScanLoaded) {
        scanVisibleNetworks();
    }

    Serial.print("Captive portal ready on SSID ");
    Serial.println(DeviceConfig::AP_SSID);
    Serial.print("Portal IP ");
    Serial.println(WiFi.softAPIP());
}

void handleRoot() {
    if (captivePortalActive) {
        server.send(200, "text/html", captivePortalHtml());
        return;
    }

    server.send(200, "text/plain", "Growly ESP32-S3 is running\nHub: " + pairedHubId + "\nStatus: " + pairingStatusMessage);
}

void handleHealth() {
    const String json =
        String("{\"status\":\"ok\",\"device\":\"") + DeviceConfig::DEVICE_NAME +
        "\",\"mode\":\"" + wifiModeLabel() +
        "\",\"ip\":\"" + activeIpAddress() +
        "\",\"wifi_ssid\":\"" + configuredWifiSsid +
        "\",\"hub_id\":\"" + pairedHubId +
        "\",\"pairing_status\":\"" + pairingStatusMessage + "\"}";
    server.send(200, "application/json", json);
}

void handleSensor() {
    server.send(200, "application/json", sensorReadingJson());
}

void handleDeviceSettingsGet() {
    server.send(200, "application/json", sampleIntervalsJson());
}

void handleDeviceSettingsPost() {
    if (!server.hasArg("sample_time_soil_ms") ||
        !server.hasArg("sample_time_light_ms") ||
        !server.hasArg("sample_time_air_ms") ||
        !server.hasArg("sample_time_cloud_ms")) {
        server.send(400, "application/json", "{\"ok\":false,\"error\":\"missing_settings\"}");
        return;
    }

    soilSampleIntervalMs = sanitizeSampleInterval(server.arg("sample_time_soil_ms").toInt());
    lightSampleIntervalMs = sanitizeSampleInterval(server.arg("sample_time_light_ms").toInt());
    airSampleIntervalMs = sanitizeSampleInterval(server.arg("sample_time_air_ms").toInt());
    cloudSampleIntervalMs = sanitizeSampleInterval(server.arg("sample_time_cloud_ms").toInt());
    saveSampleIntervals();

    server.send(200, "application/json", sampleIntervalsJson());
}

void handleWifiScan() {
    scanVisibleNetworks();
    server.send(200, "text/html", captivePortalHtml("Wi-Fi-listen er oppdatert."));
}

void handleWifiConfigure() {
    String selectedSsid = server.arg("ssid");
    const String password = server.arg("password");
    String pairingCode = server.arg("pairing_code");
    pairingCode.replace(" ", "");
    pairingCode.trim();

    if (selectedSsid.length() == 0) {
        server.send(200, "text/html", captivePortalHtml("Velg et nettverk fra listen for aa fortsette.", true));
        return;
    }
    if (pairingCode.length() != 6) {
        server.send(200, "text/html", captivePortalHtml("Skriv inn den 6-sifrede pairing-koden fra Growly Garden-appen.", true));
        return;
    }

    saveWifiCredentials(selectedSsid, password);
    savePairingCode(pairingCode);
    pairingStatusMessage = "Prøver aa koble til Wi-Fi og fullfore pairing.";
    server.send(200, "text/html", captivePortalHtml("Prøver aa koble til " + selectedSsid + ". Growly fullforer pairing naar nettet er klart."));
    delay(600);

    if (connectToStoredWifi()) {
        stopCaptivePortal();
        if (ensureHubPairing(true)) {
            pollSensor(latestReading);
            printSensorReading();
            return;
        }
        pairingStatusMessage = "Wi-Fi er koblet til. Growly fortsetter pairing i bakgrunnen.";
        return;
    }

    startCaptivePortal();
}

void handleCaptiveProbe() {
    server.sendHeader("Location", String("http://") + WiFi.softAPIP().toString() + "/", true);
    server.send(302, "text/plain", "");
}

void handleNotFound() {
    if (captivePortalActive) {
        handleCaptiveProbe();
        return;
    }

    server.send(404, "application/json", "{\"error\":\"not_found\"}");
}

void setupRs485() {
    pinMode(DeviceConfig::RS485_DIR_PIN, OUTPUT);
    setReceiveMode();
    rs485Serial.begin(
        DeviceConfig::RS485_BAUD,
        SERIAL_8N1,
        DeviceConfig::RS485_RX_PIN,
        DeviceConfig::RS485_TX_PIN);

    Serial.printf(
        "RS485 ready: TX=%d RX=%d DIR=%d baud=%lu slave=%u\n",
        DeviceConfig::RS485_TX_PIN,
        DeviceConfig::RS485_RX_PIN,
        DeviceConfig::RS485_DIR_PIN,
        DeviceConfig::RS485_BAUD,
        DeviceConfig::SENSOR_SLAVE_ADDRESS);
}

void printSensorReading() {
    if (!latestReading.valid) {
        Serial.print("Sensor read failed: ");
        Serial.println(latestReading.lastError);
        return;
    }

    Serial.printf(
        "Sensor OK | humidity=%.1f temperature=%.1f conductivity=%u ph=%.1f N=%u P=%u K=%u salinity=%u tds=%u\n",
        latestReading.humidityRaw / 10.0f,
        latestReading.temperatureRaw / 10.0f,
        latestReading.conductivity,
        latestReading.phRaw / 10.0f,
        latestReading.nitrogen,
        latestReading.phosphorus,
        latestReading.potassium,
        latestReading.salinity,
        latestReading.tds);
}

void uploadSensorReadingToBackend() {
    if (strlen(DeviceConfig::BACKEND_INGEST_URL) == 0) {
        return;
    }

    if (WiFi.status() != WL_CONNECTED || captivePortalActive || !latestReading.valid) {
        return;
    }
    if (pairedHubId.length() == 0) {
        return;
    }

    if (millis() - lastBackendUploadAt < cloudSampleIntervalMs) {
        return;
    }

    lastBackendUploadAt = millis();

    HTTPClient http;
    http.setTimeout(4000);
    if (!http.begin(DeviceConfig::BACKEND_INGEST_URL)) {
        Serial.println("Backend upload skipped: invalid URL");
        return;
    }

    http.addHeader("Content-Type", "application/json");
    const int statusCode = http.POST(sensorReadingJson());
    if (statusCode > 0) {
        Serial.printf("Backend upload OK: HTTP %d\n", statusCode);
    } else {
        Serial.printf("Backend upload failed: %s\n", http.errorToString(statusCode).c_str());
    }
    http.end();
}

void sendToSupabase() {
    if (WiFi.status() != WL_CONNECTED || captivePortalActive) {
        return;
    }
    if (pairedHubId.length() == 0) {
        return;
    }

    if (millis() - lastSupabaseUploadAt < cloudSampleIntervalMs) {
        return;
    }

    lastSupabaseUploadAt = millis();

    HTTPClient http;
    http.setTimeout(5000);
    if (!http.begin(DeviceConfig::SUPABASE_REST_ENDPOINT)) {
        Serial.println("Supabase upload skipped: invalid URL");
        return;
    }

    http.addHeader("Content-Type", "application/json");
    http.addHeader("apikey", DeviceConfig::SUPABASE_API_KEY);
    http.addHeader("Authorization", String("Bearer ") + DeviceConfig::SUPABASE_API_KEY);

    const String payload = supabasePayloadJson();
    const int statusCode = http.POST(payload);
    Serial.printf("Supabase HTTP response: %d\n", statusCode);
    if (statusCode > 0) {
        const String responseBody = http.getString();
        if (responseBody.length() > 0) {
            Serial.printf("Supabase response body: %s\n", responseBody.c_str());
        }
    } else {
        Serial.printf("Supabase request failed: %s\n", http.errorToString(statusCode).c_str());
    }
    http.end();
}

void registerRoutes() {
    server.on("/", HTTP_GET, handleRoot);
    server.on("/health", HTTP_GET, handleHealth);
    server.on("/sensor", HTTP_GET, handleSensor);
    server.on("/device-settings", HTTP_GET, handleDeviceSettingsGet);
    server.on("/device-settings", HTTP_POST, handleDeviceSettingsPost);
    server.on("/refresh", HTTP_GET, handleWifiScan);
    server.on("/configure", HTTP_POST, handleWifiConfigure);
    server.on("/generate_204", HTTP_GET, handleCaptiveProbe);
    server.on("/hotspot-detect.html", HTTP_GET, handleCaptiveProbe);
    server.on("/connecttest.txt", HTTP_GET, handleCaptiveProbe);
    server.on("/ncsi.txt", HTTP_GET, handleCaptiveProbe);
    server.onNotFound(handleNotFound);
    server.begin();
}
}  // namespace

void setup() {
    Serial.begin(115200);
    delay(1200);
    pinMode(DeviceConfig::WIFI_RESET_BUTTON_PIN, INPUT_PULLUP);
    setupStatusLed();

    Serial.println();
    Serial.println("Booting Growly ESP32-S3");

    const BootAction bootAction = detectBootAction();
    if (bootAction == BootAction::FactoryReset) {
        clearWifiCredentials();
    } else {
        loadWifiCredentials();
        loadPairingState();
    }
    loadSampleIntervals();

    if (bootAction == BootAction::ForceSetup) {
        pairingStatusMessage = "Setup-modus aktivert fra BOOT-knappen.";
        startCaptivePortal();
    } else if (!connectToStoredWifi()) {
        startCaptivePortal();
    } else if (!ensureHubPairing(true) && configuredPairingCode.length() == 0) {
        startCaptivePortal();
    }

    setupBh1750();
    scanI2cDevices();
    setupAirSensor();
    setupRs485();
    pollBh1750();
    pollAirSensor();
    pollSensor(latestReading);
    lastLightPollAt = millis();
    lastSoilPollAt = millis();
    printSensorReading();
    registerRoutes();

    Serial.println("HTTP server started");
}

void loop() {
    updateStatusLed();
    handleWifiResetButton();
    server.handleClient();
    if (captivePortalActive) {
        dnsServer.processNextRequest();
    }

    if (millis() - lastLightPollAt >= lightSampleIntervalMs) {
        lastLightPollAt = millis();
        pollBh1750();
    }

    if (airSensorState.available && millis() - airSensorState.lastReadAt >= airSampleIntervalMs) {
        pollAirSensor();
    }

    if (millis() - lastSoilPollAt >= soilSampleIntervalMs) {
        lastSoilPollAt = millis();
        pollSensor(latestReading);
        printSensorReading();
    }

    if (WiFi.status() == WL_CONNECTED && pairedHubId.length() == 0 && configuredPairingCode.length() > 0) {
        ensureHubPairing(false);
    }

    // Call Supabase upload from loop so the existing sensor-reading flow stays intact.
    sendToSupabase();
    uploadSensorReadingToBackend();
}
