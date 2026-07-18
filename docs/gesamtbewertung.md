# UGBZ – vollständige Bewertung und Kritik

Stand: 18. Juli 2026

## Kurzurteil

UGBZ ist als **lokaler Spieleabend-Begleiter** bereits überzeugend: visuell eigenständig, auf Mobilgeräten gut bedienbar, schnell verständlich und in den getesteten Hauptabläufen stabil. Das Kartenspiel funktioniert als hochwertiger digitaler Spielleiter für ein physisches Stichspiel. Doppelwort funktioniert vollständig als Pass-and-Play-Spiel auf einem Gerät und zwischen Tabs desselben Browsers.

UGBZ ist aber noch **kein produktionsreifes Online-Multiplayer-Produkt**. Geräteübergreifende Räume, autoritative Serverlogik, Reconnect, Adminbereich, Moderation, dauerhafte öffentliche Bereitstellung, Monitoring und Rechtstexte sind nur entworfen oder vorbereitet. Der aktuelle öffentliche Quick-Tunnel ist ein Übergang, kein belastbares Hosting.

Zwei getrennte Gesamturteile sind deshalb ehrlicher als eine einzige Durchschnittsnote:

| Zielbild | Bewertung | Urteil |
|---|---:|---|
| Lokaler Spieleabend auf einem Gerät | **8,1/10** | gut spielbar und vorzeigbar |
| Vollständiges öffentliches Online-Produkt | **3,5/10** | gute Grundlage, zentrale Produktionsschicht fehlt |

## Bewertungsgrundlage

Die Bewertung basiert auf:

- Abgleich mit dem ursprünglichen Kartenspiel und dem vollständigen Doppelwort-Master-Prompt
- Sichtprüfung der Startseite und repräsentativer Spielzustände
- vollständigem Kartenspielablauf bis zum Endergebnis
- vollständiger Doppelwort-Runde von Lobby bis Gesamtwertung
- Pass-and-Play- und Zwei-Tab-Test
- Desktop-, Mobil-, Touch- und Reduced-Motion-Prüfung
- Tastatur- und Fokusprüfung
- Review von Engines, Repositories, React-Seiten, Styles, CI, Supabase-Migration, API-, Security- und Betriebsdokumentation
- Abhängigkeits- und Buildprüfung
- gezielten Randfalltests für Wortverteilung, abgelaufene Timer, Kick während einer Runde und beschädigte Spielstände

Technische Nachweise:

| Prüfung | Ergebnis |
|---|---|
| Automatisierter Browser-Playtest | **38/38 bestanden** |
| Browserfehler, Console-Warnungen, fehlerhafte Requests | **0** im normalen Hauptablauf |
| Unit Tests | **22/22 bestanden** |
| Produktionsbuild | **5 Produkt-Routen plus 404 statisch erzeugt** |
| Horizontaler Overflow bei 390 × 844 | **nicht vorhanden** |
| sichtbare Touch-Ziele auf der mobilen Startseite | **mindestens 44 × 44 px** |
| `npm audit`, inklusive Entwicklungsabhängigkeiten | **0 bekannte Schwachstellen** |
| anonymer Quick-Tunnel-Aufruf | **HTTP 200** |
| anonymer permanenter ChatGPT-Sites-Aufruf | **HTTP 401 wegen Workspace-Regel** |

Das Browser-Plugin war nicht verfügbar. Die gerenderte Prüfung erfolgte mit lokalem Playwright und Google Chrome.

## Teilbewertungen

| Bereich | Note | Einordnung |
|---|---:|---|
| Visuelles Design und Markenwirkung | 8,7/10 | eigenständig, hochwertig, konsistent |
| Startseite und Spielauswahl | 8,2/10 | klar und erweiterbar angelegt, aber noch nicht wirklich modular |
| Kartenspiel – lokale Spielbarkeit | 8,4/10 | sehr guter Spielleiter, kein eigenständiges Kartenspiel |
| Doppelwort – lokales Pass-and-Play | 7,7/10 | vollständiger Ablauf, gute Dramaturgie, mehrere Korrektur- und Fairnesslücken |
| Responsive Bedienung | 8,6/10 | Desktop und Mobil stabil, keine Überläufe |
| Barrierearmut | 6,8/10 | gute Basis, Screenreader- und Fokusübergänge unvollständig |
| Code- und Zustandsarchitektur | 7,2/10 | saubere Engines, aber große Komponenten und lokale Sonderlogik |
| Automatisierte Qualitätssicherung | 6,5/10 | gute Unit-Basis, E2E nicht im Repository oder CI |
| Sicherheit im aktuellen lokalen Modus | 5,5/10 | für Pass-and-Play ausreichend, keine echte Vertrauensgrenze |
| Vorbereitete Produktionsarchitektur | 7,4/10 | durchdacht dokumentiert, aber überwiegend noch nicht implementiert |
| Tatsächliche Online-Fähigkeit | 2,0/10 | kein geräteübergreifender Multiplayer |
| Öffentliche Betriebsreife | 2,5/10 | kein dauerhaft anonym erreichbares Hosting, Monitoring oder rechtliche Freigabe |

