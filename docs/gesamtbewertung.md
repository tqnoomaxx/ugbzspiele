# UGBZ – aktuelle Gesamtbewertung, Reviews und Kritik

Stand: 19. Juli 2026

Geprüfter Stand: aktueller Arbeitsstand nach der Verbesserungsrunde

Live: <https://tqnoomaxx.github.io/ugbzspiele/>

## Kurzurteil

UGBZ ist inzwischen ein **sehr guter digitaler Begleiter für einen Spieleabend**. Die drei Spiele sehen eigenständig aus, funktionieren auf Smartphones und Desktop und überleben die normalen Hauptabläufe. Navigation, Save-Recovery, Starter, Kniffel-Backups und die wichtigsten Browserabläufe wurden nach diesem Review direkt verbessert.

Der Online-Modus funktioniert technisch und synchronisiert Räume. Er ist jedoch als **Freunde-Beta** zu verstehen: Mitglieder erhalten den vollständigen Raumzustand und können über die gemeinsame Update-Funktion theoretisch beliebige Zustände einreichen. Bei Imposter liegen dadurch auch Rollen und Wörter im geladenen Raumzustand. Reconnect, Host-Wiederherstellung, echte Anwesenheit, Moderation und automatische Datenbereinigung fehlen ebenfalls.

| Zielbild | Bewertung | Urteil |
|---|---:|---|
| Gemeinsamer Spieleabend auf einem Gerät | **9,0/10** | stabil, wiederherstellbar und vorzeigbar |
| Online mit vertrauenswürdigen Freunden | **7,7/10** | gute Beta mit dauerhafter Sitzungs-Recovery und zusätzlichen Guardrails |
| Öffentliche Räume mit unbekannten Personen | **5,8/10** | klar als Freunde-Beta markiert; private Spielzustände bleiben der Hauptblocker |
| Gesamtprodukt im aktuellen Umfang | **8,1/10** | starke, getestete Spieleplattform mit klar begrenzter Online-Beta |

## Umgesetzte Verbesserungen

- Kartenspiel-Ende respektiert den GitHub-Pages-Unterpfad; der bestätigte Live-404 ist behoben.
- Der macOS-Starter erkennt einen veralteten UGBZ-Prozess, baut den aktuellen Stand und weicht auf einen freien Port aus.
- Kartenspiel-Saves werden vollständig strukturell geprüft; beschädigte Daten lassen sich herunterladen oder gezielt entfernen.
- Imposter besitzt drei Presets, einen eingeklappten Regelbereich und keine sichtbare Zuschaueroption ohne Funktion.
- Alte `/doppelwort`-Links leiten inklusive Einladungscode auf `/imposter` weiter.
- Lokale und Online-Kniffel-Sitzungen sind nach einem geschlossenen Tab wiederauffindbar.
- Kniffel-Sicherungen sind versioniert, validiert und wieder importierbar; Gäste können keine Host-Sicherung erzeugen.
- Lokale Kniffeltische zeigen keinen nutzlosen Raumcode mehr und unterscheiden lokale, Cloud- und Offline-Sicherung.
- Kniffel hat vollständige ARIA-Tabs, „Neue Partie“, „Tisch verlassen“ und „Tisch schließen“.
- Öffentliche Imposter- und Kniffel-Räume sind sichtbar als „Freunde-Beta“ gekennzeichnet.
- Die neue Datenbankmigration `006_room_state_guardrails.sql` schützt unveränderliche Raumfelder und Spieleridentitäten, begrenzt sehr schnelle Mutationen und stellt eine Cleanup-Funktion bereit.
- Home-Bilder werden priorisiert beziehungsweise lazy geladen; technische Produkttexte sind klarer.
- Fünf Playwright-Flows laufen in CI: Produktrouten/Legacy-Link, komplettes Kartenspiel, Kniffel inklusive Export/Import, Imposter-Raumerstellung und mobile Overflow-Prüfung.

## Bewertungsgrundlage

