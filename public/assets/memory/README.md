# Memory-Bilder-Sets

Jeder direkte Unterordner in `public/assets/memory/pairs/` wird automatisch zu einem auswählbaren Bilder-Set. Du musst keine Code-Datei und keine Liste bearbeiten.

```text
pairs/
├── familie/
│   ├── oma-und-opa.jpg
│   ├── hund.webp
│   └── ... mindestens 6 Motive
└── urlaub-2026/
    ├── strand.jpeg
    ├── berge.png
    └── ... mindestens 6 Motive
```

Nach `npm run dev`, `npm run build` oder dem nächsten GitHub-Push heißen die Sets automatisch „Familie“ und „Urlaub 2026“. Bilder, die direkt in `pairs/` liegen, bleiben kompatibel und erscheinen gemeinsam als Set „Standard“.

Regeln:

- Pro Motiv genau eine Datei; UGBZ erzeugt daraus automatisch zwei Karten.
- Unterstützt: WebP, AVIF, JPG/JPEG und PNG. HEIC/HEIF vorher exportieren oder konvertieren.
- Mindestens 512 × 512 Pixel, Seitenverhältnis zwischen 0,5 und 2, maximal 2 MB.
- Ein Set wird ab sechs unterschiedlichen gültigen Motiven spielbar.
- Ordnernamen: klein als Slug, zum Beispiel `urlaub-2026` oder `lustige-memes`.
- Beliebige Kamera-Dateinamen werden akzeptiert. Aussagekräftige Namen wie `roter-traktor.webp` ergeben schönere Kartenbezeichnungen.
- Bilder dürfen nur direkt im jeweiligen Set-Ordner liegen; weitere Unterordner werden nicht durchsucht.

Optionale eigene Kartenbezeichnungen kommen in `labels.json`. Für ein Ordner-Set werden sie so gruppiert:

```json
{
  "familie": {
    "oma-und-opa": "Oma & Opa"
  }
}
```

Alle Bilder sind auf einer öffentlichen Website ebenfalls öffentlich abrufbar. Vertrauliche Fotos gehören nicht in diesen Ordner.
