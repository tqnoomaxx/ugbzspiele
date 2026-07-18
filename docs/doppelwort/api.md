# Doppelwort – REST- und Realtime-Vertrag

Zielbasis: Supabase Edge Functions unter `/functions/v1/doppelwort`. Jeder Gast erhält zuerst eine anonyme Supabase-Auth-Session. Alle schreibenden Requests benötigen `Authorization: Bearer <access_token>`, `Content-Type: application/json`, eine UUID `actionId` und bei Raumänderungen `expectedRevision`.

## Einheitliche Antworten

Erfolg:

```json
{
  "data": { "roomCode": "K7M4Q", "revision": 12 },
  "requestId": "req_01J..."
}
```

Fehler:

```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "message": "Der Raum hat sich geändert.",
    "retryable": true,
    "details": { "currentRevision": 13 }
  },
  "requestId": "req_01J..."
}
```

Wichtige Statuscodes: `400 VALIDATION_ERROR`, `401 SESSION_REQUIRED`, `403 NOT_AUTHORIZED`/`BANNED`, `404 ROOM_NOT_FOUND`, `409 ROOM_FULL`/`NAME_TAKEN`/`REVISION_CONFLICT`/`INVALID_PHASE`, `422 VOTE_INVALID`, `429 RATE_LIMITED`, `503 REALTIME_UNAVAILABLE`.

## Gast und Verzeichnis

### `POST /session`

Legt das minimale Gastprofil zur bereits anonym authentifizierten Supabase-Session an.

```json
{ "displayName": "Robin", "locale": "de" }
```

Antwort `201`: `{ "data": { "guestId": "uuid", "expiresAt": "ISO-8601" } }`.

### `PATCH /session/heartbeat`

Body: `{ "roomCode": "K7M4Q", "connectionId": "uuid" }`. Antwort `204`. Intervall 15 Sekunden; nach 45 Sekunden ohne Heartbeat gilt ein Mitglied als offline.

### `GET /rooms?cursor=<opaque>&limit=20`

Liefert ausschließlich öffentliche Lobby-Metadaten aus `public_room_directory`: Code, Name, Status, Spielerzahl, Limit, Sprache, Kategorie und Passwort-Flag. Keine Optionen mit Geheimnissen, IP-Daten oder Passwort-Hashes.

## Räume

### `POST /rooms`

```json
{
  "actionId": "uuid",
  "name": "Freitagssalon",
  "visibility": "private",
  "password": null,
  "options": {
    "imposterCount": 1,
    "category": "all",
    "language": "de",
    "speakingSeconds": 30,
    "meetingSeconds": 45,
    "votingSeconds": 45,
    "skipAllowed": true,
    "hintsEnabled": true,
    "maxPlayers": 8,
    "autoNextRound": false,
    "randomHostOnLeave": true,
    "spectatorsAllowed": false,
    "roundCount": 3,
    "pointsEnabled": true,
    "autoWordRotation": true
  }
}
```

Antwort `201`: sicherer Raum-Snapshot plus Einladungscode. Das Passwort wird in der Edge Function mit Argon2id gehasht und nicht zurückgesendet.

### `POST /rooms/:code/join`

Body: `{ "actionId": "uuid", "password": "optional", "as": "player" }`. Fehler `409 ROOM_FULL`, `403 PASSWORD_INVALID` oder `403 BANNED`.

### `GET /rooms/:code/snapshot`

Autoritativer Reconnect-Snapshot. Enthält Raumrevision, Mitglieder, öffentliche Phase und nur für den aufrufenden Gast sein eigenes Geheimnis. Enthält niemals Rollen oder Wörter anderer Personen.

### `POST /rooms/:code/leave`

Body: `{ "actionId": "uuid", "expectedRevision": 12 }`. Überträgt bei Host-Austritt atomar die Leitung nach Raumoption, oder schließt einen leeren Raum.

### Host-Befehle

| Methode und Pfad | Body zusätzlich | Wirkung |
|---|---|---|
| `POST /rooms/:code/kick` | `targetGuestId`, `reason` | Verbindung entfernen |
| `POST /rooms/:code/ban` | `targetGuestId`, `reason`, `expiresAt?` | entfernen und Wiedereintritt sperren |
| `POST /rooms/:code/lock` | `locked: boolean` | neue Beitritte sperren/freigeben |
| `DELETE /rooms/:code` | `reason?` | Raum schließen |
| `POST /rooms/:code/transfer-host` | `targetGuestId` | Leitung gezielt übertragen |

Alle benötigen `actionId`, `expectedRevision`; `403 HOST_REQUIRED` bei fehlender Berechtigung.