## Die größten Stärken

### 1. Sehr starke visuelle Identität

Die Startseite wirkt nicht wie ein generisches Dashboard. Kartenfilz, Umschläge, Papier-, Messing- und Salontöne geben beiden Spielen einen klaren Charakter. Die beiden Spiele haben unterschiedliche Stimmungen, bleiben aber als Teil derselben Plattform erkennbar.

Besonders gelungen:

- großzügige Typografie und eindeutige Hierarchie
- hochwertige Bildmotive statt austauschbarer Stock-UI
- klare Primäraktionen
- gute mobile Neuanordnung der Spielkarten
- sichtbare Fokusrahmen
- passende Dark-Mode-Atmosphäre bei Doppelwort
- der versiegelte Umschlag als verständlicher und spielerischer Geheimnis-Mechanismus

### 2. Hauptabläufe funktionieren zuverlässig

Im normalen Zustand wurden keine Blocker gefunden. Beide Spiele überleben Reloads und können von Anfang bis Ende gespielt werden. Fehler wie doppelte Namen, leere Namen und ungültige Stichsummen werden verständlich abgefangen.

### 3. Gute Trennung von Spiellogik und Oberfläche

Die Engines unter `src/games/` sind weitgehend reine Zustandsfunktionen. Das erleichtert Unit Tests, spätere Backend-Übertragung und reproduzierbare Fehleranalyse. Rendering, Speicherung und Spielregeln sind besser getrennt als in der ursprünglichen einzelnen HTML-Datei.

### 4. Kartenspiel wurde sinnvoll professionalisiert

Gegenüber dem ursprünglichen Stand wurden wichtige Alltagsschwächen gelöst:

- verständlicher Spielplan vor dem Start
- direkte Zahleneingabe zusätzlich zu Plus/Minus
- validierte Stichsumme
- sichtbarer Starter
- auditierbarer Verlauf
- erklärte Punkteberechnung
- faire Gleichstände
- Korrektur der letzten und finalen Runde
- automatisches Speichern und Überschreibschutz
- kompakter mobiler Zwischenstand

### 5. Doppelwort hat einen vollständigen lokalen Spielfluss

Lobby, Rollenverteilung, geheime Wörter, Sprechreihenfolge, Timer, Meeting, geheime Abstimmung, Sieglogik, Punkte, mehrere Runden und Gesamtwertung sind vorhanden. Die Oberfläche führt deutlich besser durch den Ablauf als ein bloßes technisches Demo.

### 6. Dokumentation ist ungewöhnlich ehrlich

Die vorhandenen Dokumente behaupten nicht, dass lokaler Browser-Speicher echter Multiplayer sei. Architektur, Datenmodell, API, Security, Betrieb und rechtliche Restarbeiten sind sauber getrennt. Das ist eine gute Grundlage für die nächste Entwicklungsstufe.

## Priorisierte Kritikpunkte

### Blocker – vor einer öffentlichen Online-Freigabe

#### B-01: Echter Online-Multiplayer fehlt

**Was Nutzer sehen:** Ein Raumcode oder Einladungslink funktioniert nur im selben Browser-Speicher. Auf einem anderen Smartphone oder Computer existiert der Raum nicht.

**Nachweis:** Das Frontend verwendet ausschließlich `localStorage`, `sessionStorage` und `BroadcastChannel`. Es gibt keinen Supabase-Client, keinen Online-Adapter und keine Verwendung von `NEXT_PUBLIC_DOPPELWORT_MODE` im Anwendungscode.

**Warum kritisch:** Dies widerspricht dem zentralen Ziel „Online-Multiplayer in Echtzeit“. Öffentliche Räume, Reconnect, Heartbeat, Latenzausgleich und geräteübergreifende Geheimnisse sind damit nicht verfügbar.

**Verantwortlich:** Backend, Realtime, Frontend-Adapter, Deployment.

**Empfehlung:** Supabase-Projekt provisionieren, Migration ausführen, Edge Functions implementieren, autoritativen Repository-Adapter anschließen und mit mindestens drei echten Geräten testen.

**Aufwand:** XL.

#### B-02: Keine dauerhafte anonyme öffentliche Bereitstellung

**Was Nutzer sehen:** Der permanente `chatgpt.site`-Link liefert anonym HTTP 401. Der funktionierende `trycloudflare.com`-Link endet, sobald Mac, lokaler Server oder Tunnel beendet werden.

**Ursache:** Der aktuelle Workspace erlaubt laut Sites-API kein „Publishing Sites to the internet“.

