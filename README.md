# UGBZ

UGBZ ist eine responsive Spieleplattform mit Kartenspiel, **Imposter**, klassischem **Kniffel**, **Schiffe versenken**, **Werwolf** und optionalem **Memory**.

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
- Ausfallsichere Kniffel-Speicherung mit Cloud-Autosave, lokalem Spiegel, Tab-Recovery sowie validiertem JSON-Export und -Import
- Autoritative digitale Online-Würfe direkt aus der Datenbank
- Schiffe versenken lokal mit geheimer Übergabe oder synchron auf zwei Geräten, inklusive öffentlicher, privater und passwortgeschützter Räume
- Werwolf für fünf bis zwölf Mitspielende mit nicht mitspielender Leitung, sicheren Rollenansichten, Nachtführung sowie geheimer Handy- oder gemeinsamer Tischabstimmung
- Optionales Memory für ein bis sechs Personen; es erscheint erst ab sechs geprüften eigenen Motiven
- 78 Unit-Tests, sieben echte Playwright-Spielabläufe und Produktionsbuilds über die GitHub-Actions-Pipeline

## Lokal starten

Auf macOS kann die Datei `UGBZ-starten.command` doppelt angeklickt werden. Sie prüft den aktuellen Produktionsbuild und öffnet automatisch Port 3000 oder, falls dieser belegt ist, den nächsten freien Port.

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

Für die vollständige lokale Prüfung inklusive Browserabläufen:

```bash
npx playwright install chromium
npm run check:all
```

Kartenspiel speichert den Spielstand lokal. Imposter und Kniffel verwenden ohne Konfiguration einen lokalen Fallback und wechseln mit den dokumentierten Supabase-Variablen automatisch in den geräteübergreifenden Online-Modus.

Schiffe versenken behält den lokalen Pass-and-Play-Modus und nutzt optional dieselbe Freunde-Beta-Raumschicht wie Imposter und Kniffel. Werwolf bleibt wegen Rollen und Nachtaktionen bewusst auf einem Gerät. Für Memory legst du mindestens sechs nicht vertrauliche Bilder in `public/assets/memory/pairs/`; beim nächsten Start oder Build wird das Spiel automatisch geprüft und freigeschaltet. Hinweise zu Format und Dateinamen stehen in `public/assets/memory/README.md`.

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