- Sichtprüfung der Startseite und aller drei Spiele auf Desktop und Mobil
- Kartenspiel vom Setup bis zum Endergebnis inklusive Korrektur und Reload
- Imposter von Lobby über Umschläge, Hinweise und Abstimmung bis zur Gesamtwertung
- Imposter-Synchronisierung zwischen zwei Tabs im lokalen Fallback
- Kniffel digital und mit echtem Würfel/Punkteblock inklusive Halten, Werten, Undo und Reload
- Reduced-Motion-, Fokus-, Touchziel- und Overflow-Prüfung
- Read-only-Prüfung aller veröffentlichten GitHub-Pages-Routen
- Review der Engines, Repositories, React-Oberflächen, Styles, Supabase-RPCs, RLS, Migrationen, CI und Dokumentation
- Unit Tests, Produktionsbuild und Dependency-Audit

Das Browser-Plugin war nicht installiert. Die gerenderte Prüfung erfolgte deshalb mit Playwright und Google Chrome.

## Technische Ergebnisse

| Prüfung | Ergebnis |
|---|---|
| Unit Tests | **41/41 bestanden** |
| Unit-Testdateien | **7/7 bestanden** |
| Playwright-Browserflows | **5/5 bestanden** |
| Produktionsbuild | **bestanden** |
| Statisch erzeugte Produkt-Routen | **9** plus Fehlerseite |
| `npm audit` | **0 bekannte Schwachstellen** |
| Normaler Browserablauf | keine relevanten Console- oder Frameworkfehler |
| Mobile Breite 390 × 844 | kein horizontaler Overflow |
| Touchziele auf der mobilen Startseite | mindestens 44 × 44 px |
| Live-Startseite, Imposter und Kniffel | HTTP 200, aktueller Stand sichtbar |
| Online-Konfiguration im Live-Build | aktiv |

Nicht erneut mutativ gegen die Produktionsdatenbank getestet wurden künstliche Verbindungsabbrüche, sehr große Räume, Host-Verlust und konkurrierende Manipulationsversuche. Der zuletzt ausgeführte Zwei-Geräte-Test für Kniffel auf demselben Commit bestätigte Join, serverseitige Würfe, Zugwechsel und Realtime-Animationen.

## Teilbewertungen

| Bereich | Note | Einordnung |
|---|---:|---|
| Markenwirkung und visuelles Design | **8,8/10** | hochwertig, eigenständig und klar thematisiert |
| Startseite und Spielauswahl | **7,9/10** | verständlich, aber bild- und scrolllastig |
| Kartenspiel | **7,7/10** | sehr guter Punkteblock, als Spielbezeichnung zu unklar |
| Imposter lokal | **8,2/10** | vollständiger und dramaturgisch guter Gruppenablauf |
| Imposter online | **6,6/10** | synchron, aber Geheimnisse und Aktionen nicht serverautoritativ |
| Kniffel lokal | **8,9/10** | derzeit das rundeste und angenehmste Spiel |
| Kniffel online | **7,4/10** | gute Realtime-Basis, aber Recovery und Berechtigungen fehlen |
| Responsive Bedienung | **8,6/10** | stabil auf Desktop und Mobil |
| Barrierearmut | **7,1/10** | gute Basis, einzelne ARIA- und Screenreader-Lücken |
| Code und Erweiterbarkeit | **7,2/10** | gute Engines, aber große Screens, CSS-Monolithen und Zustandsduplikation |
| Automatisierte Qualitätssicherung | **8,4/10** | Unit-, Build- und reale Browserflows laufen in CI; Lint und automatisches A11y-Audit fehlen noch |
| Online-Integrität und Sicherheit | **5,8/10** | zusätzliche Guardrails vorhanden; private Imposter-Daten sind noch nicht serverseitig projiziert |
| Dokumentationsstand | **7,4/10** | zentrale Review- und Online-Dokumente sind aktuell; ältere Imposter-Unterlagen brauchen noch Pflege |

## Spielerreviews

### Review 1: Neuling

**8,0/10**

Die Startseite wirkt sofort wie eine Spieleplattform und nicht wie ein Technikprojekt. Die Primäraktionen sind klar. Kniffel versteht man unmittelbar. Imposter führt gut durch Lobby, Geheimnis und Abstimmung. Beim Kartenspiel bleibt zunächst offen, welches physische Stichspiel gemeint ist und welche vollständigen Regeln gelten.

