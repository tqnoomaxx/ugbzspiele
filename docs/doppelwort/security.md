# Doppelwort – Sicherheit und Datenschutz

## Bedrohungsmodell

Der Client ist nicht vertrauenswürdig. Rollenverteilung, Wortwahl, Timerwechsel, Stimmenauswertung und Punkte laufen produktiv ausschließlich in Postgres-Funktionen/Edge Functions. Der Browser sendet Absichten, niemals Resultate. Jede Mutation prüft Gast-Session, Raum-Mitgliedschaft, Phase, Hostrecht, `actionId` und erwartete Revision.

## Maßnahmen

- **Cheating:** Beide Wörter und alle Rollen bleiben in `rounds.private_payload` ohne Client-SELECT. Persönliche Secrets werden nur als RLS-gefiltertes Empfängerereignis oder einmalige Edge-Function-Antwort ausgeliefert.
- **Replay/Rennen:** UUID-`actionId`, eindeutige `room_actions`, optimistische Revision, kurze Transaktion, Zeilensperre plus Advisory Lock pro Raum.
- **Spam/Flooding:** Rate Limits je Session und IP-Hash: Session 10/min, Join 20/10 min, Befehle 30/min, Heartbeat 6/min, Reports 3/Tag. Redis/Upstash ist optional für mehrere Regionen; ein Postgres-Zähler genügt für den Start in einer Region.
- **Doppelte Verbindungen:** Eindeutige `(room_id, guest_id)`-Mitgliedschaft; mehrere Connection-IDs gehören derselben Session. Die neueste Verbindung übernimmt nur nach serverseitigem Nonce-Tausch.
- **XSS:** React escaped Namen; serverseitig Unicode normalisieren, Steuerzeichen entfernen, Längen begrenzen. Keine ungeprüften HTML-Inhalte oder dynamischen Script-URLs.
- **SQL Injection:** ausschließlich parametrisierte Supabase-Abfragen und typisierte RPC-Parameter, kein SQL-Stringbau aus Clientdaten.
- **CSRF:** Bearer-Token im `Authorization`-Header, restriktives CORS auf die Produktionsdomain, keine zustandsändernden GETs. Falls Cookies später hinzukommen: `SameSite=Lax/Strict` plus CSRF-Token.
- **Session Hijacking:** kurze Access Tokens, Refresh-Token-Rotation, TLS/HSTS, keine Tokens in URL/Logs, Session-Widerruf bei Ban. Keine dauerhafte Speicherung des Access Tokens außerhalb des Supabase-Clients.
- **Passwörter:** Argon2id in der Edge Function mit individuellem Salt; niemals Klartext oder Hash in Snapshots, Events oder Logs.
- **Admin:** MFA, getrennte Admin-Rolle, serverseitige Rollenprüfung, Audit für jede Moderation, keine Adminberechtigung aus Client-Claims allein.
- **Transport/Browser:** CSP (`default-src 'self'`; konkrete Supabase-`connect-src`), `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` ohne Kamera/Mikrofon/Standort.

Der lokale Browser-Testmodus enthält zwangsläufig alle Rollen im gemeinsamen Local-Storage-Snapshot. Er ist deutlich gekennzeichnet und kein Sicherheitsmodell für ein geräteübergreifendes Produkt.

## Datenminimierung

Gespeichert werden Gast-ID, Anzeigename, Raum-/Spielzustand, Stimmen, notwendige Moderationsdaten und technische Auditdaten. Keine E-Mail, Kontakte, Mikrofon-, Standort- oder Werbedaten. IP-Adressen nur kurzzeitig im Provider-Sicherheitslog; wenn ein Missbrauchsschutz einen Fingerprint benötigt, ausschließlich gesalzen gehasht und zeitlich begrenzt.

Vorgeschlagene Löschfristen:

| Daten | Standardfrist |
|---|---:|
| geschlossene Räume, Runden, Stimmen | 7 Tage |
| abgelaufene Gastprofile | 30 Tage |
| normale technische Logs | 14 Tage |
| Reports und Moderations-Audit | 90 Tage |
| aktive Bans | bis Ablauf/Widerruf, danach 30 Tage |
| aggregierte Statistik | ohne Personenbezug dauerhaft |

Ein täglicher Cleanup-Job löscht oder anonymisiert abgelaufene Datensätze. Backups altern entsprechend der Backup-Frist aus. Auskunft/Löschung kann über die Gast-ID und einen innerhalb der App erzeugten Supportcode erfolgen.

## Cookies und Rechtstexte

Die aktuelle App setzt keine Analyse- oder Werbe-Cookies. Local-/Session-Storage wird ausschließlich nach ausdrücklicher Spielaktion für Raum-/Spielzustand genutzt. Vor Produktionsstart müssen Verantwortlicher, Kontakt, Hosting-Auftragsverarbeitung, Rechtsgrundlagen, Betroffenenrechte, Drittlandtransfer und zuständige Aufsicht von der betreibenden Person in Datenschutz und Impressum ergänzt und juristisch geprüft werden. Ohne diese Angaben darf die Anwendung nicht als „DSGVO-konform“ beworben werden.

## Security-Tests vor Freigabe

- RLS-Testmatrix: Fremdraum, gekickter Gast, Zuschauer, Host, Moderator, abgelaufene Session.
- Secret-Leak-Test gegen REST, Realtime, Fehlerantworten, Logs und Browser-Cache.
- Replay-, Parallelstart-, Doppelstimme- und Revision-Konflikttests.
- Rate-Limit-/Join-Flood- und große Payload-Tests.
- Dependency- und Secret-Scan, CSP-Report, OWASP ZAP gegen Staging.
- Manuelle Prüfung von Hostwechsel, Ban-Umgehung und Admin-Audit.