## Spielbefehle

| Methode und Pfad | Erlaubte Phase | Body |
|---|---|---|
| `POST /rooms/:code/game/start` | Lobby | `actionId`, `expectedRevision` |
| `POST /rooms/:code/reveal/ack` | Reveal | `actionId`, `expectedRevision`, `roundId` |
| `POST /rooms/:code/speaking/finish` | Speaking | `actionId`, `expectedRevision`, `roundId` |
| `POST /rooms/:code/meeting/finish` | Meeting | `actionId`, `expectedRevision`, `roundId` |
| `POST /rooms/:code/votes` | Voting | `actionId`, `expectedRevision`, `roundId`, `targetGuestIds` |
| `POST /rooms/:code/rounds/next` | Result | `actionId`, `expectedRevision` |
| `POST /rooms/:code/reset` | Complete | `actionId`, `expectedRevision` |

Beispiel Stimme:

```json
{
  "actionId": "af56ccbb-9b30-4ce4-a8b6-c2be78daae39",
  "expectedRevision": 24,
  "roundId": "9955b6da-e4fc-4459-a8f3-408cd79554b1",
  "targetGuestIds": ["a85efc90-1b56-4347-bbe7-92776499f776"]
}
```

Leeres `targetGuestIds` bedeutet Skip und ist nur erlaubt, wenn die Raumoption aktiv ist. Maximal `imposterCount` unterschiedliche Ziele, niemals die abstimmende Person selbst. Eine Stimme ist durch `(round_id, voter_guest_id)` einmalig.

## Reports und Admin

- `POST /reports`: `{ roomCode?, reportedGuestId?, category, description? }`
- `GET /admin/overview`: aktive Räume/Spiele, verbundene Gäste, offene Reports, Fehlerrate
- `GET /admin/rooms`, `GET /admin/players`, `GET /admin/reports`, `GET /admin/audit`
- `PATCH /admin/reports/:id`: Status und interne Notiz
- `POST /admin/rooms/:id/close`, `/lock`, `/kick`, `/ban`
- `GET|POST|PATCH|DELETE /admin/word-pairs`
- `GET|PATCH /admin/settings`
- `GET /admin/health`: Datenbank, Realtime-Lag, Queue-/Function-Status

Admin-Endpunkte prüfen serverseitig `admin_users`, schreiben unveränderliche `audit_logs` und geben keine Session-/Fingerprint-Geheimnisse aus.

## Realtime-Kanal

Kanal: `room:<room-id>`. Transport ist Supabase Realtime WebSocket auf `room_events`; RLS filtert Mitgliedschaft und `recipient_guest_id`.

Jedes Event besitzt:

```json
{
  "eventId": 4821,
  "roomId": "uuid",
  "revision": 25,
  "type": "speaker_changed",
  "occurredAt": "2026-07-18T12:00:00.000Z",
  "payload": { "speakerGuestId": "uuid", "phaseEndsAt": "ISO-8601" }
}
```

Events:

- `room_snapshot_required`
- `member_joined`, `member_connection_changed`, `member_left`, `host_changed`
- `room_locked`, `room_closed`, `member_kicked`, `member_banned`
- `round_started`
- `secret_assigned` (nur Empfänger; Rolle, eigenes Wort, optionaler Hinweis)
- `reveal_progressed` (nur Anzahl, keine Namen/Rollen)
- `phase_changed`, `speaker_changed`, `timer_corrected`
- `vote_progressed` (nur Anzahl)
- `round_result` (Wörter, Rollen, aggregierte Stimmen, Punkte)
- `game_completed`
- `moderation_notice`

Clients ignorieren Events mit Revision kleiner/gleich dem lokalen Stand. Bei einer Lücke größer eins, `REVISION_CONFLICT`, Reconnect oder mehr als fünf Sekunden Drift laden sie `GET /snapshot`. Zeit wird als Server-Endzeit übertragen; der Client zeigt nur eine abgeleitete Uhr und korrigiert sie weich.

## Reconnect und Backoff

1. WebSocket mit aktuellem Access Token öffnen.
2. `1 s`, `2 s`, `4 s`, `8 s`, maximal `20 s` plus 0–30 % Jitter erneut versuchen.
3. Nach Verbindung immer Snapshot laden, dann Kanal ab dessen Revision verfolgen.
4. Nicht bestätigte Befehle mit derselben `actionId` erneut senden; der Server antwortet idempotent mit der ursprünglichen Revision.
5. Nach Token-Ablauf Session aktualisieren, nie geheime Daten in URL, Logs oder Local Storage schreiben.