**Warum kritisch:** Das Produkt ist nicht zuverlässig teilbar und besitzt keine Uptime-Garantie.

**Verantwortlich:** Hosting/Workspace-Administration.

**Empfehlung:** Öffentliche Sites-Freigabe administrativ aktivieren oder das statische Frontend dauerhaft auf Netlify, Vercel, Cloudflare Pages oder GitHub Pages veröffentlichen. Danach Domain, TLS, Cache-Regeln und Healthcheck prüfen.

**Aufwand:** M; teilweise externe Freigabe nötig.

#### B-03: Produktionsfunktionen existieren größtenteils nur als Vertrag

**Betroffen:** Adminpanel, Moderation, Reports, Ban, Lock, serverseitige Rollenverteilung, Passwort-Hashing, Rate Limits, Cleanup-Jobs, Monitoring, Backups und Restore.

**Nachweis:** Schema und Dokumentation sind vorhanden, aber keine Edge Functions, kein Admin-Frontend und kein deployter Backend-Dienst.

**Warum kritisch:** Ein gutes Datenmodell ist noch kein laufendes System. Die Checkliste darf diese Bereiche nicht als praktisch verfügbar erscheinen lassen.

**Empfehlung:** Funktionen als eigene Release-Etappen implementieren und jede Stufe gegen Staging testen.

**Aufwand:** XL.

#### B-04: Rechtliche Freigabe fehlt

Impressum, Datenschutzerklärung, Betreiberangaben, Hosting-Verträge und juristische Prüfung fehlen bewusst. Eine anonyme öffentliche Produktion darf daher nicht als DSGVO-konform oder vollständig freigegeben beworben werden.

**Aufwand:** extern abhängig.

### Hoch – Spielintegrität und robuste Kernlogik

#### H-01: Wortpaare haben immer dieselbe Rollenrichtung

**Was Nutzer sehen:** „Pizza“ ist immer Crew, „Burger“ immer Imposter; „Katze“ ist immer Crew, „Tiger“ immer Imposter.

**Reproduktion:** 20 gestartete Testpartien wurden mit unterschiedlichen Zufallswerten geprüft. In **20/20 Fällen** blieb `pair.crew` das Crew-Wort und `pair.imposter` das Imposter-Wort.

**Warum wichtig:** Wiederkehrende Spieler können ihre Rolle aus dem Wort lernen. Das beschädigt die zentrale Deduktionsmechanik, auch wenn die Rollen selbst zufällig verteilt werden.

**Verantwortlich:** `src/games/doppelwort/gameEngine.js`, `wordPairs.js`.

**Empfehlung:** Nach Auswahl eines Paares per Zufall entscheiden, welches der beiden Wörter Crew- beziehungsweise Imposter-Wort wird. Die Orientierung muss Teil des serverautoritativ gespeicherten Rundenstands sein und durch Tests abgesichert werden.

**Aufwand:** S.

#### H-02: Kick während einer laufenden Runde erzeugt inkonsistenten Zustand

**Reproduktion:** Ein Spieler wurde nach `startGame` durch den Host entfernt. Danach war er nicht mehr in `room.players`, blieb aber in `game.playerIds`.

**Auswirkung:** Reveal-, Sprech- oder Abstimmungsphasen können auf eine nicht mehr vorhandene Person warten; Ergebnis- und Imposterlogik können widersprüchlich werden.

**Aktuelle Oberfläche:** Der lokale Host zeigt den Entfernen-Button nur in der Lobby. Die dokumentierte Online-Moderation soll Kick aber auch produktiv unterstützen und benötigt deshalb eine definierte laufende-Runde-Strategie.

**Empfehlung:** Festlegen: laufende Person als ausgeschieden/offline markieren und Stimme automatisch als Enthaltung behandeln, oder Runde kontrolliert abbrechen/neu aufbauen. Niemals nur aus `room.players` löschen.

**Aufwand:** M.

#### H-03: Timer holen lange Ausfälle nicht korrekt auf

**Reproduktion:** Eine Sprechphase mit drei Personen wurde zehn Minuten nach Ablauf erneut verarbeitet. Die Engine wechselte nur von Sprecherindex 0 auf 1 und blieb in `speaking`.

**Auswirkung:** Bei Hintergrund-Tab-Throttling, Reconnect oder serverseitigem Minutenjob können Phasen deutlich länger dauern als eingestellt. Der dokumentierte Wartungsjob „jede Minute“ würde bei zwölf Spielern schlimmstenfalls nur eine Person pro Minute fortschalten.

**Empfehlung:** Catch-up-Schleife mit Obergrenze oder serverseitige nächste Transition exakt auf `phase_ends_at` planen. Jede Transition muss idempotent und revisionssicher bleiben.

**Aufwand:** M.

