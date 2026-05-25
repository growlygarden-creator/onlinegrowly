#pragma once

#include <Arduino.h>

namespace SoilNow {
constexpr uint8_t VERSION = 2;
constexpr uint8_t CHANNEL_MIN = 1;
constexpr uint8_t CHANNEL_MAX = 13;
constexpr size_t SENSOR_ID_LENGTH = 32;
constexpr size_t SESSION_ID_LENGTH = 24;
constexpr size_t HUB_ID_LENGTH = 32;
constexpr size_t SSID_LENGTH = 33;
constexpr size_t PASSWORD_LENGTH = 65;
constexpr size_t FIRMWARE_VERSION_LENGTH = 32;
constexpr size_t FIRMWARE_URL_LENGTH = 160;
constexpr char SENSOR_TYPE[] = "diymore_012592";
constexpr char PMK[] = "GrowlySoilPmk001";
constexpr char LMK[] = "GrowlySoilLmk001";

enum MessageType : uint8_t {
    PairRequest = 1,
    PairConfig = 2,
    Sample = 3,
    SampleAck = 4,
};

struct __attribute__((packed)) PairRequestPacket {
    uint8_t version;
    uint8_t type;
    uint32_t nonce;
    char sensorId[SENSOR_ID_LENGTH];
    char sensorType[24];
    char firmwareVersion[24];
};

struct __attribute__((packed)) PairConfigPacket {
    uint8_t version;
    uint8_t type;
    uint32_t nonce;
    char sensorId[SENSOR_ID_LENGTH];
    char sessionId[SESSION_ID_LENGTH];
    char hubId[HUB_ID_LENGTH];
    char ssid[SSID_LENGTH];
    char password[PASSWORD_LENGTH];
    uint8_t wifiChannel;
    uint32_t defaultSleepSeconds;
    uint8_t batteryWarningPercent;
    uint8_t batteryCriticalPercent;
};

struct __attribute__((packed)) SamplePacket {
    uint8_t version;
    uint8_t type;
    uint32_t sequence;
    char sensorId[SENSOR_ID_LENGTH];
    uint16_t soilRaw;
    uint8_t soilPercent;
    int16_t airTemperatureCenti;
    int16_t airHumidityCenti;
    uint16_t batteryMillivolts;
    uint8_t batteryPercent;
    char firmwareVersion[FIRMWARE_VERSION_LENGTH];
};

struct __attribute__((packed)) SampleAckPacket {
    uint8_t version;
    uint8_t type;
    uint32_t sequence;
    char sensorId[SENSOR_ID_LENGTH];
    uint32_t nextSleepSeconds;
    uint8_t batteryWarningPercent;
    uint8_t batteryCriticalPercent;
    uint8_t firmwareUpdateAvailable;
    char firmwareVersion[FIRMWARE_VERSION_LENGTH];
    char firmwareUrl[FIRMWARE_URL_LENGTH];
};

static_assert(sizeof(SampleAckPacket) <= 250, "ESP-NOW sample ack must fit in one packet");

inline void copyCString(char* destination, size_t destinationSize, const String& value) {
    if (destinationSize == 0) {
        return;
    }
    memset(destination, 0, destinationSize);
    value.substring(0, destinationSize - 1).toCharArray(destination, destinationSize);
}

inline String packetString(const char* value, size_t valueSize) {
    char buffer[96] = {0};
    const size_t copySize = min(valueSize, sizeof(buffer) - 1);
    memcpy(buffer, value, copySize);
    return String(buffer);
}
}
