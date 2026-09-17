import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { cityCatalog, landmarkCatalog } from '../src/games/flaggenkunde/geographyCatalog.js'

const root = path.resolve(import.meta.dirname, '..')
const outputDirectory = path.join(root, 'public/assets/geography/landmarks')
const cityOutputDirectory = path.join(root, 'public/assets/geography/cities')
const attributionFile = path.join(root, 'public/assets/geography/ATTRIBUTION.md')
const userAgent = 'UGBZ-Geography-Quiz/1.0 (https://github.com/tqnoomaxx/ugbzspiele)'
const missingOnly = process.env.GEOGRAPHY_MISSING_ONLY === '1'
const forcedIds = new Set((process.env.GEOGRAPHY_FORCE_IDS ?? '').split(',').filter(Boolean))

mkdirSync(outputDirectory, { recursive: true })
mkdirSync(cityOutputDirectory, { recursive: true })

async function fetchJson(url) {
  const response = await fetch(url, { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`${response.status}: ${url}`)
  return response.json()
}

async function wikipediaImage(title, language = 'en') {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    piprop: 'original',
    prop: 'pageimages',
    redirects: '1',
    titles: title,
  })
  const data = await fetchJson(`https://${language}.wikipedia.org/w/api.php?${params}`)
  const page = data.query?.pages?.[0]
  if (!page?.original?.source) throw new Error(`Kein Wikipedia-Bild für ${title}`)
  return { pageUrl: `https://${language}.wikipedia.org/wiki/${encodeURIComponent(page.title.replaceAll(' ', '_'))}`, source: page.original.source }
}

async function commonsMetadata(source) {
  const filename = decodeURIComponent(new URL(source).pathname.split('/').at(-1)).replace(/^File:/, '')
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    iiprop: 'extmetadata|url',
    prop: 'imageinfo',
    titles: `File:${filename}`,
  })
  const data = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`)
  const info = data.query?.pages?.[0]?.imageinfo?.[0]
  const meta = info?.extmetadata ?? {}
  return {
    commonsPage: info?.descriptionurl ?? null,
    artist: meta.Artist?.value?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? 'Unbekannt',
    license: meta.LicenseShortName?.value ?? 'Siehe Bildquelle',
    licenseUrl: meta.LicenseUrl?.value ?? null,
  }
}

const previousSourcesFile = path.join(outputDirectory, 'SOURCES.json')
const previousSources = existsSync(previousSourcesFile) ? JSON.parse(readFileSync(previousSourcesFile, 'utf8')) : []
const previousSourceById = new Map(previousSources.map((source) => [source.id, source]))
const sources = []
for (const [index, landmark] of landmarkCatalog.entries()) {
  const outputFile = path.join(outputDirectory, `${landmark.id.replace('landmark-', '')}.webp`)
  if (missingOnly && !forcedIds.has(landmark.id) && existsSync(outputFile) && previousSourceById.has(landmark.id)) {
    sources.push(previousSourceById.get(landmark.id))
    continue
  }
  const image = await wikipediaImage(landmark.wikipediaTitle, landmark.wikiLanguage)
  const metadata = await commonsMetadata(image.source).catch(() => ({ commonsPage: null, artist: 'Siehe Wikipedia', license: 'Siehe Bildquelle', licenseUrl: null }))
  const response = await fetch(image.source, { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error(`${response.status}: ${image.source}`)
  await sharp(Buffer.from(await response.arrayBuffer()), { density: 192, limitInputPixels: false })
    .rotate()
    .resize(1200, 750, { fit: 'cover', position: 'attention' })
    .webp({ quality: 84, effort: 5 })
    .toFile(outputFile)
  sources.push({ id: landmark.id, name: landmark.name, wikipedia: image.pageUrl, original: image.source, ...metadata })
  console.log(`${index + 1}/${landmarkCatalog.length}: ${landmark.name}`)
}

const picturedCities = cityCatalog.filter((city) => city.image)
for (const [index, city] of picturedCities.entries()) {
  const outputFile = path.join(root, 'public', city.image.replace(/^\//, ''))
  if (missingOnly && existsSync(outputFile) && previousSourceById.has(city.id)) {
    sources.push(previousSourceById.get(city.id))
    continue
  }
  const image = await wikipediaImage(city.wikipediaTitle, city.wikiLanguage)
  const metadata = await commonsMetadata(image.source).catch(() => ({ commonsPage: null, artist: 'Siehe Wikipedia', license: 'Siehe Bildquelle', licenseUrl: null }))
  const response = await fetch(image.source, { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(60_000) })
  if (!response.ok) throw new Error(`${response.status}: ${image.source}`)
  await sharp(Buffer.from(await response.arrayBuffer()), { density: 192, limitInputPixels: false })
    .rotate()
    .resize(1200, 750, { fit: 'cover', position: 'attention' })
    .webp({ quality: 84, effort: 5 })
    .toFile(outputFile)
  sources.push({ id: city.id, name: `${city.name} (${city.parent})`, wikipedia: image.pageUrl, original: image.source, ...metadata })
  console.log(`${index + 1}/${picturedCities.length}: Stadt ${city.name}`)
}

writeFileSync(path.join(outputDirectory, 'SOURCES.json'), JSON.stringify(sources, null, 2))
writeFileSync(attributionFile, `# Bildquellen für Geografie-Quizze\n\n` + sources.map((source) => {
  const author = source.artist.replaceAll('|', '\\|')
  return `- **${source.name}:** [Bildbeschreibung](${source.commonsPage ?? source.wikipedia}) · ${author} · ${source.license}${source.licenseUrl ? ` ([Lizenz](${source.licenseUrl}))` : ''}`
}).join('\n') + `\n\nDie Motive wurden lokal zugeschnitten und als WebP optimiert. Die ursprünglichen Lizenzen und Urheberangaben gelten unverändert.\n`)

console.log(`${sources.length} lokale Geografie-Bilder erzeugt.`)
