# Growly Garden manual

Sist oppdatert: 29. april 2026

Dette dokumentet er en samlet forklaring på hvor Growly Garden står nå, hvordan appen brukes, og hvordan Render, Supabase, ESP-kortet og sensorene henger sammen.

## Kort status

Prosjektet består nå av fire hoveddeler:

1. **Mobilappen**
   - Brukes som ren drivhusapp.
   - Viser vekstforhold, sensorer, jordverdier og trender.
   - Admin-kontoen skal ikke brukes i appen.

2. **Growly Management på web**
   - Brukes til admin, brukere, innstillinger, koblingsskjema, intervaller og oversikt.
   - Ligger på Render-siden.
   - `/management` peker til samme webflate som `/settings`.

3. **ESP32-S3 hub**
   - Leser sensorene lokalt.
   - Sender data til Supabase.
   - Har lokal webstatus på IP-adressen sin, for eksempel `http://192.168.0.117/sensor`.
   - Har nå OTA-grunnlag, slik at fremtidige firmware-oppdateringer kan pushes over nettet.

4. **Supabase**
   - Lagrer sensorhistorikk.
   - Brukes for trender, historikk og dagsoppsummeringer.

## Viktig akkurat nå

Dette virker lokalt på ESP-kortet:

- BMP280 gir lufttemperatur og lufttrykk.
- AM2302 gir luftfuktighet.
- BH1750 gir lysverdi.
- 7-in-1 jordsensor gir jordverdier når RS485-koblingen er frisk.

Sist testet lokal sensorstatus viste blant annet:

```text
air_temperature: 24.93
air_humidity: 35.90
lux: 39.17
temperature: 23.1
ph: 9.0
error: ""
```

Det som fortsatt må gjøres:

- Pare huben på nytt mot appen/Render. Kortet hadde sist `hub_id: ""`.
- Når BME280 kommer, kan AM2302 fjernes eller beholdes som backup.
- Når vi vil bruke OTA i praksis, må firmware-binær legges på en offentlig HTTPS-adresse og Render må få `ACTIVE_FIRMWARE_VERSION` og `ACTIVE_FIRMWARE_URL`.

## Hvordan bruke appen

### Login

Vanlige brukere logger inn i appen med epost og passord.

Registrering er endret slik at:

- epost brukes automatisk som brukernavn
- brukeren trenger ikke lage eget brukernavn

Admin-kontoen er sperret fra native app-login. Det er med vilje. Admin skal brukes på web.

### Startsiden

Startsiden viser:

- drivhusbilde
- status som `Hub online`
- temperatur
- luftfuktighet
- jordfuktighet

Vi fjernet separat “Hub tilkoblet”-kort, men beholdt `Hub online`-indikatoren i vekstforhold-kortet.

### Jordverdier

Trykk på `Jordfuktighet` for å åpne en oversikt over 7-in-1-sensoren:

- Jordfuktighet
- Jordtemperatur
- pH
- Ledningsevne
- Nitrogen
- Fosfor
- Kalium
- Saltinnhold
- TDS

Trykk videre på en jordverdi for å se trend.

### Trender

Trendvisningen bruker historikk fra backend/Supabase. Den viser perioder som:

- 24 timer
- 3 dager
- 7 dager
- alt

Hvis en trend mangler data, betyr det vanligvis at:

- huben ikke er paret
- ESP-kortet ikke sender data
- Supabase mangler historikk for den verdien
- historikk-start i Management skjuler eldre data

## Growly Management på web

Management brukes til drift og administrasjon.

Viktige sider:

```text
/login
/settings
/management
```

`/management` redirecter til `/settings`.

På Management kan du:

- se og endre brukere
- sette sample-intervaller
- se aktiv hub
- generere pairing-kode
- se koblingsskjema
- sette historikk-start
- se lokal sensor-target/IP

Admin-kontoen skal brukes her, ikke i appen.

## Pairing av hub

Pairing kobler ESP-kortet til en bruker/hub i backend.

Hvis brukeren allerede har en hub, kan du likevel generere ny pairing-kode. Da kobles ESP-kortet til samme eksisterende hub-id på nytt. Dette er laget for feilretting, nytt ESP-kort eller factory reset uten at historikk slettes.

Normal flyt:

1. Logg inn i appen som vanlig bruker.
2. Gå til innstillinger.
3. Generer pairing-kode.
4. Sett ESP-kortet i setup-modus hvis nødvendig.
5. Koble til Wi-Fi-nettet `Growly Garden` fra telefon/Mac.
6. Velg hjemmenett og skriv inn pairing-koden.
7. ESP-kortet sender pairing-koden til Render.
8. Render svarer med `hub_id`.

Når pairing virker, skal `/health` på kortet vise noe slikt:

