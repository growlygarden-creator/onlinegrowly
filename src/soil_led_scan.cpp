#include <Arduino.h>

namespace {
constexpr int kCandidatePins[] = {
    16, 17, 18, 19, 15
};

void releasePins() {
    for (int pin : kCandidatePins) {
        pinMode(pin, INPUT);
    }
}

void waitForNext() {
    Serial.println("Type n + Enter for next test.");
    while (true) {
        if (Serial.available() <= 0) {
            delay(50);
            continue;
        }
        const char value = static_cast<char>(Serial.read());
        if (value == 'n' || value == 'N') {
            while (Serial.available() > 0) {
                Serial.read();
            }
            return;
        }
    }
}

void holdPin(int pin, uint8_t onLevel, uint8_t offLevel) {
    pinMode(pin, OUTPUT);
    digitalWrite(pin, offLevel);
    delay(300);

    digitalWrite(pin, onLevel);
    waitForNext();
    digitalWrite(pin, offLevel);
    delay(500);

    pinMode(pin, INPUT);
}
}

void setup() {
    Serial.begin(115200);
    delay(1000);
    releasePins();
    Serial.println();
    Serial.println("Growly DIY MORE LED scan");
    Serial.println("Watch the blue LED and note the GPIO + HIGH/LOW line that blinks it.");
}

void loop() {
    for (int pin : kCandidatePins) {
        Serial.printf("HOLD GPIO%d active-high: LED should stay on now.\n", pin);
        holdPin(pin, HIGH, LOW);

        Serial.printf("HOLD GPIO%d active-low: LED should stay on now.\n", pin);
        holdPin(pin, LOW, HIGH);
    }

    Serial.println("Scan round complete. Repeating in 5 seconds.");
    releasePins();
    delay(5000);
}
