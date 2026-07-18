# Doppelwort – Vollständigkeitsprüfung

Stand: 18. Juli 2026. „Erfüllt“ bezeichnet im Frontend ausführbar oder durch Tests/Schema konkret vorhanden. „Teilweise erfüllt“ benennt die fehlende Produktionsverbindung. Der lokale Modus wird nicht als Online-Multiplayer ausgegeben.

| Bereich | Status | Nachweis / Restarbeit |
|---|---|---|
| Eigenständiges Wort-/Imposter-Prinzip | Erfüllt | Name, Regeln und Salon-Design sind eigenständig |
| Öffentliche und private Raumoberfläche | Erfüllt | lokale Raumliste, Code/Link, Sichtbarkeit, Passwortoption |
| Echter geräteübergreifender Raumbeitritt | Fehlt | Supabase-Projekt und Frontend-Online-Adapter anschließen |
| Rollen- und Wortverteilung | Erfüllt | Engine, zufällige Auswahl, 17 Tests insgesamt |
| Geheimhaltung im lokalen Test | Teilweise erfüllt | Pass-and-Play schützt visuell; Local Storage ist kein Trust Boundary |
| Geheimhaltung produktiv | Teilweise erfüllt | server-only Schema/RLS/Eventmodell vorhanden; Edge Function noch nicht deployt |
| Automatische Sprechreihenfolge | Erfüllt | zufällig, Timer, manuell fertig, automatischer Wechsel |
| Kein Chat/Aufgaben/Karte/Bewegung/Eliminierung | Erfüllt | bewusst nicht vorhanden |
| Meeting und Abstimmung mit Skip | Erfüllt | Timer, geheime Geräteübergabe, Mehrfachwahl bis Imposter-Anzahl |
| Eindeutige Sieglogik | Erfüllt | Engine, Unit Tests, Benutzer-/Architekturdokumentation |
| Alle Raumoptionen mit Defaults | Teilweise erfüllt | alle konfigurierbar; Zuschauer erst mit Online-Adapter aktiv |
| 100+ deutsche Wortpaare | Erfüllt | 120, testgesichert |
| 100+ englische Wortpaare | Erfüllt | 120, testgesichert |
| Kategorien/optionaler Hint | Erfüllt | sechs Kategorien, Filter, deaktivierbar |
| Desktop, Tablet, Smartphone | Erfüllt | responsive CSS; finale Browser-QA vor Deployment ausführen |
| WebSocket-Realtime | Teilweise erfüllt | Realtime-Tabelle, RLS, Events, Reconnectvertrag; nicht verbunden |
| Reconnect/Heartbeat/Latenzausgleich | Teilweise erfüllt | API-/Betriebskonzept vollständig; Online-Adapter fehlt |
| Hostrechte und Hostwechsel | Erfüllt | Start/Fortschritt/Kick lokal, Engine-Hosttransfer und Backendmodell |
| Kick/Ban/Lock/Close | Teilweise erfüllt | Kick lokal; Schema/API für alle; produktive Admin-/Host-Functions fehlen |
| Zuschauer | Teilweise erfüllt | Option/Datenmodell vorhanden; UI-/Online-Verhalten fehlt |
| Gastmodus ohne Registrierung | Erfüllt | lokal sofort; produktiv anonyme Supabase Auth vorgesehen |
| Mehrere Runden/Punkte/Wortrotation | Erfüllt | Engine und Oberfläche |
| Adminpanel | Fehlt | Rollen, Tabellen, Endpunkte und Handbuch spezifiziert; sichere MFA-UI/Functions fehlen |
| Reports, Logs, Statistik, Wortverwaltung | Teilweise erfüllt | vollständiges Datenmodell/API/Handbuch; laufender Adminservice fehlt |
| Datenschutz/Minimierung/Löschung | Teilweise erfüllt | Daten- und Fristenkonzept vorhanden; Betreibertexte/AVV/juristische Prüfung fehlen |
| Cookie-Einwilligung | Teilweise erfüllt | aktuell keine nicht notwendigen Cookies; bei späterem Tracking Consent ergänzen |
| Impressum/Datenschutzerklärung | Fehlt | reale Betreiber- und Hostingangaben fehlen, siehe `legal-todo.md` |
| Moderne minimalistische Dark-Mode-UI | Erfüllt | vier Designkonzepte, eigenes Token-/Komponentensystem |
| Barrierearme Bedienung | Teilweise erfüllt | semantische Formulare, Fokus, 48px-Ziele, Reduced Motion; Screenreader-Audit fehlt |
| Lade-/Leer-/Fehler-/Erfolgszustände | Erfüllt | Routenloader, leere Raumliste, Inlinefehler, Ergebniszustände |
| Frontend/Backend/DB/API/WebSockets | Teilweise erfüllt | Frontend/Engine/DB/API-Vertrag vorhanden; deployte Backend-Functions fehlen |
| Datenmodell mit ERD | Erfüllt | Migration plus Mermaid-ERD |
| REST-Endpunkte/WebSocket-Events dokumentiert | Erfüllt | Requests, Antworten, Fehler, Beispiele, Events |
| Security Controls | Teilweise erfüllt | RLS/Constraints/Locks/Threat Model vorhanden; Securitytest gegen echtes Staging fehlt |
| Unit Tests | Erfüllt | Engine, Wörter, Phasen, Sieg, Timer, Punkte, Hostwechsel |
| Integration-/E2E-/Last-/Securitytests | Teilweise erfüllt | lokaler Browser-Smoke-Test ausstehend; Online-/Last-/Securitytests benötigen Backend |
| Deployment/Monitoring/Logging/Recovery/Backups | Teilweise erfüllt | Runbook/SLO/Jobs vorhanden; externe Dienste nicht provisioniert |
| CI/CD | Teilweise erfüllt | lokaler `npm run check`; GitHub-Pipeline noch nicht eingerichtet |
| TypeScript Strict | Teilweise erfüllt | UGBZ bleibt auf ausdrücklichen Wunsch JS; Edge Functions sollen Strict TS nutzen |
| SOLID/DRY/KISS/Clean Boundaries | Erfüllt | pure Engine, Adapter, Seiten und Design getrennt |
| Vollständige Dokumentation | Erfüllt | README, Architektur, ERD, API, Security, Betrieb, User, Admin, Developer, Checkliste |

## Produktions-Gates

1. Supabase-Projekt/Secrets bereitstellen und Edge Functions/Online-Adapter implementieren.
2. Sichere Adminoberfläche mit MFA und Audit implementieren.
3. Betreiber-/Datenschutzangaben ergänzen und rechtlich freigeben.
4. Integration-, E2E-, Last-, RLS- und Securitysuite gegen Staging bestehen.
5. Backups/Monitoring/Alarmierung aktivieren und Restore nachweisen.

Bis alle fünf Gates erfüllt sind, ist die Anwendung eine hochwertige, lokal spielbare Integration mit produktionsnah vorbereitetem Backend – nicht vollständig produktionsreifer Online-Multiplayer.
