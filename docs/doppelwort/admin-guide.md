# Doppelwort – Admin- und Moderationshandbuch

Der produktive Adminbereich wird nicht als ungeschützte statische Seite ausgeliefert. Er nutzt Supabase Auth mit MFA, prüft `admin_users` serverseitig und trennt Rollen:

- **Moderator:** Reports prüfen, Spieler kicken/bannen, Räume sperren/schließen.
- **Admin:** zusätzlich Wortpaare, Sprachen und Laufzeitkonfiguration verwalten.
- **Owner:** zusätzlich Adminrollen und sicherheitskritische Einstellungen verwalten.

## Standardablauf Report

1. Queue nach Alter und Schwere öffnen; Kontext nur bei Bedarf laden.
2. Raum, Ziel, frühere aktive Bans und minimalen Auditkontext prüfen.
3. Status auf `reviewing` setzen; Entscheidung dokumentieren.
4. Bei akutem Missbrauch zuerst kicken oder Raum sperren, danach zeitlich begrenzten Ban setzen.
5. Report auf `resolved`/`rejected` setzen. Jede Aktion muss eine Auditzeile besitzen.

## Wortverwaltung

Neue Paare benötigen Sprache, Kategorie, Crew-Wort, Imposter-Wort und optionalen Hinweis. Wörter dürfen nicht identisch sein, keine Marken-/Personenimitation fördern und sollten ähnlich genug für eine Diskussion, aber unterscheidbar sein. Änderungen zuerst deaktiviert anlegen, Vier-Augen-Prüfung, dann aktivieren. Bereits gespielte Runden bleiben unverändert.

## Serverstatus

Dashboard-Kacheln: aktive Räume/Spiele, verbundene Gäste, offene Reports, p95-Befehlszeit, 5xx-Rate, Realtime-Lag, Datenbankverbindungen, letzter Cleanup und letzter erfolgreicher Backup-Restore-Test. Das Dashboard darf weder geheime Wörter laufender Runden noch Tokens/Passwörter anzeigen.

## Datenschutz und Zugriff

Adminzugriffe sind zweckgebunden, protokolliert und regelmäßig rezertifiziert. Reporttexte können sensible Inhalte enthalten und werden nicht in allgemeine Fehlerlogs kopiert. Export, Löschung oder Ban-Aufhebung erfolgen nur über dokumentierte Vorgänge.
