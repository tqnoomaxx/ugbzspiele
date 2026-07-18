# UGBZ

UGBZ ist eine responsive Spieleplattform mit Kartenspiel, **Imposter** und klassischem **Kniffel**.

## Enthalten

- Spielplan mit Rundenzahl, Kartenfolge und geschätzter Dauer vor dem Start
- Erklärte Punkteformel und auditierbarer Rundenverlauf
- Faire Rangfolge mit gemeinsamen Platzierungen bei Gleichstand
- Korrektur von Ansagen, letzter Wertung und Schlussrunde
- Mobiler Spielleitermodus mit festem Bestätigungsbutton und kompaktem Zwischenstand
- Automatisches lokales Speichern, sichtbares Fortsetzen und Überschreibschutz
- Imposter mit öffentlicher Raumliste, Einladungscode und konfigurierbarer Lobby
- 160 deutsche und 160 englische Wortpaare in acht Kategorien
- Vollständiger Rollen-, Reveal-, Rede-, Meeting-, Abstimmungs-, Punkte- und Ergebnisfluss
- Pass-and-Play, Tab-Synchronisierung und optionaler geräteübergreifender Supabase-Realtime-Modus
- Unterbrechbare laufende Imposter-Sitzungen mit sichtbarer Wiederaufnahme auf dem Homescreen
- Punktefreier Modus ohne irreführenden Gesamtstand sowie Meetings ohne erzwungenen Timer
- Wiederverwendbare Supabase-Raumschicht für Imposter und spätere Spiele inklusive RLS, RPCs und Realtime
- Kniffel wahlweise komplett digital oder mit echten Würfeln und gemeinsamem Punkteblock
- Solo, Pass-and-Play oder synchrone Online-Räume mit öffentlichen, privaten und passwortgeschützten Tischen
- Klassische 13 Kategorien, obere Bonuswertung, Kniffel-Bonus/Joker, Rückgängig und Rangliste
- Ausfallsichere Kniffel-Speicherung mit Cloud-Autosave, lokalem Spiegel, Wiederholungs-Sync und JSON-Export
- Autoritative digitale Online-Würfe direkt aus der Datenbank
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

Kartenspiel speichert den Spielstand lokal. Imposter und Kniffel verwenden ohne Konfiguration einen lokalen Fallback und wechseln mit den dokumentierten Supabase-Variablen automatisch in den geräteübergreifenden Online-Modus.

## Imposter-Dokumentation

- [Vollständige Bewertung und priorisierte Kritik](docs/gesamtbewertung.md)
- [Online-Modus einrichten und für neue Spiele verwenden](docs/online-modus.md)
- [Architektur und Entscheidungen](docs/doppelwort/architecture.md)
- [Datenmodell/ERD](docs/doppelwort/erd.md)
- [REST und Realtime](docs/doppelwort/api.md)
- [Sicherheit und Datenschutz](docs/doppelwort/security.md)
- [Deployment und Betrieb](docs/doppelwort/operations.md)
- [Entwicklerhandbuch](docs/doppelwort/developer-guide.md)
- [Benutzerhandbuch](docs/doppelwort/user-guide.md)
- [Adminhandbuch](docs/doppelwort/admin-guide.md)
- [Vollständigkeitscheck](docs/doppelwort/requirements-checklist.md)
