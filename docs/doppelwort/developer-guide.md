# Doppelwort – Entwicklerhandbuch

## Modulgrenzen

- `src/games/doppelwort/gameEngine.js`: reine, deterministische Zustandsmaschine; keine DOM-, Netzwerk- oder Speicherzugriffe.
- `defaults.js`: sämtliche Standardoptionen und Kategorien.
- `wordPairs.js`: 240 integrierte Paare mit stabilen IDs.
- `roomRepository.js`: Doppelwort-Adapter mit identischem lokalem und Online-Vertrag.
- `src/platform/supabaseRoomRepository.js`: generische Räume, Revisionsschutz, Realtime und Sitzungen für alle Spiele.
- `src/platform/supabaseClient.js`: genau eine lazy geladene anonyme Supabase-Session.
- `DoppelwortLobbyPage.jsx`: Verzeichnis, Beitritt und Konfiguration.
- `DoppelwortRoomPage.jsx`: Renderer/Controller für alle Phasen.
- `src/doppelwort.css`: route-spezifisches Designsystem und responsive Zustände.
- `supabase/migrations/001_doppelwort.sql`: produktives Datenmodell, Indizes, RLS, Realtime-Events und atomare Basistransition.
- `supabase/migrations/002_platform_rooms.sql`: sofort nutzbare gemeinsame Raumtransport-Schicht für Doppelwort und spätere Spiele.

Die UI mutiert Räume nie direkt. Sie ruft eine Engine-Funktion innerhalb `roomRepository.mutate` auf. Jede erfolgreiche Engine-Mutation erhöht `revision`. Lokal wird der Snapshot gespeichert; online schreibt ein revisionsgesicherter Postgres-RPC und Realtime fordert alle anderen Geräte zum Nachladen auf.

## Zustände ergänzen

1. Phase und erlaubte Transition in der Engine modellieren und Unit Tests zuerst ergänzen.
2. Nur öffentliche Felder in Realtime-Event/API aufnehmen; persönliche Daten als Empfängerereignis.
3. Renderer in `DoppelwortRoomPage` ergänzen, klare Leer-/Fehler-/Timeout-Zustände vorsehen.
4. Desktop 1505×1045 und Mobile 390×844 prüfen, Tastatur und Reduced Motion testen.
5. Datenbankconstraint/RPC, API-Dokumentation und Vollständigkeitscheck gemeinsam aktualisieren.

## Wortpaare ergänzen

Ein Eintrag hat Kategorie, Crew-Wort und Imposter-Wort. Beide dürfen nicht identisch sein und sollten auf gleicher Abstraktionsebene liegen. Beide Sprachsammlungen bleiben unabhängig. Tests sichern Mindestzahl und Kategoriefilter. Produktiv werden Paare per Admin-Import in `word_pairs` übertragen; die Serverrunde wählt nur aktivierte Einträge und verhindert Wiederholung über die Spielhistorie.

## Invarianten

- 3–12 Spieler, mindestens eine Crew-Person.
- 1 bis `Spielerzahl - 1` Imposter.
- Rollen und Reihenfolge werden ausschließlich mit serverseitiger CSPRNG verteilt.
- Pro Runde und Wähler genau eine Stimme; höchstens `imposterCount` Ziele, kein Selbstvotum.
- Absolute Mehrheit ist `floor(stimmberechtigte Spieler / 2) + 1`; Skip senkt sie nicht.
- Crew-Sieg nur bei allen erkannten Impostern und ohne Crew-Fehlmehrheit.
- Timer speichern eine Server-Endzeit, keinen herunterzählenden autoritativen Clientwert.

## Qualitätsbefehle

```bash
npm test
npm run build
npm run check
```

Das Repository ist auf ausdrücklichen Wunsch der bestehenden UGBZ-Anwendung JavaScript-basiert. Produktions-Edge-Functions sollten TypeScript Strict verwenden; ein späterer Frontend-Wechsel kann modulweise erfolgen, da Engine und Adapter bereits getrennt sind.