```json
{
  "hub_id": "growly-hub-001",
  "pairing_status": "Huben er paret som growly-hub-001."
}
```

Sist status viste:

```text
hub_id: ""
pairing_status: "Pairing feilet: -1"
```

Det betyr at sensorene virker lokalt, men kortet er ikke koblet til backend/hub akkurat nå.

## Lokal ESP-status

Når kortet er på Wi-Fi, kan det spørres direkte.

Eksempel fra nåværende nett:

```text
http://192.168.0.117/health
http://192.168.0.117/sensor
http://192.168.0.117/device-settings
```

`/health` viser:

- firmware-versjon
- Wi-Fi-status
- IP
- hub-id
- pairing-status

`/sensor` viser:

- lufttemperatur
- luftfuktighet
- lufttrykk
- lys
- jordverdier
- feilmelding

Hvis `valid` er `false` og `error` er `timeout`, er det som regel 7-in-1 jordsensoren/RS485 som ikke svarer.

## Sensorer og kobling

### I2C-buss

I2C brukes av BMP280 og BH1750.

```text
GPIO8 -> SDA
GPIO9 -> SCL
3V3   -> VCC
GND   -> GND
```

Ikke bruk GPIO8 eller GPIO9 til andre sensorer.

### BMP280

BMP280 gir:

- lufttemperatur
- lufttrykk

Kobling:

```text
VCC / VIN -> 3V3
GND       -> GND
SDA / SDI -> GPIO8
SCL / SCK -> GPIO9
CSB / CS  -> 3V3
SDO       -> GND
```

`SDO -> GND` gir vanligvis adresse `0x76`.

BMP280 gir ikke luftfuktighet.

### AM2302

AM2302 brukes midlertidig til luftfuktighet.

Kobling:

```text
Rød   -> 3V3
Svart -> GND
Gul   -> GPIO10
```

Viktig: ikke koble AM2302 til GPIO9. GPIO9 er I2C-klokken for BMP280/BH1750.

Firmware bruker DHT22-protokoll for AM2302. Det er riktig for denne sensoren.

### BH1750

BH1750 gir lys/lux.

Kobling:

```text
VCC  -> 3V3
GND  -> GND
SDA  -> GPIO8
SCL  -> GPIO9
ADDR -> åpen
```

### MAX485 og 7-in-1 jordsensor

ESP32 til MAX485:

```text
3V3    -> VCC
GPIO17 -> DI
GPIO18 -> RO
GPIO16 -> DE
GPIO16 -> RE
GND    -> GND
```

MAX485 til jordsensor:

```text
A            -> gul/grønn
B            -> blå
Sensor brun  -> +5V
Sensor svart -> GND
```

Hvis jordsensoren gir timeout, sjekk:

- at sensoren får +5V
- at GND er felles mellom ESP32, MAX485 og sensor
- at A/B ikke er byttet
- at DE og RE begge ligger på GPIO16

## Render forklart

Render kjører backend/webappen offentlig.

Render gjør dette:

- starter FastAPI-appen
- viser websidene
- håndterer login og admin
- lagrer lokale webdata i SQLite på persistent disk
- tilbyr API for appen
- tilbyr API for ESP-pairing
- tilbyr OTA-konfig til ESP-kortet

Render bruker `render.yaml`.

Viktige miljøvariabler i Render:

```text
GROWLY_DATA_DIR=/var/data
ADMIN_USERNAME
ADMIN_PASSWORD
DEFAULT_VIEWER_USERNAME
DEFAULT_VIEWER_PASSWORD
SETTINGS_PASSWORD
SESSION_SECRET
SESSION_SAME_SITE=none
SESSION_HTTPS_ONLY=true
NATIVE_APP_ORIGINS=capacitor://localhost,http://localhost,http://127.0.0.1,ionic://localhost
SUPABASE_REST_ENDPOINT
SUPABASE_API_KEY
ACTIVE_FIRMWARE_VERSION
ACTIVE_FIRMWARE_URL
```

Ikke legg ekte passord/API-nøkler i GitHub. De skal ligge som Environment Variables i Render.

### Persistent disk

Render må ha disk montert på:

```text
/var/data
```

og miljøvariabel:

```text
GROWLY_DATA_DIR=/var/data
```

Hvis disken ikke er riktig satt opp, kan brukere og lokale innstillinger forsvinne ved deploy.

## Supabase forklart

Supabase er databasen for sensorhistorikk.

ESP-kortet sender direkte til Supabase REST-endepunktet:

```text
SUPABASE_REST_ENDPOINT
SUPABASE_API_KEY
```

Backend kan også lese fra Supabase for:

- siste måling
- historikk
- trender
- dagsoppsummering

Relevante filer:

