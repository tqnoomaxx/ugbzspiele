# UGBZ

UGBZ ist eine responsive Spielstand-App für Stichkartenspiele. Die Startseite ist für weitere Spiele und spätere Spielräume vorbereitet.

## Enthalten

- Spielplan mit Rundenzahl, Kartenfolge und geschätzter Dauer vor dem Start
- Erklärte Punkteformel und auditierbarer Rundenverlauf
- Faire Rangfolge mit gemeinsamen Platzierungen bei Gleichstand
- Korrektur von Ansagen, letzter Wertung und Schlussrunde
- Mobiler Spielleitermodus mit festem Bestätigungsbutton und kompaktem Zwischenstand
- Automatisches lokales Speichern, sichtbares Fortsetzen und Überschreibschutz

## Lokal starten

```bash
npm install
npm run dev
```

## Prüfen

```bash
npm run check
```

Die aktuelle Version speichert den Spielstand lokal und kapselt den Zugriff über ein versioniertes Repository. Eine Cloud- oder Spielraum-Synchronisierung kann dieses Repository später ersetzen.
