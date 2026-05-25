#include <Arduino.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <Update.h>
#include <esp_now.h>
#include <esp_sleep.h>
#include <esp_wifi.h>

#include "device_config.h"
#include "soil_now_protocol.h"

namespace {
constexpr char kFirmwareVersion[] = "0.1.11-sleep-confirm";
constexpr char kPrefsNamespace[] = "growly_soil";
constexpr char kPrefsSsidKey[] = "ssid";
constexpr char kPrefsPasswordKey[] = "password";
constexpr char kPrefsHubIdKey[] = "hub_id";
constexpr char kPrefsSensorIdKey[] = "sensor_id";
constexpr char kPrefsChannelKey[] = "channel";
constexpr char kPrefsSleepSecondsKey[] = "sleep_s";
constexpr char kPrefsBatteryWarnKey[] = "bat_warn";
constexpr char kPrefsBatteryCritKey[] = "bat_crit";
constexpr uint8_t kBroadcastMac[ESP_NOW_ETH_ALEN] = {0xff, 0xff, 0xff, 0xff, 0xff, 0xff};
constexpr int kBootButtonPin = 0;
constexpr int kDhtPin = 22;
constexpr int kSoilAdcPin = 32;
constexpr int kBatteryAdcPin = 34;
constexpr int kStatusLedPins[] = {16};
constexpr bool kStatusLedActiveLow = true;
constexpr int kDhtType = DHT11;
constexpr uint16_t kSoilRawWet = 1300;
constexpr uint16_t kSoilRawDry = 3200;
constexpr float kBatteryDividerRatio = 2.0f;
constexpr uint8_t kAnalogSampleCount = 16;
constexpr uint16_t kBatteryDisconnectedRaw = 4;
constexpr uint32_t kDefaultSleepSeconds = 30UL * 60UL;
constexpr uint64_t kPairingRetrySleepUs = 30ULL * 1000000ULL;
constexpr unsigned long kPairingAttemptMs = 4UL * 60UL * 1000UL;
constexpr unsigned long kPairingPerChannelMs = 1200;
constexpr unsigned long kSampleAckTimeoutMs = 15000;
constexpr unsigned long kWifiConnectTimeoutMs = 15000;
constexpr unsigned long kStartupConfirmWindowMs = 3UL * 60UL * 1000UL;
constexpr unsigned long kStartupConfirmSampleIntervalMs = 15UL * 1000UL;
constexpr unsigned long kStartupConfirmLedBlinkMs = 700;

Preferences preferences;
DHT dht(kDhtPin, kDhtType);

String configuredWifiSsid;
String configuredWifiPassword;
String pairedHubId;
String sensorId;
uint8_t pairedWifiChannel = 0;
bool espNowReady = false;
uint32_t configuredSleepSeconds = kDefaultSleepSeconds;
uint8_t batteryWarningPercent = 30;
uint8_t batteryCriticalPercent = 15;
bool pendingFirmwareUpdateAvailable = false;
char pendingFirmwareVersion[SoilNow::FIRMWARE_VERSION_LENGTH] = {0};
char pendingFirmwareUrl[SoilNow::FIRMWARE_URL_LENGTH] = {0};

portMUX_TYPE nowMux = portMUX_INITIALIZER_UNLOCKED;
volatile bool pairConfigReceived = false;
volatile bool sampleAckReceived = false;
SoilNow::PairConfigPacket receivedPairConfig = {};
uint32_t expectedSampleAckSequence = 0;

struct SoilSample {
    uint16_t soilRaw = 0;
    uint8_t soilPercent = 0;
    int16_t airTemperatureCenti = -32768;
    int16_t airHumidityCenti = -1;
    uint16_t batteryMillivolts = 0;
    uint8_t batteryPercent = 255;
};

String backendUrl(const char* path) {
    String base = DeviceConfig::BACKEND_BASE_URL;
    base.trim();
    if (base.endsWith("/")) {
        base.remove(base.length() - 1);
    }
    return base + String(path);
}

String jsonEscape(const String& value) {
    String escaped;
    escaped.reserve(value.length() + 8);
    for (size_t i = 0; i < value.length(); ++i) {
        const char c = value[i];
        switch (c) {
            case '"':
                escaped += "\\\"";
                break;
            case '\\':
                escaped += "\\\\";
                break;
            case '\n':
                escaped += "\\n";
                break;
            case '\r':
                escaped += "\\r";
                break;
            case '\t':
                escaped += "\\t";
                break;
            default:
                escaped += c;
                break;
        }
    }
    return escaped;
}

long extractJsonLongValue(const String& payload, const char* key, long fallback) {
    const String quotedKey = String("\"") + key + "\":";
    const int keyIndex = payload.indexOf(quotedKey);
    if (keyIndex < 0) {
        return fallback;
    }
    int valueIndex = keyIndex + quotedKey.length();
    while (valueIndex < payload.length() && isspace(static_cast<unsigned char>(payload[valueIndex]))) {
        ++valueIndex;
    }
    bool negative = false;
    if (valueIndex < payload.length() && payload[valueIndex] == '-') {
        negative = true;
        ++valueIndex;
    }
    long value = 0;
    bool foundDigit = false;
    while (valueIndex < payload.length() && isdigit(static_cast<unsigned char>(payload[valueIndex]))) {
        foundDigit = true;
        value = value * 10 + (payload[valueIndex] - '0');
        ++valueIndex;
    }
    return foundDigit ? (negative ? -value : value) : fallback;
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

bool extractJsonBoolValue(const String& payload, const char* key, bool fallback) {
    const String quotedKey = String("\"") + key + "\":";
    const int keyIndex = payload.indexOf(quotedKey);
    if (keyIndex < 0) {
        return fallback;
    }
    int valueIndex = keyIndex + quotedKey.length();
    while (valueIndex < payload.length() && isspace(static_cast<unsigned char>(payload[valueIndex]))) {
        ++valueIndex;
    }
    if (payload.substring(valueIndex, valueIndex + 4) == "true") {
        return true;
    }
    if (payload.substring(valueIndex, valueIndex + 5) == "false") {
        return false;
    }
    return fallback;
}

String extractJsonObjectValue(const String& payload, const char* key) {
    const String quotedKey = String("\"") + key + "\":";
    const int keyIndex = payload.indexOf(quotedKey);
    if (keyIndex < 0) {
        return "";
    }
    int valueIndex = keyIndex + quotedKey.length();
    while (valueIndex < payload.length() && isspace(static_cast<unsigned char>(payload[valueIndex]))) {
        ++valueIndex;
    }
    if (valueIndex >= payload.length() || payload[valueIndex] != '{') {
        return "";
    }

    int depth = 0;
    bool inString = false;
    bool escaped = false;
    for (int index = valueIndex; index < static_cast<int>(payload.length()); ++index) {
        const char ch = payload[index];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (ch == '\\') {
                escaped = true;
            } else if (ch == '"') {
                inString = false;
            }
            continue;
        }
        if (ch == '"') {
            inString = true;
        } else if (ch == '{') {
            ++depth;
        } else if (ch == '}') {
            --depth;
            if (depth == 0) {
                return payload.substring(valueIndex, index + 1);
            }
        }
    }
    return "";
}

int firstDigitIndex(const String& version) {
    for (int index = 0; index < static_cast<int>(version.length()); ++index) {
        if (isdigit(static_cast<unsigned char>(version[index]))) {
            return index;
        }
    }
    return -1;
}

String firmwareCoreVersion(const String& version) {
    const int start = firstDigitIndex(version);
    if (start < 0) {
        return "";
    }
    String core;
    for (int index = start; index < static_cast<int>(version.length()); ++index) {
        const char ch = version[index];
        if (!isdigit(static_cast<unsigned char>(ch)) && ch != '.') {
            break;
        }
        core += ch;
    }
    return core;
}

bool isFirmwareCandidateNewer(const String& candidate, const String& current) {
    const String candidateCore = firmwareCoreVersion(candidate);
    const String currentCore = firmwareCoreVersion(current);
    if (candidateCore.length() == 0) {
        return false;
    }
    if (currentCore.length() == 0) {
        return true;
    }

    int candidateIndex = 0;
    int currentIndex = 0;
    while (candidateIndex < static_cast<int>(candidateCore.length()) || currentIndex < static_cast<int>(currentCore.length())) {
        long candidatePart = 0;
        while (candidateIndex < static_cast<int>(candidateCore.length()) && candidateCore[candidateIndex] != '.') {
            candidatePart = candidatePart * 10 + (candidateCore[candidateIndex++] - '0');
        }
        long currentPart = 0;
        while (currentIndex < static_cast<int>(currentCore.length()) && currentCore[currentIndex] != '.') {
            currentPart = currentPart * 10 + (currentCore[currentIndex++] - '0');
        }
        if (candidatePart != currentPart) {
            return candidatePart > currentPart;
        }
        if (candidateIndex < static_cast<int>(candidateCore.length()) && candidateCore[candidateIndex] == '.') {
            ++candidateIndex;
        }
        if (currentIndex < static_cast<int>(currentCore.length()) && currentCore[currentIndex] == '.') {
            ++currentIndex;
        }
    }
    return false;
}

bool beginHttpClient(HTTPClient& http, WiFiClient& plainClient, WiFiClientSecure& secureClient, const String& url) {
    if (url.startsWith("https://")) {
        secureClient.setInsecure();
        secureClient.setHandshakeTimeout(30);
        secureClient.setTimeout(30000);
        http.setReuse(false);
        return http.begin(secureClient, url);
    }
    plainClient.setTimeout(30000);
    http.setReuse(false);
    return http.begin(plainClient, url);
}

String compactMacId() {
    String mac = WiFi.macAddress();
    mac.toLowerCase();
    mac.replace(":", "");
    return "soil-" + mac;
}

void loadConfig() {
    preferences.begin(kPrefsNamespace, false);
    configuredWifiSsid = preferences.getString(kPrefsSsidKey, "");
    configuredWifiPassword = preferences.getString(kPrefsPasswordKey, "");
    pairedHubId = preferences.getString(kPrefsHubIdKey, "");
    sensorId = preferences.getString(kPrefsSensorIdKey, "");
    pairedWifiChannel = preferences.getUChar(kPrefsChannelKey, 0);
    configuredSleepSeconds = preferences.getUInt(kPrefsSleepSecondsKey, kDefaultSleepSeconds);
    batteryWarningPercent = preferences.getUChar(kPrefsBatteryWarnKey, 30);
    batteryCriticalPercent = preferences.getUChar(kPrefsBatteryCritKey, 15);
    preferences.end();

    configuredWifiSsid.trim();
    configuredWifiPassword.trim();
    pairedHubId.trim();
    sensorId.trim();
    if (sensorId.length() == 0) {
        sensorId = compactMacId();
    }
    configuredSleepSeconds = min<uint32_t>(7200, max<uint32_t>(300, configuredSleepSeconds));
    batteryWarningPercent = min<uint8_t>(100, max<uint8_t>(2, batteryWarningPercent));
    batteryCriticalPercent = min<uint8_t>(batteryWarningPercent - 1, max<uint8_t>(1, batteryCriticalPercent));
}

void saveSleepPlan(uint32_t sleepSeconds, uint8_t warningPercent, uint8_t criticalPercent, const char* source) {
    const uint32_t previousSleepSeconds = configuredSleepSeconds;
    const uint8_t previousWarningPercent = batteryWarningPercent;
    const uint8_t previousCriticalPercent = batteryCriticalPercent;

    configuredSleepSeconds = min<uint32_t>(7200, max<uint32_t>(300, sleepSeconds));
    batteryWarningPercent = min<uint8_t>(100, max<uint8_t>(2, warningPercent));
    batteryCriticalPercent = min<uint8_t>(batteryWarningPercent - 1, max<uint8_t>(1, criticalPercent));
    preferences.begin(kPrefsNamespace, false);
    preferences.putUInt(kPrefsSleepSecondsKey, configuredSleepSeconds);
    preferences.putUChar(kPrefsBatteryWarnKey, batteryWarningPercent);
    preferences.putUChar(kPrefsBatteryCritKey, batteryCriticalPercent);
    preferences.end();

    const bool changed =
        previousSleepSeconds != configuredSleepSeconds ||
        previousWarningPercent != batteryWarningPercent ||
        previousCriticalPercent != batteryCriticalPercent;
    Serial.printf(
        "Sleep plan confirmed via %s: next_sleep=%lus warning=%u%% critical=%u%% %s\n",
        source ? source : "unknown",
        static_cast<unsigned long>(configuredSleepSeconds),
        batteryWarningPercent,
        batteryCriticalPercent,
        changed ? "updated" : "unchanged");
}

void rememberFirmwareUpdate(const String& version, const String& url, bool updateAvailable) {
    pendingFirmwareUpdateAvailable =
        updateAvailable &&
        version.length() > 0 &&
        url.length() > 0 &&
        isFirmwareCandidateNewer(version, kFirmwareVersion);
    memset(pendingFirmwareVersion, 0, sizeof(pendingFirmwareVersion));
    memset(pendingFirmwareUrl, 0, sizeof(pendingFirmwareUrl));
    if (pendingFirmwareUpdateAvailable) {
        SoilNow::copyCString(pendingFirmwareVersion, sizeof(pendingFirmwareVersion), version);
        SoilNow::copyCString(pendingFirmwareUrl, sizeof(pendingFirmwareUrl), url);
    }
}

void rememberFirmwareUpdateFromResponse(const String& responseBody) {
    const String firmwareObject = extractJsonObjectValue(responseBody, "firmware");
    const String source = firmwareObject.length() > 0 ? firmwareObject : responseBody;
    rememberFirmwareUpdate(
        extractJsonStringValue(source, "latest_version"),
        extractJsonStringValue(source, "url"),
        extractJsonBoolValue(source, "update_available", false));
}

void savePairConfig(const SoilNow::PairConfigPacket& config) {
    sensorId = SoilNow::packetString(config.sensorId, sizeof(config.sensorId));
    pairedHubId = SoilNow::packetString(config.hubId, sizeof(config.hubId));
    configuredWifiSsid = SoilNow::packetString(config.ssid, sizeof(config.ssid));
    configuredWifiPassword = SoilNow::packetString(config.password, sizeof(config.password));
    pairedWifiChannel = config.wifiChannel;

    preferences.begin(kPrefsNamespace, false);
    preferences.putString(kPrefsSensorIdKey, sensorId);
    preferences.putString(kPrefsHubIdKey, pairedHubId);
    preferences.putString(kPrefsSsidKey, configuredWifiSsid);
    preferences.putString(kPrefsPasswordKey, configuredWifiPassword);
    preferences.putUChar(kPrefsChannelKey, pairedWifiChannel);
    preferences.end();
    saveSleepPlan(config.defaultSleepSeconds, config.batteryWarningPercent, config.batteryCriticalPercent, "pairing");
}

void clearConfig() {
    preferences.begin(kPrefsNamespace, false);
    preferences.clear();
    preferences.end();
    configuredWifiSsid = "";
    configuredWifiPassword = "";
    pairedHubId = "";
    pairedWifiChannel = 0;
    sensorId = compactMacId();
}

void setStatusLed(bool on) {
    for (int pin : kStatusLedPins) {
        const uint8_t activeLevel = kStatusLedActiveLow ? LOW : HIGH;
        const uint8_t inactiveLevel = kStatusLedActiveLow ? HIGH : LOW;
        digitalWrite(pin, on ? activeLevel : inactiveLevel);
    }
}

void blinkStatusLed(unsigned count, unsigned delayMs) {
    for (unsigned index = 0; index < count; ++index) {
        setStatusLed(true);
        delay(delayMs);
        setStatusLed(false);
        delay(delayMs);
    }
}

void setEspNowChannel(uint8_t channel) {
    if (channel < SoilNow::CHANNEL_MIN || channel > SoilNow::CHANNEL_MAX) {
        return;
    }
    esp_wifi_set_promiscuous(true);
    esp_wifi_set_channel(channel, WIFI_SECOND_CHAN_NONE);
    esp_wifi_set_promiscuous(false);
}

bool ensurePeer(const uint8_t* mac) {
    if (esp_now_is_peer_exist(mac)) {
        return true;
    }
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, mac, ESP_NOW_ETH_ALEN);
    peer.channel = 0;
    peer.ifidx = WIFI_IF_STA;
    peer.encrypt = false;
    return esp_now_add_peer(&peer) == ESP_OK;
}