#### H-04: Aktueller öffentlicher Betrieb liefert keine Security Header

Im lokalen Server und über den Quick-Tunnel fehlten bei der Prüfung:

- Content-Security-Policy
- HSTS am öffentlichen Endpunkt
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `X-Frame-Options` beziehungsweise `frame-ancestors`
- explizite Cache-Regeln

**Auswirkung:** Für das heutige statische Spiel ist das Risiko begrenzt, für Login, Gast-Tokens und Realtime wäre es nicht akzeptabel.

**Empfehlung:** Header im dauerhaften Hosting setzen und in CI beziehungsweise Deployment-Smoke-Tests prüfen.

**Aufwand:** S.

### Mittel – Spielerlebnis, Recovery und Qualitätssicherung

#### M-01: Beschädigter lokaler Spielstand hat keinen Selbstheilungsweg

**Reproduktion:** Ein formal passender, aber unvollständiger `ugbz:card-game:v1`-Eintrag wurde gespeichert. Die Spielroute zeigte nur „This page couldn’t load – Reload / Back“. Reload wiederholt denselben Fehler.

**Ursache:** `isValidGame` prüft nur wenige Top-Level-Felder und nicht Phase, Zählerlängen, Rundengrenzen oder Historienstruktur.

**Empfehlung:** Vollständiges Schema validieren, fehlerhafte Daten quarantänisieren, einen sichtbaren „Defekten Spielstand löschen“-Weg anbieten und optional Export/Import ergänzen.

**Aufwand:** S–M.

#### M-02: Keine Korrektur für Doppelwort-Stimmen oder Phasen

Eine versehentlich bestätigte Stimme ist endgültig. Ebenso gibt es keinen Host-Befehl für „letzten Schritt zurück“, „Timer neu starten“ oder „Runde abbrechen“.

**Warum wichtig:** Pass-and-Play wird häufig auf kleinen Bildschirmen und in lebhaften Gruppen gespielt. Fehlbedienung ist normal und sollte nicht die gesamte Runde ruinieren.

**Empfehlung:** Vor Bestätigung kurze Zusammenfassung, optional dreisekündiges Undo und ein revisionsgesichertes Host-Korrekturmenü.

**Aufwand:** M.

#### M-03: Das Kartenspiel erklärt den Zähler, aber nicht das eigentliche Kartenspiel

Die Oberfläche erklärt Ansagen und Punkte. Sie erklärt nicht, welches physische Spiel gemeint ist, wie Karten gegeben werden, ob es Trumpf/Farbenregeln gibt oder was genau ein Stich ist.

**Auswirkung:** Für bestehende Gruppen ist das völlig ausreichend. Neue Nutzer können „Kartenspiel“ aber mit einem vollständigen digitalen Spiel verwechseln.

**Empfehlung:** Auf Home und Setup klar „Spielleiter für euer physisches Stichspiel“ schreiben, das Spiel benennen oder eine kurze vollständige Regelhilfe verlinken.

**Aufwand:** S.

#### M-04: Doppelwort-Konfiguration ist für neue Hosts überladen

Die Raum-Erstellung zeigt gleichzeitig Identität, Sichtbarkeit, Spielerlimit, Sprache, Kategorie, Imposter, Runden, drei Timer und acht Schalter. Die Optionen sind vollständig, aber die erste Entscheidungslast ist hoch.

**Empfehlung:** Drei Presets anbieten, etwa „Schnelle Runde“, „Klassisch“ und „Große Gruppe“. Nur die wichtigsten Optionen offen zeigen; den Rest unter „Erweitert“ zusammenfassen.

**Aufwand:** M.

#### M-05: Einige sichtbare Optionen sind im aktuellen Modus wirkungslos oder missverständlich

- „Öffentlich gelistet“ bedeutet nur „in diesem Browser gelistet“.
- Zuschauer können aktiviert werden, besitzen aber kein Verhalten.
- Passwortschutz ist lokal und liegt als Klartext im gemeinsamen Browserzustand.
- Englisch ändert Wörter und Kategorien, nicht die deutsche Oberfläche.

Die Hinweise sind teilweise ehrlich, dennoch können Nutzer Funktionen erwarten, die noch nicht existieren.

**Empfehlung:** Im lokalen Modus inaktive Produktionsoptionen deaktivieren oder klar mit „Noch nicht verfügbar“ markieren. UI-Lokalisierung separat von der Wortsprache benennen.

**Aufwand:** S–M.

#### M-06: Kein Rundenarchiv bei Doppelwort

Nach mehreren Runden sieht man den Gesamtstand, aber keine Historie der vergangenen Wortpaare, Gewinnerteams, Rollen oder Stimmen. Dadurch lassen sich Punkte und strittige Runden nicht nachvollziehen.

