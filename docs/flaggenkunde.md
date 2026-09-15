# Flaggenkunde – Daten und Spielmodi

Die Flaggenkunde ist unter `/flaggen` erreichbar und funktioniert vollständig ohne externe Bild- oder Daten-API.

## Umfang

- 254 Länder, Gebiete und ausgewählte internationale Flaggen
- alle 50 US-Bundesstaaten plus Washington, D.C.
- alle deutschen und österreichischen Bundesländer
- alle niederländischen Provinzen und Schweizer Kantone
- regionale Sammlungen für Kanada, Australien, Brasilien, Argentinien, Japan, Mexiko, Spanien, Italien, Polen, Belgien, Tschechien, Kroatien, die Slowakei, Schweden, Kolumbien, Chile, Malaysia und das Vereinigte Königreich
- insgesamt 720 unterschiedliche Flaggen

Die Welt-Sammlung lässt sich zusätzlich nach Europa, Afrika, Asien, Nordamerika und Karibik, Südamerika sowie Ozeanien filtern. Der Modus „Alle Flaggen“ enthält die vollständige Sammlung; „Überraschungsmix“ zieht zufällige Motive daraus.

## Lernen und Speichern

Quizrunden umfassen 10, 20, 50 oder alle Flaggen der ausgewählten Sammlung. Vier Fragetypen stehen zur Wahl:

- **Flagge → Name:** einen von vier Namen auswählen.
- **Name eingeben:** den Namen oder Regionscode eintippen; Großschreibung, Akzente und deutsche Umlautumschreibungen werden toleriert. Bestätigung mit Enter.
- **Name → Flagge:** aus vier Motiven das richtige auswählen. Vor der Auflösung verraten Bildbeschriftungen die Antwort nicht.
- **Flagge → Karte:** in regionalen Sammlungen das Gebiet auf seiner tatsächlichen Umrisskarte anklicken. Alle 466 Regionalflaggen sind zugeordnet. Ein falscher Klick bleibt sichtbar; die Frage wird erst nach einem richtigen Treffer abgeschlossen.

Im standardmäßig aktiven Fehlertraining wird eine falsch beantwortete Flagge bei den ersten drei Fragetypen mit Abstand erneut eingereiht – bei Bedarf so oft, bis sie richtig erkannt wird. Bei Regionalflaggen zeigt das Antwortfeedback zusätzlich eine lokale Umrisskarte mit der markierten Lage im jeweiligen Land. Richtige Serien erhöhen die Punktzahl. Gesehene, richtige und gemeisterte Flaggen werden ausschließlich im Browser unter `ugbz:flaggenkunde:progress:v1` gespeichert. Eine Flagge gilt nach mindestens drei richtigen Antworten und einer Trefferquote von mindestens 75 Prozent als gemeistert. Die laufende Runde liegt unter `ugbz:flaggenkunde:quiz:v3` im Session-Speicher und übersteht ein Neuladen desselben Tabs.

## Europa-Hypermodus

Die zusätzliche Sammlung fragt **883 Gebiete** in zufälliger Reihenfolge auf einer gemeinsamen Europakarte ab. Jedes Gebiet erscheint einmal; falsche Klicks zählen als Fehler, überspringen das Ziel aber nicht. Richtige Gebiete werden grün markiert, nach einem kurzen Feedback folgt automatisch das nächste Ziel. Erst nach allen Treffern erscheint das Ergebnis. Zusätzliche Kartengebiete ohne verifizierte Flagge sind ausschließlich in diesem Modus verfügbar und werden nicht als weitere Flaggen gezählt.

Die Karte lässt sich mit Maus oder Touch ziehen und über +/− zoomen. „Ausschnitt“ fokussiert ein Land, damit auch kleine Gebiete erreichbar bleiben; ↺ zeigt wieder ganz Europa. Tastaturfokus und Enter/Leertaste funktionieren ebenfalls auf Kartenflächen.

**Datenumfang:** Die Verwaltungsebenen und Grenzstände unterscheiden sich je Quelldatensatz. Beispielsweise zeigt Slowenien zwei Makroregionen, während Malta Gemeinden enthält. Die Karte ist keine tagesaktuelle amtliche Vollerfassung aller Provinzen. Der Ausschnitt reicht von 32°W bis 60°E und von 27°N bis 72°N, schließt Türkei und Zypern ein und lässt ferne Überseegebiete außerhalb dieses Ausschnitts sowie den Osten Russlands weg. Strittige Grenzen folgen dem jeweiligen Datensatz und stellen keine politische Bewertung dar. Konkrete Quellen, Bezugsjahre und Lizenzen sind in `public/assets/flags/interactive/SOURCES.json` dokumentiert.

Unter `/flaggen/lernen` steht außerdem ein durchsuchbarer Atlas bereit. Er lädt die lokalen Bilder verzögert und zeigt den persönlichen Lernstatus an.

## Lokale Assets und Lizenzen

Der Flaggenkatalog und das Kartenmanifest liegen in `src/games/flaggenkunde/`, Bilder und Locator-Karten in `public/assets/flags/`. Interaktive Geometrien werden pro Land beziehungsweise einmal für Europa aus lokalen JSON-Dateien unter `public/assets/flags/interactive/` nachgeladen; sie vergrößern nicht das initiale JavaScript-Bundle. Bei einem Ladefehler steht eine Wiederholen-Schaltfläche bereit. Herkunft und Lizenzhinweise sind in `public/assets/flags/ATTRIBUTION.md` sowie den dort abgelegten Lizenztexten dokumentiert.

Mit `scripts/import-flag-game-assets.mjs` lässt sich der Datenbestand aus den dokumentierten Quellbeständen reproduzierbar neu erzeugen. Das Script erwartet die Umgebungsvariablen `FLAG_COUNTRY_SOURCE` und `FLAG_SUBDIVISION_SOURCE`; der Produktionsbuild selbst benötigt diese Quellen nicht. `scripts/generate-flag-locator-maps.mjs` erzeugt die lokalen Karten aus geoBoundaries und Natural Earth.