Größte Hürde: Imposter zeigt beim Erstellen sehr viele Entscheidungen gleichzeitig. Ohne Erfahrung ist nicht klar, welche davon wichtig sind.

### Review 2: Spielleitung am gemeinsamen Tisch

**8,7/10**

Speichern, Fortsetzen, Undo, klare aktive Person und große mobile Aktionen sind stark. Das Kartenspiel funktioniert als Spielleiter zuverlässig. Kniffel mit einem gemeinsamen Handy ist besonders gelungen. Imposter erlaubt lokale Gäste und funktioniert vollständig als Pass-and-Play.

Störend sind technische Formulierungen wie „für den Test“, lokale Raumcodes ohne praktischen Nutzen bei Kniffel und ein Export, der nicht wieder importiert werden kann.

### Review 3: Online-Gast

**6,8/10**

Codebeitritt, Realtime-Zugwechsel und getrennte Geräte sind verständlich. Der Gast sieht, wann er an der Reihe ist. Bei einem geschlossenen Tab oder verlorenem Session-Speicher fehlt aber ein sauberer Wiedereinstieg in den vorhandenen Platz. Der alte Name kann weiterhin als belegt gelten. Eine echte Verbindungs- oder Anwesenheitsanzeige existiert nicht.

### Review 4: Wiederkehrende und ehrgeizige Gruppe

**6,5/10**

Die Kernregeln tragen mehrere Abende. Imposter profitiert von 160 deutschen und 160 englischen Paaren und der zufälligen Umkehrung der Wortrollen. Die Paarqualität schwankt allerdings stark: Manche Begriffe sind sehr ähnlich, manche nur grob derselben Kategorie zuzuordnen. Dadurch variiert die Schwierigkeit unkontrolliert.

Für Wettbewerb fehlen serverautoritativ geprüfte Aktionen, Manipulationsschutz, Rundenarchive, Reconnect und eine verlässliche Historie der Online-Aktionen.

### Review 5: Technische Betreuung

**6,9/10**

Der statische Build und GitHub Pages sind angenehm einfach, die Spiellogik ist überwiegend von React getrennt und die Abhängigkeiten sind klein. Problematisch sind der Beta-Unterbau mit Vinext, fehlende E2E-Tests in CI, doppelte Builds und ein universeller Raum-RPC, der jedem Mitglied den gesamten Zustand anvertraut.

## Größte Stärken

### 1. Starke visuelle Identität

Grüner Kartentisch, nächtlicher Imposter-Salon und burgunderfarbener Kniffel-Tisch sind klar unterscheidbar und wirken trotzdem wie eine Plattform. Typografie, Messingakzente, Papierflächen und Bilder funktionieren auf Desktop und Mobil.

### 2. Gute mobile Grundbedienung

Die Hauptaktionen sind groß, es gibt keine horizontalen Überläufe, wichtige Spielaktionen bleiben gut erreichbar und Reduced Motion wird berücksichtigt. Der Kartenspiel-Bestätigungsbutton ist mobil sinnvoll fixiert.

### 3. Kniffel ist bereits sehr rund

Digitale Würfel, Halten, klassische Kategorien, Bonus/Joker, echter Punkteblock, Solo, gemeinsame Geräte, Onlinegeräte, Autosave, Undo, Ranking und Animationen ergeben einen vollständigen Ablauf.

### 4. Imposter besitzt einen echten Spannungsbogen

Umschläge, geheime Rollen, Sprechreihenfolge, Meeting, gleichzeitige Online-Abstimmung und Auflösung fühlen sich nach einem Spiel an und nicht nach einer Formularabfolge.

### 5. Kernlogik ist testbar getrennt

Die Engines unter `src/games/` sind weitgehend deterministisch und ohne DOM-Abhängigkeit. Das erleichtert Unit Tests und eine spätere serverautoritativ ausgeführte Spiellogik.

## Kritische und hohe Ausgangsfindings

### B-01: „Zur Startseite“ endet nach dem Kartenspiel live auf einer 404-Seite