**Empfehlung:** Unveränderliche öffentliche Rundenergebnisse speichern und in einer einklappbaren Historie anzeigen.

**Aufwand:** M.

#### M-07: Kein Sound oder haptisches Feedback

Timerende, Sprecherwechsel, neue geheime Übergabe und Abstimmungsabschluss werden nur visuell vermittelt. Bei einem Partyspiel schauen nicht immer alle auf den Bildschirm.

**Empfehlung:** optionale, standardmäßig dezente Audio-/Vibrationssignale mit Mute-Schalter und Reduced-Motion-/Accessibility-Rücksicht.

**Aufwand:** S–M.

#### M-08: E2E-Tests sind nicht Teil des Projekts oder der CI

Die aktuellen Playwright-Abläufe bestehen, liegen aber nur als temporäre Prüfskripte außerhalb des Repositorys. `.github/workflows/ci.yml` führt ausschließlich Unit Tests und Build aus.

**Risiko:** Navigation, Hydration, Umschlag, mobile Layouts und kompletter Spielfluss können regressieren, ohne dass ein Pull Request fehlschlägt.

**Empfehlung:** Playwright-Konfiguration und die wichtigsten Flows committen; Desktop und Mobil in CI ausführen. Mindestens ein Kartenspielabschluss und eine Doppelwort-Runde sollten automatisiert bleiben.

**Aufwand:** M.

#### M-09: Keine automatisierte Datenbank-, RLS- oder API-Prüfung

Die Supabase-Migration ist umfangreich und durchdacht, wird aber weder gegen eine temporäre Datenbank ausgeführt noch durch RLS-Matrix-Tests geprüft. Die API ist ein Vertrag, keine laufende Implementierung.

**Empfehlung:** Supabase CLI in CI, Migration-Lint, Seed, RLS-Integrationstests und Edge-Function-Vertragstests ergänzen.

**Aufwand:** L.

#### M-10: Große Komponenten und Styles erschweren weitere Spiele

Aktuelle Größen:

- `DoppelwortRoomPage.jsx`: 554 Zeilen
- `DoppelwortLobbyPage.jsx`: 279 Zeilen
- `CardGamePage.jsx`: 436 Zeilen
- `doppelwort.css`: 2005 Zeilen
- `styles.css`: 1804 Zeilen

Die Trennung ist heute noch nachvollziehbar, aber Änderungen an neuen Phasen, Themes oder Spielen werden zunehmend riskant.

**Empfehlung:** Phasen, Ergebnisansichten und Formbereiche in fokussierte Komponenten aufteilen; Styles pro Surface oder Feature strukturieren.

**Aufwand:** M.

#### M-11: Die Spielregistrierung ist nur teilweise erweiterbar

`src/games/registry.js` macht das Hinzufügen einer Spielkarte einfach. `HomePage.jsx` unterscheidet gespeicherte Zustände aber hart zwischen Kartenspiel und Doppelwort. Jedes dritte Spiel benötigt neue Sonderlogik in der Startseite.

**Empfehlung:** Registry um optionale Adapter erweitern, zum Beispiel `getResumeState`, `resumePath`, `formatResumeTitle`, `formatResumeDetail` und Feature-Flags. Dann bleibt Home unabhängig von konkreten Spielen.

**Aufwand:** M.

#### M-12: Barrierefreiheit ist eine gute Basis, aber nicht vollständig geprüft

Positiv sind semantische Labels, Tastatur-Tabs, `aria-pressed`, sichtbarer Fokus, große Touch-Ziele und Reduced Motion. Offen bleiben:

- Fokus wird nach automatischen Phasenwechseln nicht gezielt auf die neue Überschrift gesetzt.
- Timer- und Sprecherwechsel werden nicht zuverlässig per Live-Region angekündigt.
- Ein vollständiger Screenreader-Test fehlt.
- Ein automatisierter WCAG-/Axe-Test fehlt.
- Bei englischen Wörtern bleibt das Dokument auf `lang="de"`.
- Lange Formulare besitzen keinen Skip-Link und nur begrenzte Gruppierung.

**Empfehlung:** NVDA/VoiceOver-Pass, Axe in CI, Fokusmanager pro Phase, höfliche Live-Regionen und sprachlich markierte englische Geheimwörter.

**Aufwand:** M.

### Niedrig – Politur und langfristige Qualität

#### L-01: Keine installierbare App/PWA

Es gibt kein Manifest, keinen Service Worker und keinen Offline-Installationspfad. Für einen Spieleabend wäre „Zum Home-Bildschirm hinzufügen“ und Offline-Funktion besonders passend.

#### L-02: Wenig Produktkontext auf der Startseite

„UGBZ“ wird nicht erklärt. Ein kurzer Untertitel, Hilfe/Über-die-Plattform und die Kennzeichnung „lokal spielbar“ würden neuen Nutzern Orientierung geben.

