# Doppelwort – Installation, Deployment und Betrieb

## Lokal

```bash
npm ci
npm test
npm run dev
```

Ohne Backend läuft Doppelwort bewusst im sichtbaren Pass-and-Play-Modus. `localStorage` hält versionierte Räume, `sessionStorage` die Identität des Tabs, `BroadcastChannel` synchronisiert Tabs desselben Browsers.

Die generierten Konzept- und Auswahlbilder liegen als WebP vor; dadurch bleibt das deploybare Vinext-Artefakt trotz zusätzlichem Spiel kleiner als die zuvor stabile UGBZ-Version.

## Produktives Backend anschließen

1. Neues Supabase-Projekt in einer passenden EU-Region erstellen.
2. Supabase CLI installieren, Projekt verknüpfen und `supabase db push` ausführen. Migration `002_platform_rooms.sql` aktiviert die gemeinsame Online-Raumschicht.
3. Anonymous Sign-ins aktivieren; CAPTCHA für auffällige Join-/Session-Raten konfigurieren.
4. Frontendvariablen setzen:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_ROOM_MODE=online
```

Server-Geheimnisse gehören nur in die Function-/Hosting-Secret-Verwaltung, nie in `.env` mit `NEXT_PUBLIC_`, Git oder Browser-Bundles.

## CI/CD

`.github/workflows/ci.yml` führt bei Pushes und Pull Requests reproduzierbar `npm ci` sowie `npm run check` aus. Vor einer produktiven Online-Freigabe wird diese Basis um Migration-Lint in einer temporären Postgres-Instanz, Playwright Desktop/Mobil sowie Dependency- und Secret-Scans erweitert. Auf `main`: Staging deployen, Smoke-Test, Migration mit Backup, Production deployen, Healthcheck und bei Fehler automatisches Frontend-Rollback. Datenbankmigrationen sind vorwärtskompatibel; destruktive Änderungen erfolgen in zwei Releases.

## Monitoring und SLO

- Ziel: 99,9 % Raum-/Befehlsverfügbarkeit pro Monat.
- p95 REST-Befehl unter 400 ms in der Zielregion; Realtime-Ereignis p95 unter 750 ms.
- Alarm: 5xx > 2 %/5 min, Auth-Fehleranstieg, Realtime-Lag > 3 s, DB-Verbindungen > 80 %, Storage > 75 %, Cleanup fehlgeschlagen.
- Strukturierte Logs: `request_id`, gehashte Session-ID, Route, Status, Dauer, Raum-ID, Revision; nie Wörter, Rollen, Passwort, Token, Klartext-IP oder Reporttext in normalen Fehlerlogs.
- Sentry/OpenTelemetry optional im Frontend/Edge; Sampling und PII-Scrubbing vor Versand.

## Recovery und Backups

- Supabase Point-in-Time-Recovery oder tägliche verschlüsselte Backups, 14 Tage Aufbewahrung; quartalsweise Restore-Test in ein isoliertes Projekt.
- Bei Realtime-Ausfall bleiben Befehle über REST möglich; Clients laden Snapshots im Backoff und zeigen „Verbindung wird wiederhergestellt“.
- Bei regionalem Ausfall Statusseite aktualisieren, neue Spiele pausieren, laufende Räume nach Recovery aus Postgres-Snapshot fortsetzen.
- Räume sind revisioniert. Ein Clientzustand wird nie als Wiederherstellungsquelle in die Datenbank geschrieben.
- Incident-Ablauf: eindämmen, Schlüssel rotieren, Audit sichern, Betroffenheit bewerten, dokumentieren und gegebenenfalls fristgerecht melden.

## Wartungsjobs

- jede Minute: abgelaufene Timer serverseitig fortschalten
- alle fünf Minuten: Heartbeats älter als 45 Sekunden offline markieren und Hostwechsel prüfen
- täglich: abgelaufene Gäste/Räume/Aktionen nach Fristen löschen, Reports/Bans prüfen
- wöchentlich: Statistiken anonym aggregieren, unbenutzte Wortpaare/Fehlerquoten prüfen
- monatlich: Abhängigkeiten und Zugriffsrechte, quartalsweise Restore und Moderationsrollen prüfen

## Aktueller Hosting-Status

Die öffentliche GitHub-Page liest Online-Konfiguration aus Repository Variables und Secrets. Solange diese fehlen, bleibt automatisch der lokale Pass-and-Play-Modus aktiv.