**Status: behoben.** Die Navigation nutzt jetzt durchgängig `appPath('/')` und ist Teil des kompletten Playwright-Kartenspielflows.

**Reproduktion:** Kartenspiel auf GitHub Pages abschließen und im Endergebnis „Zur Startseite“ wählen.

**Ergebnis:** Navigation von `/ugbzspiele/kartenspiel/spielen` zu `https://tqnoomaxx.github.io/`, dort 404.

**Ursache:** `CardGamePage.jsx` verwendet an dieser Stelle `window.location.assign('/')` statt `appPath('/')`.

**Priorität:** sofort beheben.

### B-02: Online-Raumzustand ist nicht gegen Mitspieler abgesichert

**Status: teilweise verbessert, nicht abgeschlossen.** Migration 006 sperrt Raumidentität, Host, Optionen und Spieleridentitäten gegen generische Mutationen und begrenzt sehr schnelle Schreibfolgen. Rollen, Wörter und regelentscheidende Aktionen müssen für unbekannte Mitspieler weiterhin in private Tabellen und spielbezogene Command-RPCs verschoben werden.

`platform_rooms.state` enthält den vollständigen Spielzustand. Jedes Raum-Mitglied darf diesen Zustand lesen und über `platform_update_room` als vollständiges JSON ersetzen. Der RPC prüft Mitgliedschaft und Revision, aber nicht:

- welche Person die konkrete Aktion ausführt,
- ob nur erlaubte Felder geändert wurden,
- ob Punkte, Rollen, Host oder Phase regelkonform sind,
- ob bei Imposter fremde Geheimnisse verborgen bleiben.

Bei Imposter befinden sich `assignments`, `crewWord`, `imposterWord` und `imposterIds` im gemeinsamen Zustand. Die React-Oberfläche erzeugt zwar eine private Sicht, ein technisch versierter Spieler kann den geladenen Zustand trotzdem untersuchen.

**Folge:** Für Freunde akzeptabel, für öffentliche oder wettbewerbliche Räume ein Release-Blocker.

**Empfehlung:** Command-RPCs pro Spiel verwenden. Der Server lädt den Zustand, prüft Auth-User und Player-ID, führt die Engine-Aktion serverseitig aus und gibt nur eine private beziehungsweise öffentliche Projektion zurück.

### B-03: Reconnect und Host-Wiederherstellung fehlen

**Status: teilweise behoben.** Online-Identitäten und lokale Kniffel-Tische werden zusätzlich dauerhaft im Browser gesichert. Ein echter Rejoin-Token für ein anderes Gerät, Heartbeat und Host-Timeout fehlen weiterhin.

Die Spielerzuordnung liegt in `sessionStorage`. Nach dem Schließen eines Tabs kann der Raum in Cloud oder `localStorage` weiter existieren, die lokale Spieleridentität aber fehlen. Derselbe Name ist anschließend bereits belegt; eine sichere Rückübernahme des Platzes gibt es nicht.

Zusätzlich werden `connected` und `last_seen_at` nicht zuverlässig gepflegt. Anzeigen wie „Verbunden“ können daher falsch sein. Ein verlorener Host kann den Raum dauerhaft blockieren.

**Empfehlung:** Rejoin-Token, Mitgliedschafts-Recovery anhand der anonymen Auth-ID, Heartbeat, Host-Timeout und klaren Offlinezustand implementieren.

### H-01: Der lokale Starter kann einen veralteten Server öffnen

**Status: behoben.** Der Starter prüft jetzt mehrere aktuelle Routen und verwendet bei einem fremden oder alten Prozess einen freien Port.

`UGBZ-starten.command` prüft nur, ob Port 3000 irgendeine erfolgreiche Startseite liefert. Läuft dort ein alter UGBZ-Prozess, wird er geöffnet und der neue Build nicht gestartet. Bei der Prüfung lief dadurch ein alter Stand ohne Kniffel; direkte neue Routen lieferten 404.

**Empfehlung:** Prozessdatei oder Build-ID prüfen, alten eigenen Prozess kontrolliert beenden oder einen freien Port verwenden und die tatsächlich gestartete URL öffnen.

