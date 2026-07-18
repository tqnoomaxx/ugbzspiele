# UGBZ Online-Modus

## Was bereits integriert ist

UGBZ besitzt eine gemeinsame Raumplattform für Doppelwort und spätere Spiele:

- anonyme Supabase-Sitzungen ohne Registrierung
- öffentliche und private Räume mit Einladungscode
- optional gehashte Raumpasswörter
- geräteübergreifende Postgres-Realtime-Aktualisierung
- optimistische Revisionen gegen überschriebene Spielzüge
- Reconnect über lokale Raumsitzung und autoritativen Datenbank-Snapshot
- automatischer lokaler Fallback, wenn keine Online-Konfiguration vorhanden ist
- semantischer Adaptervertrag: `create`, `join`, `load`, `listPublic`, `mutate`, `leave`, `remove`, `subscribe`

## Supabase einmalig einrichten

1. Ein Supabase-Projekt in einer passenden Region erstellen.
2. Unter **Authentication → Providers → Anonymous Sign-Ins** anonyme Anmeldung aktivieren.
3. Supabase CLI anmelden und das Projekt verbinden:

```bash
npx supabase login
npx supabase link --project-ref DEINE_PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
```

4. Für lokale Entwicklung `.env.example` nach `.env.local` kopieren und URL sowie Publishable/Anon Key eintragen.
5. Im GitHub-Repository unter **Settings → Secrets and variables → Actions** setzen:

| Typ | Name | Wert |
|---|---|---|
| Variable | `NEXT_PUBLIC_ROOM_MODE` | `online` |
| Variable | `NEXT_PUBLIC_SUPABASE_URL` | `https://PROJECT.supabase.co` |
| Secret | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable/Anon Key |

Nach einem neuen Push baut GitHub Pages automatisch den Online-Modus. Fehlt einer der Werte, bleibt die Website lokal spielbar.

## Ein weiteres Spiel anschließen

1. Die serialisierbare Spielzustandsmaschine unter `src/games/<spiel>/` anlegen. Der Raumzustand benötigt mindestens `code`, `name`, `status`, `hostId`, `players`, `options`, `revision` und `updatedAt`.
2. Einen lokalen Adapter mit demselben semantischen Vertrag wie `localDoppelwortRoomRepository` bereitstellen.
3. Den kombinierten Adapter erzeugen:

```js
import { createGameRoomRepository } from '../../platform/supabaseRoomRepository.js'

export const roomRepository = createGameRoomRepository({
  gameKey: 'mein-spiel',
  localRepository,
  sessionKey: 'ugbz:mein-spiel:session:v1',
  summarize: getRoomSummary,
})
```

4. Das Spiel in `src/games/registry.js` mit `rooms.gameKey` registrieren.
5. UI-Aufrufe mit `await` verwenden; der lokale Adapter darf weiterhin synchron antworten.
6. Engine-, Repository-, Zwei-Geräte- und Reconnect-Tests ergänzen.

## Sicherheitsgrenze der ersten Online-Version

Die Datenbank erzwingt Authentifizierung, Mitgliedschaft, Passwortprüfung, Sichtbarkeit und Revisionsschutz. Die aktuelle gemeinsame Plattform speichert den vollständigen serialisierten Spielzustand für Raummitglieder. Die Oberfläche zeigt Geheimnisse nur der jeweils angemeldeten Person, technisch versierte Mitglieder könnten den Netzwerkzustand jedoch untersuchen.

Für öffentliche Wettbewerbsräume muss jedes Spiel zusätzlich einen serverautoritativen Command-Adapter erhalten: geheime Zustände in einer privaten Tabelle, nur eigenes Geheimnis pro Empfänger, serverseitige Rollenverteilung und validierte Befehle statt vollständiger Client-Snapshots. Für private Freundesrunden ist die integrierte Version als Online-Beta gedacht.
