# Growly Garden Frontend

Denne mappen er den nye frontend-retningen for Growly Garden.

Maal:
- bygge UI separat fra FastAPI-templates
- gjenbruke eksisterende backend-API-er
- holde prosjektet klart for Capacitor og Xcode

## Plan

1. Flytte landing, login, register, dashboard og settings hit
2. Bruke FastAPI som backend/API
3. Bygge til `dist`
4. Synce `dist` inn i Capacitor for iOS

## Kommandoer

```bash
npm install
npm run dev
npm run build
npm run cap:add:ios
npm run cap:sync
npm run cap:open:ios
```
