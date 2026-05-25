#include <Arduino.h>
#include <Preferences.h>
#include <esp_system.h>

namespace {
constexpr char kPrefsNamespace[] = "batlog";
constexpr uint32_t kLogMagic = 0xBABA7701;
constexpr uint8_t kLogVersion = 1;
constexpr uint8_t kMaxRecords = 80;
constexpr unsigned long kSampleIntervalMs = 3000;
constexpr int kLedPin = 16;
constexpr bool kLedActiveLow = true;
constexpr int kAdcPins[] = {32, 33, 34, 35, 36, 39};
constexpr int kDigitalPins[] = {0, 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27};

struct BatteryLogRecord {
    uint32_t magic;
    uint8_t version;
    uint8_t resetReason;
    uint16_t bootCount;
    uint16_t sampleIndex;
    uint16_t adcRaw[sizeof(kAdcPins) / sizeof(kAdcPins[0])];
    uint32_t digitalBits;
};

Preferences preferences;
uint16_t bootCount = 0;
uint16_t sampleIndex = 0;
uint8_t writeIndex = 0;
unsigned long lastSampleAt = 0;
unsigned long lastLedToggleAt = 0;
bool ledOn = false;

void setLed(bool on) {
    const uint8_t activeLevel = kLedActiveLow ? LOW : HIGH;
    const uint8_t inactiveLevel = kLedActiveLow ? HIGH : LOW;
    digitalWrite(kLedPin, on ? activeLevel : inactiveLevel);
}

uint16_t readAverageRaw(int pin) {
    uint32_t total = 0;
    constexpr int samples = 32;
    for (int i = 0; i < samples; ++i) {
        total += analogRead(pin);
        delay(3);
    }
    return static_cast<uint16_t>(total / samples);
}

uint32_t readDigitalBits() {
    uint32_t bits = 0;
    for (size_t i = 0; i < sizeof(kDigitalPins) / sizeof(kDigitalPins[0]); ++i) {
        pinMode(kDigitalPins[i], INPUT);
        if (digitalRead(kDigitalPins[i]) == HIGH) {
            bits |= (1UL << i);
        }
    }
    pinMode(kLedPin, OUTPUT);
    return bits;
}

String recordKey(uint8_t index) {
    char key[8];
    snprintf(key, sizeof(key), "r%02u", index);
    return String(key);
}

BatteryLogRecord readRecord(uint8_t index) {
    BatteryLogRecord record = {};
    const String key = recordKey(index);
    preferences.getBytes(key.c_str(), &record, sizeof(record));
    return record;
}

void writeRecord(const BatteryLogRecord& record) {
    const String key = recordKey(writeIndex);
    preferences.putBytes(key.c_str(), &record, sizeof(record));
    writeIndex = static_cast<uint8_t>((writeIndex + 1) % kMaxRecords);
    preferences.putUChar("write", writeIndex);
}

BatteryLogRecord captureRecord() {
    BatteryLogRecord record = {};
    record.magic = kLogMagic;
    record.version = kLogVersion;
    record.resetReason = static_cast<uint8_t>(esp_reset_reason());
    record.bootCount = bootCount;
    record.sampleIndex = sampleIndex++;
    for (size_t i = 0; i < sizeof(kAdcPins) / sizeof(kAdcPins[0]); ++i) {
        record.adcRaw[i] = readAverageRaw(kAdcPins[i]);
    }
    record.digitalBits = readDigitalBits();
    return record;
}

void printRecord(const BatteryLogRecord& record) {
    if (record.magic != kLogMagic || record.version != kLogVersion) {
        return;
    }
    Serial.printf(
        "boot=%u sample=%u reset=%u",
        record.bootCount,
        record.sampleIndex,
        record.resetReason);
    for (size_t i = 0; i < sizeof(kAdcPins) / sizeof(kAdcPins[0]); ++i) {
        const float pinMillivolts = (record.adcRaw[i] / 4095.0f) * 3300.0f;
        Serial.printf(" GPIO%d=%u(%.0fmV)", kAdcPins[i], record.adcRaw[i], pinMillivolts);
    }
    Serial.printf(" digital=0x%08lx\n", static_cast<unsigned long>(record.digitalBits));
}

void printLog() {
    Serial.println("--- stored battery log ---");
    for (uint8_t offset = 0; offset < kMaxRecords; ++offset) {
        const uint8_t index = static_cast<uint8_t>((writeIndex + offset) % kMaxRecords);
        printRecord(readRecord(index));
    }
    Serial.println("--- end battery log ---");
}

void captureStoreAndPrint() {
    const BatteryLogRecord record = captureRecord();
    writeRecord(record);
    Serial.print("LIVE ");
    printRecord(record);
}
}

void setup() {
    Serial.begin(115200);
    delay(1000);

    pinMode(kLedPin, OUTPUT);
    setLed(false);
    analogReadResolution(12);
    for (int pin : kAdcPins) {
        analogSetPinAttenuation(pin, ADC_11db);
    }

    preferences.begin(kPrefsNamespace, false);
    bootCount = static_cast<uint16_t>(preferences.getUShort("boot", 0) + 1);
    preferences.putUShort("boot", bootCount);
    writeIndex = preferences.getUChar("write", 0);

    Serial.println();
    Serial.println("Growly DIY MORE battery log");
    Serial.println("Blue LED blinks while samples are being stored.");
    Serial.println("Unplug USB, let it run on battery, then reconnect USB and read the stored log.");
    printLog();
    captureStoreAndPrint();
    lastSampleAt = millis();
}

void loop() {
    const unsigned long now = millis();
    if (now - lastLedToggleAt >= 500) {
        ledOn = !ledOn;
        setLed(ledOn);
        lastLedToggleAt = now;
    }
    if (now - lastSampleAt >= kSampleIntervalMs) {
        captureStoreAndPrint();
        lastSampleAt = now;
    }
}
