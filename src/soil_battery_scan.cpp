#include <Arduino.h>

namespace {
constexpr int kAdcPins[] = {32, 33, 34, 35, 36, 39};
constexpr int kOtherInputPins[] = {0, 2, 4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 25, 26, 27};
constexpr int kLedPin = 16;
constexpr int kProbePin = 33;
constexpr bool kLedActiveLow = true;

void setLed(bool on) {
    const uint8_t activeLevel = kLedActiveLow ? LOW : HIGH;
    const uint8_t inactiveLevel = kLedActiveLow ? HIGH : LOW;
    digitalWrite(kLedPin, on ? activeLevel : inactiveLevel);
}

uint32_t readAverageRaw(int pin) {
    uint32_t total = 0;
    constexpr int samples = 32;
    analogRead(pin);
    delay(20);
    for (int i = 0; i < samples; ++i) {
        total += analogRead(pin);
        delay(3);
    }
    return total / samples;
}

void printDigitalInputs() {
    Serial.print("Digital:");
    for (int pin : kOtherInputPins) {
        pinMode(pin, INPUT);
        Serial.printf(" GPIO%d=%d", pin, digitalRead(pin));
    }
    Serial.println();
}

void printAdcSample(const char* label) {
    Serial.printf("--- ADC sample: %s ---\n", label);
    for (int pin : kAdcPins) {
        const uint32_t raw = readAverageRaw(pin);
        const float pinMillivolts = (raw / 4095.0f) * 3300.0f;
        Serial.printf(
            "GPIO%d raw=%lu approx_pin_mv=%.0f x2_mv=%.0f x35_mv=%.0f\n",
            pin,
            raw,
            pinMillivolts,
            pinMillivolts * 2.0f,
            pinMillivolts * 35.0f);
    }
    printDigitalInputs();
    Serial.println();
}
}

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println();
    Serial.println("Growly DIY MORE battery ADC scan");
    Serial.println("Compares ADC pins while GPIO33 is input, low and high.");

    pinMode(kLedPin, OUTPUT);
    setLed(false);
    analogReadResolution(12);
    for (int pin : kAdcPins) {
        analogSetPinAttenuation(pin, ADC_11db);
    }
}

void loop() {
    setLed(true);
    pinMode(kProbePin, INPUT);
    delay(250);
    printAdcSample("GPIO33 input");

    pinMode(kProbePin, OUTPUT);
    digitalWrite(kProbePin, LOW);
    delay(250);
    printAdcSample("GPIO33 low");

    digitalWrite(kProbePin, HIGH);
    delay(250);
    printAdcSample("GPIO33 high");

    pinMode(kProbePin, INPUT);
    setLed(false);
    delay(2000);
}
