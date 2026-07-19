# Memory-Motive

Lege pro Motiv genau ein Bild in `public/assets/memory/pairs/`. UGBZ erzeugt daraus beim nächsten Start oder Build automatisch zwei Karten.

- Unterstützt: WebP, AVIF, JPG/JPEG und PNG
- Dateiname: kleingeschriebener Slug, zum Beispiel `roter-traktor.webp`
- Mindestens 512 × 512 Pixel, möglichst quadratisch, maximal 2 MB
- Memory wird erst ab sechs unterschiedlichen gültigen Motiven freigeschaltet
- Optionale bessere Bezeichnungen können in `labels.json` unter der Motiv-ID hinterlegt werden

Beispiel: `pairs/roter-traktor.webp` wird zu einem Kartenpaar mit der Bezeichnung „Roter Traktor“. Danach genügt lokal `npm run dev`; beim GitHub-Push erzeugt der normale Build das Manifest automatisch neu.

Alle Dateien in diesem Ordner sind bei einer öffentlichen Website ebenfalls öffentlich abrufbar. Vertrauliche Fotos gehören nicht hierher.