```text
supabase_sensor_data_template.csv
supabase_sensor_data_oslo_view.sql
supabase_add_air_columns.sql
```

`supabase_add_air_columns.sql` er relevant fordi vi la til luftverdier:

- `air_temperature`
- `air_humidity`
- `air_pressure`

Når Supabase ikke viser trenddata, sjekk:

- om ESP faktisk sender data
- om API key er satt
- om REST endpoint er riktig
- om huben er paret
- om riktig tabell/view brukes
- om historikk-start skjuler gamle data

## OTA forklart

OTA betyr at ESP-kortet kan oppdateres over nettet.

Dette er nå bygget inn:

- firmware har versjon, for eksempel `0.1.1-dht22`
- ESP poller Render på `/api/device/config`
- Render svarer med firmware-info hvis `ACTIVE_FIRMWARE_VERSION` og `ACTIVE_FIRMWARE_URL` er satt
- ESP laster ned `.bin`-filen og flasher seg selv

Normal OTA-flyt:

1. Endre firmware.
2. Øk `FIRMWARE_VERSION` i `include/device_config.h`.
3. Bygg firmware:

```bash
~/.platformio/penv/bin/pio run
```

4. Finn filen:

```text
.pio/build/esp32-s3/firmware.bin
```

5. Last opp `firmware.bin` til en offentlig HTTPS-adresse.
6. Sett i Render:

```text
ACTIVE_FIRMWARE_VERSION=ny-versjon
ACTIVE_FIRMWARE_URL=https://...
```

7. Deploy Render.
8. ESP-kortet oppdaterer seg ved neste config-poll.

Viktig: første OTA-klare firmware måtte flashes med kabel. Det er gjort.

## Lokale kommandoer

Kjøre backend lokalt:

```bash
.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Bygge frontend:

```bash
npm run build
```

Synce iOS/Xcode:

```bash
npm run cap:sync
```

Bygge ESP-firmware:

```bash
~/.platformio/penv/bin/pio run
```

Flashe ESP med kabel:

```bash
~/.platformio/penv/bin/pio run -t upload --upload-port /dev/cu.usbmodem5B5E1244731
```

Åpne seriell monitor:

```bash
~/.platformio/penv/bin/pio device monitor --port /dev/cu.usbmodem5B5E1244731 --baud 115200
```

Sjekke ESP lokalt:

```bash
curl http://192.168.0.117/health
curl http://192.168.0.117/sensor
```

## Feilsøking

### Rød blinking på ESP

Rød blinking betyr at systemet ikke mener alle nødvendige sensorer er friske.

Vanlige årsaker:

- jordsensor timeout
- BH1750 ikke funnet
- BMP280 ikke funnet
- AM2302 feil koblet
- Wi-Fi ikke koblet

Sjekk først:

```bash
curl http://192.168.0.117/sensor
```

Hvis du ser:

```text
error: "timeout"
valid: false
```

er det ofte RS485/jordsensoren.

### AM2302 viser `air_humidity: null`

Sjekk:

```text
Rød   -> 3V3
Svart -> GND
Gul   -> GPIO10
```

Ikke bruk GPIO9.

### BMP280 viser rart trykk

Hvis trykket hopper til veldig feil verdi, sjekk at AM2302 ikke ligger på GPIO8/GPIO9 og forstyrrer I2C.

Normal verdi hos oss var rundt:

```text
1020 hPa
```

### Huben er ikke paret

Hvis `/health` viser:

```text
hub_id: ""
```

må huben pares på nytt via pairing-kode.

### DNS-feil i seriell monitor

Hvis du ser:

```text
DNS Failed for onlinegrowly.onrender.com
```

kan det være:

- Wi-Fi/DNS-problem på nettverket
- Render sover eller svarer tregt
- kortet prøver pairing uten gyldig hub-id

Sensorene kan likevel virke lokalt.

## Repo og deploy-status

Siste relevante commits:

```text
f21ff14 Add ESP OTA config polling
c11025d Improve wiring diagram readability
36d7607 Add temporary DHT22 air humidity support
14969c2 Update AM2302 wiring notes
```

Alle disse er pushet til GitHub.

Det ligger en lokal, untracked mappe:

```text
Sensor/BMP280/
```

Den ser ut til å være datasheet-mappen du la inn. Den er ikke commitet.

## Neste økt

Anbefalt rekkefølge når vi fortsetter:

1. Pare huben på nytt mot appen/Render.
2. Sjekke at data begynner å komme inn i Supabase.
3. Bekrefte at trender i appen bruker nye målinger.
4. Rydde OTA-flyten: hvor firmware-binær skal hostes.
5. Når BME280 kommer, bytte fra BMP280 + AM2302 til BME280 alene, eller la AM2302 være backup.