#if ESP_ARDUINO_VERSION_MAJOR >= 3
void onEspNowReceive(const esp_now_recv_info_t* info, const uint8_t* data, int length) {
    if (!info || !info->src_addr || !data || length < 2) {
        return;
    }
#else
void onEspNowReceive(const uint8_t*, const uint8_t* data, int length) {
    if (!data || length < 2) {
        return;
    }
#endif
    if (data[0] != SoilNow::VERSION) {
        return;
    }
    if (data[1] == SoilNow::PairConfig && length == static_cast<int>(sizeof(SoilNow::PairConfigPacket))) {
        portENTER_CRITICAL_ISR(&nowMux);
        memcpy(&receivedPairConfig, data, sizeof(receivedPairConfig));
        pairConfigReceived = true;
        portEXIT_CRITICAL_ISR(&nowMux);
        return;
    }
    if (data[1] == SoilNow::SampleAck && length == static_cast<int>(sizeof(SoilNow::SampleAckPacket))) {
        SoilNow::SampleAckPacket ack = {};
        memcpy(&ack, data, sizeof(ack));
        if (ack.sequence == expectedSampleAckSequence) {
            saveSleepPlan(ack.nextSleepSeconds, ack.batteryWarningPercent, ack.batteryCriticalPercent, "esp-now-ack");
            memcpy(pendingFirmwareVersion, ack.firmwareVersion, sizeof(pendingFirmwareVersion));
            memcpy(pendingFirmwareUrl, ack.firmwareUrl, sizeof(pendingFirmwareUrl));
            pendingFirmwareUpdateAvailable = ack.firmwareUpdateAvailable == 1;
            sampleAckReceived = true;
        }
    }
}

bool initEspNow() {
    if (espNowReady) {
        return true;
    }
    WiFi.mode(WIFI_STA);
    if (esp_now_init() != ESP_OK) {
        Serial.println("ESP-NOW init failed.");
        return false;
    }
    esp_now_set_pmk(reinterpret_cast<uint8_t*>(const_cast<char*>(SoilNow::PMK)));
    esp_now_register_recv_cb(onEspNowReceive);
    espNowReady = true;
    return ensurePeer(kBroadcastMac);
}

void stopEspNow() {
    if (!espNowReady) {
        return;
    }
    esp_now_deinit();
    espNowReady = false;
}

bool sendPairRequest(uint8_t channel, uint32_t nonce) {
    if (!initEspNow()) {
        return false;
    }
    setEspNowChannel(channel);
    ensurePeer(kBroadcastMac);

    SoilNow::PairRequestPacket request = {};
    request.version = SoilNow::VERSION;
    request.type = SoilNow::PairRequest;
    request.nonce = nonce;
    SoilNow::copyCString(request.sensorId, sizeof(request.sensorId), sensorId);
    SoilNow::copyCString(request.sensorType, sizeof(request.sensorType), SoilNow::SENSOR_TYPE);
    SoilNow::copyCString(request.firmwareVersion, sizeof(request.firmwareVersion), kFirmwareVersion);

    const esp_err_t result = esp_now_send(kBroadcastMac, reinterpret_cast<uint8_t*>(&request), sizeof(request));
    Serial.printf("Pair request channel=%u result=%d\n", channel, result);
    return result == ESP_OK;
}

bool pairWithHub() {
    Serial.println("Starting Growly soil sensor ESP-NOW pairing.");
    const unsigned long startedAt = millis();
    const uint32_t nonce = esp_random();
    uint8_t channel = SoilNow::CHANNEL_MIN;
    while (millis() - startedAt < kPairingAttemptMs) {
        portENTER_CRITICAL(&nowMux);
        pairConfigReceived = false;
        portEXIT_CRITICAL(&nowMux);

        sendPairRequest(channel, nonce);
        const unsigned long channelStartedAt = millis();
        while (millis() - channelStartedAt < kPairingPerChannelMs) {
            if (pairConfigReceived) {
                SoilNow::PairConfigPacket config = {};
                portENTER_CRITICAL(&nowMux);
                memcpy(&config, &receivedPairConfig, sizeof(config));
                pairConfigReceived = false;
                portEXIT_CRITICAL(&nowMux);
                if (config.nonce != nonce) {
                    break;
                }
                savePairConfig(config);
                Serial.printf(
                    "Paired with hub=%s sensor=%s channel=%u ssid=%s\n",
                    pairedHubId.c_str(),
                    sensorId.c_str(),
                    pairedWifiChannel,
                    configuredWifiSsid.c_str());
                blinkStatusLed(3, 120);
                return true;
            }
            delay(25);
        }

        channel = channel >= SoilNow::CHANNEL_MAX ? SoilNow::CHANNEL_MIN : channel + 1;
    }
    Serial.println("Pairing timed out.");
    return false;
}

uint8_t soilPercentFromRaw(uint16_t raw) {
    if (raw <= kSoilRawWet) {
        return 100;
    }
    if (raw >= kSoilRawDry) {
        return 0;
    }
    const long percent = map(raw, kSoilRawDry, kSoilRawWet, 0, 100);
    return static_cast<uint8_t>(constrain(percent, 0, 100));
}

uint8_t batteryPercentFromMillivolts(uint16_t millivolts) {
    if (millivolts <= 3000) {
        return 0;
    }
    if (millivolts >= 4200) {
        return 100;
    }
    return static_cast<uint8_t>(map(millivolts, 3000, 4200, 0, 100));
}

uint16_t readAveragedAdcRaw(int pin) {
    analogRead(pin);
    delay(10);

    uint32_t total = 0;
    for (uint8_t index = 0; index < kAnalogSampleCount; ++index) {
        total += analogRead(pin);
        delay(2);
    }
    return static_cast<uint16_t>(total / kAnalogSampleCount);
}

uint16_t readAveragedAdcMillivolts(int pin) {
    analogReadMilliVolts(pin);
    delay(10);

    uint32_t total = 0;
    for (uint8_t index = 0; index < kAnalogSampleCount; ++index) {
        total += analogReadMilliVolts(pin);
        delay(2);
    }
    return static_cast<uint16_t>(total / kAnalogSampleCount);
}

SoilSample readSample() {
    SoilSample sample;
    analogSetPinAttenuation(kSoilAdcPin, ADC_11db);
    analogSetPinAttenuation(kBatteryAdcPin, ADC_11db);
    delay(50);

    sample.soilRaw = readAveragedAdcRaw(kSoilAdcPin);
    sample.soilPercent = soilPercentFromRaw(sample.soilRaw);

    const int batteryRaw = readAveragedAdcRaw(kBatteryAdcPin);
    if (batteryRaw > kBatteryDisconnectedRaw) {
        const uint16_t batteryPinMillivolts = readAveragedAdcMillivolts(kBatteryAdcPin);
        sample.batteryMillivolts = static_cast<uint16_t>(batteryPinMillivolts * kBatteryDividerRatio);
        sample.batteryPercent = batteryPercentFromMillivolts(sample.batteryMillivolts);
    }

    const float humidity = dht.readHumidity();
    const float temperature = dht.readTemperature();
    if (!isnan(temperature)) {
        sample.airTemperatureCenti = static_cast<int16_t>(temperature * 100.0f);
    }
    if (!isnan(humidity)) {
        sample.airHumidityCenti = static_cast<int16_t>(humidity * 100.0f);
    }

    Serial.printf(
        "Sample sensor=%s soil=%u%% raw=%u air=%.2fC %.2f%% battery=%umV ",
        sensorId.c_str(),
        sample.soilPercent,
        sample.soilRaw,
        sample.airTemperatureCenti / 100.0f,
        sample.airHumidityCenti / 100.0f,
        sample.batteryMillivolts);
    if (sample.batteryPercent <= 100) {
        Serial.printf("%u%%\n", sample.batteryPercent);
    } else {
        Serial.println("unknown");
    }
    return sample;
}

bool sendSampleEspNow(const SoilSample& sample) {
    if (!pairedWifiChannel || !initEspNow()) {
        return false;
    }
    setEspNowChannel(pairedWifiChannel);
    ensurePeer(kBroadcastMac);

    SoilNow::SamplePacket packet = {};
    packet.version = SoilNow::VERSION;
    packet.type = SoilNow::Sample;
    packet.sequence = esp_random();
    SoilNow::copyCString(packet.sensorId, sizeof(packet.sensorId), sensorId);
    packet.soilRaw = sample.soilRaw;
    packet.soilPercent = sample.soilPercent;
    packet.airTemperatureCenti = sample.airTemperatureCenti;
    packet.airHumidityCenti = sample.airHumidityCenti;
    packet.batteryMillivolts = sample.batteryMillivolts;
    packet.batteryPercent = sample.batteryPercent;
    SoilNow::copyCString(packet.firmwareVersion, sizeof(packet.firmwareVersion), kFirmwareVersion);

    expectedSampleAckSequence = packet.sequence;
    sampleAckReceived = false;
    const esp_err_t result = esp_now_send(kBroadcastMac, reinterpret_cast<uint8_t*>(&packet), sizeof(packet));
    if (result != ESP_OK) {
        Serial.printf("ESP-NOW sample send failed: %d\n", result);
        return false;
    }

    const unsigned long startedAt = millis();
    while (millis() - startedAt < kSampleAckTimeoutMs) {
        if (sampleAckReceived) {
            Serial.println("ESP-NOW sample acknowledged by hub.");
            return true;
        }
        delay(25);
    }
    Serial.println("ESP-NOW sample ack timed out.");
    return false;
}

bool connectWifiForBackup() {
    if (configuredWifiSsid.length() == 0) {
        return false;
    }
    stopEspNow();
    WiFi.mode(WIFI_STA);
    WiFi.begin(configuredWifiSsid.c_str(), configuredWifiPassword.c_str());
    Serial.printf("Connecting Wi-Fi backup to %s", configuredWifiSsid.c_str());
    const unsigned long startedAt = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startedAt < kWifiConnectTimeoutMs) {
        Serial.print(".");
        delay(300);
    }
    Serial.println();
    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("Wi-Fi backup connected: ");
        Serial.println(WiFi.localIP());
        return true;
    }
    Serial.println("Wi-Fi backup failed.");
    WiFi.disconnect(true, true);
    return false;
}