#### L-03: Keine dauerhafte Spielstandssicherung

Spielstände existieren nur im Browser. Gerätewechsel, Browserdaten-Löschung oder privater Modus verlieren sie. Export/Import als JSON wäre für das Kartenspiel eine günstige Absicherung.

#### L-04: Keine Lint-/Format-Stufe in CI

Der Build prüft Syntax und Bundling, aber kein ESLint/Oxlint, keine Formatkontrolle und keine statische Zustandsvalidierung. Das wird bei mehr Spielen relevanter.

#### L-05: Keine Produktbeobachtung

Es gibt bewusst kein Tracking. Für eine öffentliche Beta wären datensparsame technische Metriken zu Fehlerquote, Ladezeit und abgebrochenen Phasen hilfreich, sofern Datenschutz und Einwilligung sauber gelöst werden.

## Bewertung der Startseite

### Was gut ist

- Der erste Bildschirm beantwortet sofort „Was wird gespielt?“.
- Zwei große, klar unterscheidbare Spiele sind ohne Suche verständlich.
- Der komplette Kartenbereich ist visuell als Einheit lesbar.
- Aktive Spiele werden wieder aufnehmbar angezeigt.
- Die Registry ist ein guter erster Schritt für weitere Spiele.

### Was verbessert werden sollte

- Bei mehr als vier Spielen werden Suche, Kategorien, Status und kompaktere Karten nötig.
- Resume-Logik muss aus `HomePage` in Spieladapter wandern.
- Die Karte sollte klar unterscheiden zwischen „vollständiges Browser-Spiel“ und „Spielleiter für physische Karten“.
- Ein öffentliches/onlinefähiges Spiel sollte seinen Betriebsstatus zeigen.
- Später angekündigte Spiele sollten als deaktivierte Einträge mit klarer Kennzeichnung möglich sein.

## Bewertung des Kartenspiels

### Spielerperspektive

Für eine Gruppe, die das zugrunde liegende Stichspiel bereits kennt, ist der Ablauf sehr gut. Die Spielleitung sieht immer Runde, Kartenanzahl, Phase, Starter und Punkte. Direkte Eingaben sind schneller als nur Plus/Minus. Fehlerhafte Ergebnissummen werden verhindert. Der Verlauf macht die Wertung nachvollziehbar.

### Wichtigste Kritik

1. Es ist ein Spielleiter, nicht das eigentliche Spiel; dies sollte klarer benannt werden.
2. Nur die letzte Runde ist korrigierbar; ältere Fehler benötigen einen Neustart oder manuelle Datenänderung.
3. Spielstand bleibt an einen Browser gebunden.
4. Beschädigte Speicherstände werden zu schwach validiert.
5. Ein echter Pausen-/Sperrmodus fehlt, ist für einen Scorekeeper aber nicht kritisch.
6. Bei sieben Spielern und langen Namen wird die Informationsdichte hoch, auch wenn das Layout technisch stabil bleibt.

### Gesamturteil Kartenspiel

Als lokaler digitaler Spielleiter **klar gut**. Mit vollständiger Regelhilfe, Export/Import und stärkerer Recovery wäre es sehr nahe an einem kleinen produktionsreifen Einzelprodukt.

## Bewertung von Doppelwort

### Spielerperspektive

Die Dramaturgie ist die größte Stärke: Salon-Lobby, versiegelte Umschläge, klare Sprechreihenfolge, Beratung, geheime Stimmzettel und Auflösung erzeugen einen echten Spielbogen. Pass-and-Play ist verständlich und die Geheimnisse werden visuell besser geschützt als bei einer einfachen Textkarte.

### Wichtigste Kritik

1. Keine echte Verbindung zwischen Geräten.
2. Feste Crew-/Imposter-Richtung der Wortpaare ermöglicht Meta-Cheating.
3. Viele Optionen vor dem ersten Spiel überfordern Hosts.
4. Kein Undo bei Fehlstimmen.
5. Keine Rundengeschichte.
6. Keine Audio-/Haptiksignale.
7. Timer-Recovery ist bei langen Unterbrechungen falsch.
8. Kick/Offline-Verhalten während laufender Runden ist nicht abschließend definiert.
9. Lokale Geheimnisse und Passwörter sind technisch vollständig im Browser lesbar.
10. Die englische Option ist keine vollständige Lokalisierung.

### Gesamturteil Doppelwort

Als lokales Partyspiel **gut und vorzeigbar**, mit einer wichtigen Fairnesskorrektur bei der Wortrichtung. Als Online-Multiplayer ist es derzeit eine **Frontend-/Engine-Demo mit ausgearbeiteter Backend-Spezifikation**, kein fertiger Dienst.

## Architektur- und Codebewertung

### Positiv