### H-02: Die bisherige Dokumentation war nicht mehr aktuell

**Status: zentral behoben.** Diese Gesamtbewertung und `docs/online-modus.md` bilden den neuen Stand ab. Die älteren Detaildokumente unter `docs/doppelwort/` bleiben als nächste Dokumentationsrunde offen.

Die alte Gesamtbewertung nannte 22 Tests, fünf Routen und keinen echten Online-Modus. In mehreren `docs/doppelwort/`-Dateien steht weiterhin „Doppelwort“, obwohl die UI „Imposter“ heißt. Einige Checklisten beschreiben den Online-Adapter noch als fehlend.

**Empfehlung:** Dokumentation pro Release aktualisieren, veraltete Architekturentwürfe klar als historisch markieren und Benutzertexte auf Imposter umstellen.

### H-03: Keine echte Browser-Teststrecke in Repository oder CI

**Status: behoben.** Playwright liegt unter `e2e/`, prüft fünf reale Abläufe und läuft sowohl bei Pull Requests als auch vor dem Pages-Deployment.

Die aktuellen Playwright-Prüfungen liegen nur als temporäre Review-Skripte vor. CI führt Unit Tests und Build aus, aber keinen echten Browserablauf. Navigation, Base Path, Realtime, mobile Überläufe und der bestätigte 404-Fehler bleiben dadurch unentdeckt.

**Empfehlung:** Mindestens folgende E2E-Flows committen:

1. Home → Kartenspiel → Ende → Home.
2. Imposter-Lobby → Pass-and-Play-Runde → Ergebnis.
3. Kniffel → Würfeln → Halten → Werten → Reload.
4. Ein Live-/Staging-Zwei-Geräte-Smoke-Test für Realtime.

### H-04: Kniffel-Backup ist nur ein Export

**Status: behoben.** Export und Import verwenden ein versioniertes Format mit struktureller Prüfung; ein manipulierter oder unvollständiger Stand wird abgelehnt.

„Sicherung exportieren“ erzeugt JSON, aber es gibt keinen Import. Das vermittelt mehr Wiederherstellbarkeit, als die Oberfläche tatsächlich bietet.

**Empfehlung:** Import mit Schema-Prüfung und Konfliktentscheidung ergänzen oder die Aktion bis dahin als „Diagnosedaten herunterladen“ benennen.

### H-05: Öffentliche Räume benötigen Betrieb und Moderation

**Status: teilweise verbessert.** Eine nur für den Service-Role aufrufbare Cleanup-Funktion und Mutationsdrosselung sind vorbereitet. Reports, Moderation, belastbare Presence, Aufbewahrungsentscheidung und Rechtstexte bleiben offen.

Es fehlen automatische Löschung alter Räume, Rate Limits, Reports, Sperren, Adminoberfläche, belastbare Presence und dokumentierte Aufbewahrungsfristen. Rechtstexte und die Marken-/Lizenzfrage für öffentlich angebotenes „Kniffel“ müssen vor einem größeren öffentlichen Start geprüft werden.

## Mittlere Findings

### M-01: Beschädigte Kartenspiel-Saves besitzen keinen Recovery-Weg

**Status: behoben.** Ungültige Saves werden nicht gestartet, sondern sichtbar quarantänisiert und können als Rohdaten exportiert oder einzeln entfernt werden.

Die Schema-Prüfung kontrolliert nur wenige Top-Level-Felder. Ein formal passender, aber unvollständiger Save öffnet die generische Seite „This page couldn’t load“. Reload wiederholt den Fehler; ein sichtbarer Reset oder Quarantäne-Export fehlt.

### M-02: Imposter-Setup ist zu voll

**Status: behoben.** Presets decken den schnellen Einstieg ab; Timer und Spezialregeln liegen unter „Erweiterte Regeln“.

Spielerlimit, Sprache, Kategorie, Imposterzahl, Runden, drei Timer und acht Schalter erscheinen gleichzeitig. Für erfahrene Hosts ist das mächtig, für neue Gruppen unnötige Entscheidungslast.

**Empfehlung:** Presets „Schnell“, „Klassisch“ und „Große Runde“ plus einklappbares „Erweitert“.