bool performPendingFirmwareUpdate() {
    if (!pendingFirmwareUpdateAvailable) {
        return false;
    }
    const String version = SoilNow::packetString(pendingFirmwareVersion, sizeof(pendingFirmwareVersion));
    const String firmwareUrl = SoilNow::packetString(pendingFirmwareUrl, sizeof(pendingFirmwareUrl));
    if (!isFirmwareCandidateNewer(version, kFirmwareVersion) || firmwareUrl.length() == 0) {
        pendingFirmwareUpdateAvailable = false;
        return false;
    }
    if (WiFi.status() != WL_CONNECTED && !connectWifiForBackup()) {
        return false;
    }

    Serial.printf("Soil OTA update available: %s -> %s\n", kFirmwareVersion, version.c_str());
    HTTPClient http;
    WiFiClient plainClient;
    WiFiClientSecure secureClient;
    http.setTimeout(30000);
    if (!beginHttpClient(http, plainClient, secureClient, firmwareUrl)) {
        Serial.println("Soil OTA failed: invalid URL.");
        return false;
    }
    const int statusCode = http.GET();
    if (statusCode != HTTP_CODE_OK) {
        Serial.printf("Soil OTA failed HTTP %d\n", statusCode);
        http.end();
        return false;
    }
    const int contentLength = http.getSize();
    if (contentLength <= 0) {
        Serial.println("Soil OTA failed: missing content length.");
        http.end();
        return false;
    }
    if (!Update.begin(contentLength)) {
        Serial.println("Soil OTA failed: not enough OTA space.");
        http.end();
        return false;
    }
    WiFiClient* stream = http.getStreamPtr();
    const size_t written = Update.writeStream(*stream);
    if (written != static_cast<size_t>(contentLength)) {
        Serial.println("Soil OTA failed: short write.");
        Update.abort();
        http.end();
        return false;
    }
    if (!Update.end() || !Update.isFinished()) {
        Serial.println("Soil OTA failed: update did not finish.");
        http.end();
        return false;
    }
    http.end();
    Serial.println("Soil OTA complete. Restarting.");
    delay(800);
    ESP.restart();
    return true;
}

