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
- Vorbereitetes Supabase-Postgres-/Realtime-Schema inklusive RLS, API- und Betriebsdokumentation

## Lokal starten

```bash
npm install
npm run dev
```

## Prüfen

```bash
npm run check
```

Kartenspiel und Doppelwort speichern den Spielstand lokal. Doppelwort kennzeichnet diesen Modus in der Oberfläche: Mehrere Tabs desselben Browsers synchronisieren sich, echte Geräte benötigen den dokumentierten Supabase-Adapter.

## Doppelwort-Dokumentation

- [Architektur und Entscheidungen](docs/doppelwort/architecture.md)
- [Datenmodell/ERD](docs/doppelwort/erd.md)
- [REST und Realtime](docs/doppelwort/api.md)
- [Sicherheit und Datenschutz](docs/doppelwort/security.md)
- [Deployment und Betrieb](docs/doppelwort/operations.md)
- [Entwicklerhandbuch](docs/doppelwort/developer-guide.md)
- [Benutzerhandbuch](docs/doppelwort/user-guide.md)
- [Adminhandbuch](docs/doppelwort/admin-guide.md)
- [Vollständigkeitscheck](docs/doppelwort/requirements-checklist.md)