### M-03: Die Qualität der Imposter-Wortpaare schwankt

Beispiele reichen von sehr nah (`Katze/Tiger`) bis nur thematisch oder gegensätzlich (`Ozean/Wüste`). Meme-Begriffe setzen außerdem stark unterschiedliches Vorwissen voraus.

**Empfehlung:** Schwierigkeit pro Paar pflegen, Paarbewertungen sammeln und Kategorien nicht nur nach Thema, sondern auch nach Bekanntheit filtern.

### M-04: Kniffel zeigt im lokalen gemeinsamen Modus unnötige Raumtechnik

**Status: behoben.** Ein gemeinsames Gerät zeigt nur noch die passende Gerätekennzeichnung; Code und Link erscheinen nur bei getrennten Geräten.

Raumcode und Einladungslink werden auch am gemeinsamen lokalen Tisch gezeigt, obwohl Online-Beitreten in diesem Build deaktiviert ist. Das ist verwirrend und nimmt auf Mobil Platz ein.

### M-05: Kniffel bietet keinen klaren Raumabschluss

**Status: behoben.** Lobby und Ergebnis besitzen eindeutige Verlassen-/Schließen-Aktionen; nach dem Ergebnis kann dieselbe Gruppe sofort eine neue Partie starten.

Im Spiel gibt es Home und Undo, aber keinen sichtbaren „Raum verlassen“, „Tisch schließen“ oder „Neue Partie“-Ablauf. Abgeschlossene und verlassene Räume können dadurch in der Datenbank bestehen bleiben.

### M-06: Kniffel-Tabs sind semantisch unvollständig

**Status: behoben.** Tabs besitzen Rollen, Zustände, Panel-Zuordnung, Roving-Tabindex sowie Pfeil-, Home- und End-Tastatursteuerung.

Der Container hat `role="tablist"`, die beiden Buttons besitzen aber kein `role="tab"`, `aria-selected`, `aria-controls` oder roving `tabIndex`. Imposter löst dasselbe Muster bereits korrekt.

### M-07: Das Kartenspiel bleibt zu generisch erklärt

**Status: teilweise verbessert.** Die Startseite bezeichnet es nun ausdrücklich als digitalen Punkteblock für ein physisches Stichspiel. Eine vollständig benannte Regelvariante bleibt eine Produktentscheidung.

„Kartenspiel“ sagt nicht, dass UGBZ nur Ansagen, Stiche und Punkte für ein physisches Spiel verwaltet. Regeln zu Geben, Ausspielen, Trumpf oder Kartenrang fehlen bewusst, werden aber von Neulingen erwartet.

**Empfehlung:** Auf Home „Stichspiel-Punkteblock“ ergänzen und eine vollständige Regelvariante benennen oder verlinken.

### M-08: Die Startseite lädt mehr als nötig

**Status: behoben.** Nur das erste Hero-Bild wird priorisiert; weitere Spielbilder laden lazy und werden asynchron dekodiert.

Alle drei großen Bilder werden ohne `loading="lazy"` eingebunden. Die Karten sind visuell stark, aber für eine reine Auswahl sehr hoch; mobil sind rund 1.850 Pixel Scrollweg nötig.

### M-09: „Unbegrenzte“ Kniffel-Räume sind technisch wirklich nahezu unbegrenzt

`maxPlayers` wird als 2.147.483.647 gespeichert. Das erfüllt die gewünschte Oberfläche ohne sichtbares Limit, ist aber für JSON-Raumzustand, Punkteblöcke und 13 Runden pro Person nicht belastbar.

**Empfehlung:** Kein kleines sichtbares Spielerlimit erzwingen, aber einen hohen technischen Schutzwert setzen und UI ab großen Gruppen virtualisieren oder warnen.

### M-10: Große Dateien bremsen Änderungen

- `DoppelwortRoomPage.jsx`: 597 Zeilen
- `CardGamePage.jsx`: 437 Zeilen
- `doppelwort.css`: 2.005 Zeilen
- `styles.css`: 1.841 Zeilen
- `kniffel.css`: 768 Zeilen

