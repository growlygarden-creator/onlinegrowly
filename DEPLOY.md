# Deploy Growly Garden

## Klar status

Appen er nå rigget for deploy med:

- `main:app` som entrypoint
- `render.yaml` for Render
- `Procfile` for enklere plattformer
- konfigurerbar datamappe via `GROWLY_DATA_DIR`

## Viktig før publisering

Sett egne verdier for:

- `APP_USERNAME`
- `APP_PASSWORD`
- `SETTINGS_PASSWORD`
- `SESSION_SECRET`
- `SUPABASE_REST_ENDPOINT`
- `SUPABASE_API_KEY`

## Anbefalt flyt

1. Opprett et nytt GitHub-repo.
2. Push prosjektet dit.
3. Koble repoet til Render.
4. La Render lese `render.yaml`.
5. Legg inn miljøvariablene i Render.
6. Koble domenet ditt når appen er oppe.

## Hvorfor `GROWLY_DATA_DIR`

Appen bruker en lokal SQLite-fil for:

- brukere
- admin-status
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
