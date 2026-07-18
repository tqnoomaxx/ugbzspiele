# Doppelwort – Designsystem

## Konzepte

- Lobby: `design/doppelwort-lobby-concept.png`
- Spiel: `design/doppelwort-game-concept.png`
- Meeting: `design/doppelwort-meeting-concept.png`
- Mobile: `design/doppelwort-mobile-concept.png`

## Visuelle Richtung

Doppelwort bleibt klar Teil von UGBZ, bekommt aber eine eigene nächtliche Salon-Identität. Dunkles Blaugrün bildet den Hintergrund. Geheime Informationen liegen auf warmem Pergament. Messing strukturiert Flächen und Übergänge. Smaragd steht ausschließlich für sichere Aktionen und Crew-Erfolge; gedämpftes Violett für Imposter, Verdacht und geheime Zustände.

## Tokens

- Hintergrund: `#06171b`
- Hintergrund erhöht: `#0a2224`
- Pergament: `#e7d1a4`
- Pergament hell: `#f4e6c9`
- Haupttext dunkel: `#101b18`
- Haupttext hell: `#f2e5c8`
- Messing: `#b8893f`
- Smaragd: `#0f6546`
- Violett: `#65437f`
- Gefahr: `#bf5d4a`
- Rahmen: `rgba(184, 137, 63, .55)`

Schriften: Georgia als charakterstarke Display-Schrift, System-Sans für Bedienelemente. Primäre Touch-Ziele mindestens 48 Pixel. Bewegung beschränkt sich auf Kartenaufdecken, Timerfortschritt und Zustandswechsel; `prefers-reduced-motion` wird respektiert.

## Komponenten

- Offene Raumliste statt Kachel-Dashboard
- Fokussiertes Beitreten-/Erstellen-Panel
- Pergament-Wortkarte als einziger visueller Mittelpunkt
- Schmale Reihenfolge-/Verbindungsleiste
- Zweispaltige Stimmzettel auf Desktop, einspaltig mobil
- Ein primärer, mobil fixierter Aktionsbereich
- Admin- und seltene Einstellungen hinter sekundären Ansichten

## Kernzustände

1. Raumliste und Beitreten
2. Raumerstellung und Optionen
3. Lobby mit Spielern und Einladung
4. Private Rollen-/Wortenthüllung
5. Sprechreihenfolge mit Timer
6. Meeting und geheime Abstimmung
7. Auswertung, Wörter, Rollen und Punkte
8. Nächste Runde oder Gesamtwertung

## Code-native Inhalte

Alle Texte, Timer, Formulare, Zustände, Spielerlisten und Abstimmungen bleiben HTML/React. Das generierte Bild `public/assets/doppelwort-table.png` wird ausschließlich als Spielauswahl-Motiv genutzt.