- reine Engines ohne React-Abhängigkeit
- versionierte lokale Repositories
- optimistische Revisionen für Tab-Konflikte
- statischer Export aller Routen
- kleine auslieferbare Clientgröße von rund 1,1 MB inklusive Bilder
- nachvollziehbare Datenmodell- und API-Grenzen
- Least-Privilege-Idee für Supabase/RLS
- keine bekannten npm-Schwachstellen zum Prüfzeitpunkt
- CI nutzt reproduzierbares `npm ci`

### Kritisch

- Backend-Grenze ist dokumentiert, aber noch nicht implementiert
- Client- und Serverzustandsmodelle können auseinanderlaufen
- keine gemeinsamen Runtime-Schemas für Browser, API und Datenbank
- JavaScript reduziert Refactor-Sicherheit; dies ist eine bewusste Projektentscheidung, bleibt aber ein technischer Trade-off
- lokale Repository-Validierung ist zu oberflächlich
- kein Error-Telemetriepfad
- keine E2E- oder Datenbanktests in CI
- Monolithen in Room-/Game-Komponenten und Styles

## Sicherheitsbewertung

### Aktueller lokaler Modus

Für Freunde auf einem Gerät ist das Modell akzeptabel, solange klar bleibt, dass es keine Cheating-Sicherheit gibt. Alle Rollen, beide Wörter, Stimmen und lokale Passwörter liegen im Browserzustand. Jeder mit DevTools-Zugriff kann sie sehen oder verändern.

### Zielarchitektur

Die Dokumentation adressiert RLS, idempotente Aktionen, Revisionen, Passwort-Hashing, Rate Limits, Replay-Schutz, Reconnect und Admin-Audit sinnvoll. Das Schema trennt private Rundeninformationen von öffentlichen Events. Positiv ist insbesondere, dass normale Clients keine SELECT-Rechte auf `rounds.private_payload` erhalten sollen.

### Offene Produktionsrisiken

- keine ausgeführten RLS-Tests
- keine implementierten Edge Functions
- keine Secret-Leak-Tests
- keine CSP und weiteren Security Header
- keine Rate Limits
- keine MFA-Adminoberfläche
- keine Audit-/Moderationspraxis
- keine reale Schlüsselrotation oder Incident-Übung

## Test- und Qualitätsbewertung

### Heute gut abgedeckt

- Rundenfolgen, Punkte und Gleichstände
- Eingabegrenzen und Ergebnissummen
- letzte/finale Korrektur
- Wortanzahl und Kategorien
- Rollenanzahl und private Ansicht
- Phasenübergänge
- Mehrheit und mehrere Imposter
- Timerablauf im normalen Einzelschritt
- punktefreier Modus
- Hosttransfer
- lokale Revisionen und Tab-Sitzung
- vollständige Hauptabläufe per Playwright während dieses Reviews

### Heute nicht ausreichend abgedeckt

- feste oder zufällige Wortrichtung
- Kick/Leave/Offline in jeder laufenden Phase
- Catch-up nach langen Timerunterbrechungen
- beschädigte oder alte Speicherstände
- maximale 12-Personen-Partie im vollständigen UI-Fluss
- Browser Safari/Firefox
- Screenreader
- Zwischenbreiten, Landscape und Notch/Safe Area
- Datenbankmigration und RLS
- Online-Reconnect, Parallelstart und Doppelstimme gegen echten Server
- Last-, Flood-, Security- und Restoretests

## Anforderungsstatus in Kurzform

| Anforderung | Status | Kommentar |
|---|---|---|
| Landingpage/Homescreen | Erfüllt | visuell stark, zwei Spiele |
| weitere Spiele leicht ergänzen | Teilweise | Registry vorhanden, Resume-Logik noch hart gekoppelt |
| Kartenspiel solo und mit Spielleitung | Erfüllt | lokaler Scorekeeper |
| Räume vorbereitet | Erfüllt | lokales Modell und Produktionsschema |
| Räume geräteübergreifend nutzen | Fehlt | kein Online-Adapter |
| echter synchroner Multiplayer | Fehlt | keine laufende Realtime-Schicht |
| kostenlos betreibbar | Teilweise | lokal/Quick-Tunnel ja, dauerhafte öffentliche Plattform ungeklärt |
| Desktop, Tablet, Smartphone | Erfüllt | responsive Hauptabläufe bestanden |
| modernes App-Design | Erfüllt | hohe visuelle Qualität |
| deutsche und englische Wortpaare | Erfüllt | je 120 |
| vollständige englische Oberfläche | Fehlt | nur Wörter/Kategorien wechseln |
| Adminpanel | Fehlt | nur Schema und Handbuch |
| Moderation und Reports | Teilweise | Datenmodell/API-Vertrag, keine laufende Funktion |
| Reconnect/Heartbeat/Latenzausgleich | Teilweise | dokumentiert, nicht implementiert |
| Security Controls | Teilweise | gutes Konzept, nicht als laufender Dienst belegt |
| Unit Tests | Erfüllt | 22 bestanden |
| E2E in CI | Fehlt | temporäre Tests bestehen, sind nicht versioniert |
| dauerhafte öffentliche Website | Fehlt | Workspace blockiert anonymes Sites-Publishing |
| Impressum/Datenschutzfreigabe | Fehlt | Betreiberangaben ausstehend |

