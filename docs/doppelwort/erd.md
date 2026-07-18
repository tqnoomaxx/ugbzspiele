# Doppelwort – Datenmodell

```mermaid
erDiagram
  AUTH_USERS ||--|| GUESTS : "anonyme Auth-Session"
  GUESTS ||--o{ ROOM_MEMBERS : joins
  ROOMS ||--o{ ROOM_MEMBERS : contains
  ROOMS ||--o{ GAMES : hosts
  GAMES ||--o{ ROUNDS : contains
  WORD_PAIRS ||--o{ ROUNDS : selected_for
  ROUNDS ||--o{ VOTES : receives
  GUESTS ||--o{ VOTES : casts
  ROOMS ||--o{ ROOM_EVENTS : streams
  ROOMS ||--o{ ROOM_ACTIONS : deduplicates
  GUESTS ||--o{ REPORTS : reports
  GUESTS ||--o{ BANS : may_receive
  AUTH_USERS ||--o| ADMIN_USERS : elevates
  AUTH_USERS ||--o{ AUDIT_LOGS : acts

  ROOMS {
    uuid id PK
    text code UK
    uuid host_guest_id FK
    text visibility
    text status
    text password_hash
    jsonb options
    bigint revision
  }
  ROUNDS {
    uuid id PK
    uuid game_id FK
    uuid word_pair_id FK
    text phase
    uuid_array speaking_order
    jsonb private_payload
    jsonb public_result
  }
  ROOM_EVENTS {
    bigint id PK
    uuid room_id FK
    bigint revision
    text event_type
    jsonb public_payload
    uuid recipient_guest_id FK
  }
```

`rounds.private_payload`, `votes`, `word_pairs` und Passwort-Hashes sind nicht direkt für Clients lesbar. Realtime veröffentlicht ausschließlich `room_events`; persönliche Rollen-/Wortereignisse tragen eine `recipient_guest_id` und werden durch RLS gefiltert.