bool uploadSampleViaWifi(const SoilSample& sample) {
    if (pairedHubId.length() == 0 || sensorId.length() == 0) {
        return false;
    }
    if (WiFi.status() != WL_CONNECTED && !connectWifiForBackup()) {
        return false;
    }

    const String ingestUrl = backendUrl(DeviceConfig::SOIL_SENSOR_INGEST_PATH);
    HTTPClient http;
    WiFiClient plainClient;
    WiFiClientSecure secureClient;
    http.setTimeout(7000);
    if (!beginHttpClient(http, plainClient, secureClient, ingestUrl)) {
        return false;
    }

    String body = String("{\"hub_id\":\"") + jsonEscape(pairedHubId) + "\"";
    body += ",\"sensor_id\":\"" + jsonEscape(sensorId) + "\"";
    body += ",\"source\":\"soil_sensor_wifi_backup\"";
    body += ",\"firmware_version\":\"" + jsonEscape(String(kFirmwareVersion)) + "\"";
    body += ",\"valid\":true";
    body += ",\"humidity\":" + String(sample.soilPercent);
    body += ",\"soil_raw\":" + String(sample.soilRaw);
    if (sample.airTemperatureCenti > -32000) {
        body += ",\"air_temperature\":" + String(sample.airTemperatureCenti / 100.0f, 2);
    }
    if (sample.airHumidityCenti >= 0) {
        body += ",\"air_humidity\":" + String(sample.airHumidityCenti / 100.0f, 2);
    }
    if (sample.batteryMillivolts > 0) {
        body += ",\"battery_voltage\":" + String(sample.batteryMillivolts / 1000.0f, 3);
    }
    if (sample.batteryPercent <= 100) {
        body += ",\"battery_percent\":" + String(sample.batteryPercent);
    }
    body += "}";

    http.addHeader("Content-Type", "application/json");
    const int statusCode = http.POST(body);
    const String responseBody = http.getString();
    http.end();
    Serial.printf("Wi-Fi backup sample POST -> HTTP %d\n", statusCode);
    if (statusCode < 200 || statusCode >= 300) {
        Serial.println(responseBody);
        return false;
    }
    saveSleepPlan(
        static_cast<uint32_t>(extractJsonLongValue(responseBody, "next_sleep_seconds", configuredSleepSeconds)),
        static_cast<uint8_t>(extractJsonLongValue(responseBody, "battery_warning_percent", batteryWarningPercent)),
        static_cast<uint8_t>(extractJsonLongValue(responseBody, "battery_critical_percent", batteryCriticalPercent)),
        "wifi-backup");
    rememberFirmwareUpdateFromResponse(responseBody);
    return true;
}