## Empfohlene Roadmap

### P0 – Spielintegrität und ehrlicher Betrieb

1. Wortrichtung pro Runde zufällig tauschen und testen.
2. Lokale Produktionsoptionen, die noch nichts tun, deaktivieren oder eindeutig markieren.
3. Beschädigte Speicherstände vollständig validieren und zurücksetzbar machen.
4. Dauerhafte öffentliche Hostingentscheidung treffen.
5. Rechtliche Betreiberangaben klären, bevor anonym veröffentlicht wird.

### P1 – Echter Online-Multiplayer

1. Supabase-Staging in EU-Region provisionieren.
2. Migration automatisch testen und deployen.
3. Gast-Session, Raumverzeichnis, Create/Join/Snapshot implementieren.
4. Serverautoritativ Rollen und Wörter verteilen.
5. Realtime-Adapter mit Reconnect und Revision-Lücken implementieren.
6. Timer-Catch-up, Kick, Offline und Hostwechsel verbindlich definieren.
7. Drei-Geräte-E2E inklusive Verbindungsabbruch durchführen.

### P2 – Produktionssicherheit

1. CSP, HSTS, Nosniff, Referrer- und Permissions-Policy setzen.
2. Rate Limits, Replay- und Parallelaktionstests.
3. RLS-Matrix und Secret-Leak-Suite.
4. Adminbereich mit MFA, Reports, Kick/Ban/Lock und Audit.
5. Monitoring, strukturierte Logs, Alarmierung, Cleanup und Restore-Test.

### P3 – UX und Barrierefreiheit

1. Doppelwort-Presets plus einklappbare erweiterte Optionen.
2. Vote-/Phasen-Korrektur mit sicheren Regeln.
3. Rundengeschichte.
4. vollständige Regelhilfe für das Kartenspiel.
5. optionale Sounds und Haptik.
6. VoiceOver/NVDA, Axe, Fokusmanagement und Live-Regionen.
7. vollständige UI-Lokalisierung oder klare Trennung „Wortsprache“.

### P4 – Plattform für weitere Spiele

1. Registry mit Resume-/Status-Adaptern.
2. Feature-basierte Komponenten- und Style-Struktur.
3. versionierte Save-Schemas mit Migrationen.
4. PWA/Offline-Installation prüfen.
5. Bei wachsendem Katalog Suche, Kategorien und Verfügbarkeitsstatus ergänzen.

## Produktions-Gates

UGBZ sollte erst als vollständiges Online-Produkt bezeichnet werden, wenn alle folgenden Punkte nachweisbar sind:

1. Ein anonymer dauerhafter Link antwortet unabhängig vom Entwickler-Mac zuverlässig mit HTTP 200.
2. Drei echte Geräte können denselben Raum erstellen, beitreten und vollständig spielen.
3. Kein Client kann Rollen oder Wörter anderer Personen aus Netzwerk, Cache oder Storage lesen.
4. Reconnect, Offline, Hostwechsel, Kick und Timer funktionieren in jeder Phase deterministisch.
5. RLS-, Replay-, Doppelstimmen-, Last- und Securitytests bestehen gegen Staging.
6. Playwright Desktop/Mobil läuft in CI.
7. CSP und weitere Security Header sind aktiv.
8. Monitoring, Alarmierung, Cleanup, Backup und Restore wurden real ausgeführt.
9. Admin- und Moderationsfunktionen sind geschützt und auditierbar.
10. Impressum, Datenschutz und Betreiberfreigabe sind abgeschlossen.

## Schlussfazit

Das Projekt ist **deutlich besser als ein typischer Prototyp**. Design, Hauptabläufe, lokale Speicherung und Kernlogik sind vorzeigbar. Das Kartenspiel kann heute sinnvoll bei einem Spieleabend eingesetzt werden. Doppelwort kann heute lokal viel Spaß machen und wirkt bereits wie ein echtes Spiel, nicht nur wie eine technische Demo.

Die wichtigste nächste Entscheidung ist nicht weiteres visuelles Polishing. Zuerst müssen die feste Wortrichtung korrigiert und anschließend echte Online-Infrastruktur sowie dauerhaftes Hosting umgesetzt werden. Danach sind Recovery, Korrekturflüsse, E2E-CI, Security und Barrierefreiheit die Bereiche mit dem größten Qualitätsgewinn.
