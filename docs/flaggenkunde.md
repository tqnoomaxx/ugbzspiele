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

Quizrunden umfassen 10, 20, 50 oder alle Flaggen der ausgewählten Sammlung. Jede Frage hat vier Antwortmöglichkeiten. Im standardmäßig aktiven Fehlertraining wird eine falsch beantwortete Flagge mit Abstand erneut eingereiht – bei Bedarf so oft, bis sie richtig erkannt wird. Bei Regionalflaggen zeigt das Antwortfeedback zusätzlich eine lokale Umrisskarte mit der markierten Lage im jeweiligen Land. Richtige Serien erhöhen die Punktzahl. Gesehene, richtige und gemeisterte Flaggen werden ausschließlich im Browser unter `ugbz:flaggenkunde:progress:v1` gespeichert. Eine Flagge gilt nach mindestens drei richtigen Antworten und einer Trefferquote von mindestens 75 Prozent als gemeistert.

Unter `/flaggen/lernen` steht außerdem ein durchsuchbarer Atlas bereit. Er lädt die lokalen Bilder verzögert und zeigt den persönlichen Lernstatus an.

## Lokale Assets und Lizenzen

Alle Laufzeitdaten liegen in `src/games/flaggenkunde/`, alle Bilder und Locator-Karten in `public/assets/flags/`. Herkunft und Lizenzhinweise sind in `public/assets/flags/ATTRIBUTION.md` sowie den dort abgelegten Lizenztexten dokumentiert.

Mit `scripts/import-flag-game-assets.mjs` lässt sich der Datenbestand aus den dokumentierten Quellbeständen reproduzierbar neu erzeugen. Das Script erwartet die Umgebungsvariablen `FLAG_COUNTRY_SOURCE` und `FLAG_SUBDIVISION_SOURCE`; der Produktionsbuild selbst benötigt diese Quellen nicht. `scripts/generate-flag-locator-maps.mjs` erzeugt die lokalen Karten aus geoBoundaries und Natural Earth.