bool deliverSample(const SoilSample& sample) {
    const bool espNowDelivered = sendSampleEspNow(sample);
    if (!espNowDelivered) {
        return uploadSampleViaWifi(sample);
    }
    return true;
}

void runStartupConfirmWindow() {
    Serial.printf(
        "Startup confirmation window active for %lu seconds; sampling every %lu seconds.\n",
        kStartupConfirmWindowMs / 1000UL,
        kStartupConfirmSampleIntervalMs / 1000UL);
    setStatusLed(true);
    const unsigned long startedAt = millis();
    unsigned long nextSampleAt = 0;
    unsigned long nextLedToggleAt = millis() + kStartupConfirmLedBlinkMs;
    bool ledOn = true;
    while (millis() - startedAt < kStartupConfirmWindowMs) {
        if (millis() >= nextSampleAt) {
            const SoilSample sample = readSample();
            deliverSample(sample);
            nextSampleAt = millis() + kStartupConfirmSampleIntervalMs;
        }
        if (millis() >= nextLedToggleAt) {
            ledOn = !ledOn;
            setStatusLed(ledOn);
            nextLedToggleAt = millis() + kStartupConfirmLedBlinkMs;
        }
        delay(50);
    }
    setStatusLed(false);
}

void sleepFor(uint64_t sleepUs) {
    Serial.printf("Sleeping for %llu seconds.\n", sleepUs / 1000000ULL);
    setStatusLed(false);
    Serial.flush();
    esp_sleep_enable_timer_wakeup(sleepUs);
    esp_deep_sleep_start();
}
}

