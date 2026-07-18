# UGBZ

UGBZ ist eine responsive Spieleplattform mit einem lokalen Stichkarten-Spielstand und dem sozialen Imposter-Wortspiel **Doppelwort**.

## Enthalten

- Spielplan mit Rundenzahl, Kartenfolge und geschätzter Dauer vor dem Start
- Erklärte Punkteformel und auditierbarer Rundenverlauf
- Faire Rangfolge mit gemeinsamen Platzierungen bei Gleichstand
- Korrektur von Ansagen, letzter Wertung und Schlussrunde
- Mobiler Spielleitermodus mit festem Bestätigungsbutton und kompaktem Zwischenstand
- Automatisches lokales Speichern, sichtbares Fortsetzen und Überschreibschutz
- Doppelwort mit öffentlicher/lokaler Raumliste, Einladungscode und konfigurierbarer Lobby
- 120 deutsche und 120 englische Wortpaare in sechs Kategorien
- Vollständiger Rollen-, Reveal-, Rede-, Meeting-, Abstimmungs-, Punkte- und Ergebnisfluss
- Pass-and-Play sowie Tab-Synchronisierung über ein versioniertes Raum-Repository
- Unterbrechbare laufende Doppelwort-Sitzungen mit sichtbarer Wiederaufnahme auf dem Homescreen
- Punktefreier Modus ohne irreführenden Gesamtstand sowie Meetings ohne erzwungenen Timer
- Vorbereitetes Supabase-Postgres-/Realtime-Schema inklusive RLS, API- und Betriebsdokumentation
- Automatische Tests und Produktionsbuilds über die GitHub-Actions-Pipeline

## Lokal starten

Auf macOS kann die Datei `UGBZ-starten.command` doppelt angeklickt werden. Sie startet den Produktionsbuild und öffnet automatisch `http://127.0.0.1:3000`.

Alternativ im Terminal:

```bash
npm install
npm run dev
```

Danach ist die Website unter [http://localhost:3000](http://localhost:3000) erreichbar. Für einen Test des statischen Produktionsbuilds:

```bash
npm run build
npm start
```

## Prüfen

```bash
npm run check
```

Kartenspiel und Doppelwort speichern den Spielstand lokal. Doppelwort kennzeichnet diesen Modus in der Oberfläche: Mehrere Tabs desselben Browsers synchronisieren sich, echte Geräte benötigen den dokumentierten Supabase-Adapter.

## Doppelwort-Dokumentation

- [Vollständige Bewertung und priorisierte Kritik](docs/gesamtbewertung.md)
- [Architektur und Entscheidungen](docs/doppelwort/architecture.md)
- [Datenmodell/ERD](docs/doppelwort/erd.md)
- [REST und Realtime](docs/doppelwort/api.md)
- [Sicherheit und Datenschutz](docs/doppelwort/security.md)
- [Deployment und Betrieb](docs/doppelwort/operations.md)
- [Entwicklerhandbuch](docs/doppelwort/developer-guide.md)
- [Benutzerhandbuch](docs/doppelwort/user-guide.md)
- [Adminhandbuch](docs/doppelwort/admin-guide.md)
- [Vollständigkeitscheck](docs/doppelwort/requirements-checklist.md)
