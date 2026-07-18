# UGBZ design specification

## Source concepts

- `design/ugbz-home-concept.png` — landing page, 1505 × 1045
- `design/ugbz-setup-concept.png` — game setup, 1505 × 1045
- `design/ugbz-game-concept.png` — active round and scoreboard, 1504 × 1046
- `design/ugbz-mobile-concept.png` — responsive direction, 1491 × 1055
- `public/assets/cards-on-felt.webp` — optimiertes Produktionsmotiv, 1536 × 1024

## Copy lock

Landing first viewport:

- `UGBZ`
- `Was wird gespielt?`
- `Wähle ein Spiel und leg direkt los.`
- `Kartenspiel`
- `Stiche ansagen, Runden werten, Spielstand behalten.`
- `Spiel öffnen`
- `Spielräume`
- `Gemeinsam spielen – folgt später.`

Game setup:

- `Zurück`
- `Kartenspiel`
- `Neue Runde`
- `Wer spielt mit?`
- `Spieler hinzufügen`
- `Kartendeck`
- `32 Karten`
- `54 Karten`
- `Spielmodus`
- `Hin & Zurück`
- `Nur Hin`
- `Spiel starten`
- `Letztes Spiel fortsetzen`

Active game:

- `Kartenspiel`
- `Runde … von …`
- `… Karten`
- `Stiche ansagen`
- `Insgesamt angesagt: …`
- `Start`
- `Ansagen bestätigen`
- `Ergebnisse eintragen`
- `Runde auswerten`
- `Letzte Eingabe korrigieren`
- `Spielstand`
- `Spieler`
- `Punkte`
- `Letzte Runde`

## Design system

- Background: warm parchment gray `#f3f0e8`; this is intentionally not white.
- Surface: warm ivory `#fbfaf6`.
- Ink: `#13231d`.
- Primary: deep forest green `#0f3b2c`; hover `#164d3a`.
- Brass: `#b48a43`; quiet borders `#cfc5b0`.
- Positive: `#17623d`; negative: `#8b2f2f`.
- Display type: Georgia with an editorial serif character.
- UI type: Inter/system sans, explicit control sizes and weights.
- Radius family: 12, 16, and 20px. Shadows stay short and warm.
- Container model: open page bands and one purposeful surface per task area; no bento grid or nested-card stack.
- Motion: short opacity/translate entrance and restrained hover lift; disabled areas do not move.

## Component and icon inventory

- App header: UGBZ wordmark, back/home icon where needed.
- Landing: one wide game feature, one disabled room row.
- Setup: player editor rows, add-player action, two-option segmented controls, primary and secondary actions.
- Gameplay: progress bar, player counter rows, starter marker, primary confirmation, undo action, open scoreboard table.
- Icons: home, arrow-left, arrow-right, user, plus, minus, close, undo, cards, door, star, trophy. All use the same rounded 1.8px outline geometry; star/trophy may be brass filled accents.

## Responsive rules

- Desktop landing uses a horizontal feature with artwork left and content right.
- Setup and active game use two columns above 900px.
- Below 900px, task areas stack; the scoreboard follows the round controls.
- Below 600px, header and sections tighten while controls retain at least 44px touch targets.
- No horizontal scrolling is allowed.

## State and architecture

- Game modules register through a central game registry.
- Local storage uses a versioned repository key and guarded reads/writes.
- The repository interface is intentionally replaceable by a future room/cloud repository.
- Rooms are visible but disabled and have no active backend in version 1.