void setup() {
    Serial.begin(115200);
    delay(1000);
    pinMode(kBootButtonPin, INPUT_PULLUP);
    for (int pin : kStatusLedPins) {
        pinMode(pin, OUTPUT);
    }
    setStatusLed(false);
    dht.begin();
    WiFi.mode(WIFI_STA);

    Serial.println();
    Serial.println("Booting Growly DIY MORE soil sensor");
    const esp_sleep_wakeup_cause_t wakeupCause = esp_sleep_get_wakeup_cause();
    Serial.printf("Wakeup cause=%d\n", static_cast<int>(wakeupCause));
    loadConfig();
    if (digitalRead(kBootButtonPin) == LOW) {
        Serial.println("BOOT held at startup. Clearing soil sensor pairing.");
        clearConfig();
        blinkStatusLed(5, 80);
    }

    const bool configured = configuredWifiSsid.length() > 0 && pairedHubId.length() > 0 && pairedWifiChannel > 0;
    if (!configured) {
        const bool paired = pairWithHub();
        stopEspNow();
        sleepFor(paired ? configuredSleepSeconds * 1000000ULL : kPairingRetrySleepUs);
    }

    if (wakeupCause == ESP_SLEEP_WAKEUP_TIMER) {
        const SoilSample sample = readSample();
        deliverSample(sample);
    } else {
        runStartupConfirmWindow();
    }
    stopEspNow();
    performPendingFirmwareUpdate();
    sleepFor(configuredSleepSeconds * 1000000ULL);
}

void loop() {
}