Das funktioniert, erhöht aber die Gefahr von Seiteneffekten. Phasen, Scoreboards und Lobbybereiche sollten schrittweise in eigenständige Komponenten und Styles zerlegt werden.

## Was überflüssig oder derzeit zu früh ist

| Element | Urteil | Empfehlung |
|---|---|---|
| Sichtbarer Zuschauer-Schalter bei Imposter | ohne Verhalten überflüssig | **umgesetzt:** ausgeblendet |
| Alle acht Imposter-Schalter im Standardformular | zu viel auf einmal | **umgesetzt:** unter „Erweiterte Regeln“ |
| Raumcode beim rein lokalen Kniffel-Tisch | ohne Beitrittsweg nutzlos | **umgesetzt:** nur bei getrennten Geräten |
| Backup-Export ohne Import | halbfertig | **umgesetzt:** validierter Import ergänzt |
| `/doppelwort` und `/doppelwort/raum` als vollständige Doppelrouten | doppelte öffentliche Oberfläche | **umgesetzt:** Kompatibilitätsweiterleitung |
| Status „Verbunden“ ohne Heartbeat | Scheingenauigkeit | **umgesetzt:** neutral formuliert; echte Presence bleibt offen |
| Zwei vollständige Test-/Build-Jobs bei jedem Push auf `main` | CI-Arbeit doppelt | **umgesetzt:** Quality nur für Pull Requests, Pages für `main` |
| Weitere Kniffel-Animationen | aktuell kein Engpass | erst Zuverlässigkeit und Recovery verbessern |
| Mehr Imposter-Kategorien | aktuell weniger wichtig als Paarqualität | vorhandene Paare bewerten und staffeln |
| Chat, Accounts oder Profilbilder | für den Kernablauf nicht nötig | erst nach sicherer Command-Schicht und Reconnect |
| Komplettes Umbenennen aller internen `doppelwort`-Dateien | geringer Nutzwert, hohes Änderungsrauschen | intern vorerst behalten; nur öffentliche Texte und Docs korrigieren |

Die Concept-Bilder unter `design/` und `docs/design/` werden nicht zur Laufzeit geladen. Sie sind keine Performance-Belastung der Website und können als Designquellen im Repository bleiben.

## Empfohlene Reihenfolge

### Nächster Release – Online-Verlässlichkeit

1. Migration 006 im verknüpften Supabase-Projekt ausrollen und die Cleanup-Funktion regelmäßig ausführen lassen.
2. Spielaktionen als serverautoritativ geprüfte Commands umsetzen.
3. Imposter-Geheimnisse in private Datenhaltung und empfängerbezogene Projektionen verschieben.
4. Rejoin-Token, Host-Wiederherstellung und echte Presence mit Heartbeat ergänzen.
5. Moderation, Reports und verbindliche Aufbewahrungsregeln für öffentliche Räume definieren.

### Danach – Qualität und Inhalt

1. Imposter-Wortpaare nach Schwierigkeit und Bekanntheit bewerten.
2. Automatisches A11y-Audit und statische Codeprüfung in CI ergänzen.
3. Große Screens und CSS-Dateien schrittweise zerlegen.
4. Alte Detaildokumente unter `docs/doppelwort/` aktualisieren beziehungsweise als historisch markieren.
5. Für sehr große Kniffelgruppen einen technischen Schutz ohne kleines sichtbares Spielerlimit definieren.

## Schlussfazit

UGBZ braucht im Moment **keine weiteren großen Spiele oder Effekte**, um besser zu werden. Navigation, Recovery und dauerhafte Browsertests sind jetzt deutlich stärker. Der größte verbleibende Qualitätssprung ist eine serverautoritative Online-Aktionsschicht mit wirklich privaten Imposter-Geheimnissen.

Lokal kann die Plattform bereits ohne große Einschränkung eingesetzt werden. Online ist sie für eine vertrauenswürdige Freundesgruppe gut genug für eine Beta. Für offene öffentliche Räume sollte die gemeinsame Raumtransport-Schicht zuerst von einem Synchronisationskanal zu einer echten autoritativen Spielschicht weiterentwickelt werden.
