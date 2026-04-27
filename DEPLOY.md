# Deploy Growly Garden

## Klar status

Appen er nå rigget for deploy med:

- `main:app` som entrypoint
- `render.yaml` for Render
- `Procfile` for enklere plattformer
- konfigurerbar datamappe via `GROWLY_DATA_DIR`

## Viktig før publisering

Sett egne verdier for:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `DEFAULT_VIEWER_USERNAME`
- `DEFAULT_VIEWER_PASSWORD`
- `SETTINGS_PASSWORD`
- `SESSION_SECRET`
- `SESSION_SAME_SITE=none`
- `SESSION_HTTPS_ONLY=true`
- `NATIVE_APP_ORIGINS=capacitor://localhost,http://localhost,http://127.0.0.1,ionic://localhost`
- `ACTIVE_FIRMWARE_VERSION`
- `ACTIVE_FIRMWARE_URL`
- `SUPABASE_REST_ENDPOINT`
- `SUPABASE_API_KEY`

## Anbefalt flyt

1. Opprett et nytt GitHub-repo.
2. Push prosjektet dit.
3. Koble repoet til Render.
4. La Render lese `render.yaml`.
5. Legg inn miljøvariablene i Render.
6. Koble domenet ditt når appen er oppe.

## iPhone / Capacitor-login

For at session-cookie skal fungere fra iOS-appen til Render-backenden:

- bruk `SESSION_SAME_SITE=none`
- bruk `SESSION_HTTPS_ONLY=true`
- tillat native origins via `NATIVE_APP_ORIGINS`

Frontend-appen peker i native modus mot `https://onlinegrowly.onrender.com`, så Render-deployen må være oppdatert før login i Xcode fungerer.

## Hvorfor `GROWLY_DATA_DIR`

Appen bruker en lokal SQLite-fil for:

- brukere
- admin-status og vanlige app-brukere
- innstillinger

På Render bør dette ligge på en disk, derfor brukes:

- `GROWLY_DATA_DIR=/var/data`

## Startkommando lokalt

```bash
./.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Offentlige sider og login

- `/login` viser innlogging
- `/` er hjemsiden etter innlogging
- `/monitor` er monitor
- `/drivhus-test` er drivhus-test
- `/settings` er innstillinger
- `/management` peker til webflaten for Growly Management

Admin-kontoen (`ADMIN_USERNAME`) er for web/management. Native app-login via `/api/auth/login` avviser admin-kontoer, slik at appen holdes som ren drivhusapp for vanlige brukere.

## OTA og intervaller for ESP-kort

ESP-kortet poller Render selv via `/api/device/config`. Det betyr at du kan endre sample-intervaller i Management, og kortet henter dem automatisk omtrent hvert 5. minutt.

For firmware-oppdatering:

1. Øk `FIRMWARE_VERSION` i `include/device_config.h`.
2. Bygg firmware med PlatformIO. Binærfilen ligger normalt i `.pio/build/<miljo>/firmware.bin`.
3. Last opp `firmware.bin` til en offentlig HTTPS-adresse.
4. Sett `ACTIVE_FIRMWARE_VERSION` og `ACTIVE_FIRMWARE_URL` i Render.
5. Deploy Render på nytt.

Når kortet ser en nyere `ACTIVE_FIRMWARE_VERSION`, laster det ned binærfilen, flasher seg selv og starter på nytt.
