import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'

const root = path.resolve(import.meta.dirname, '..')
const defaultOutput = path.join(root, 'public/assets/flags/maps')
const interactiveOutput = path.join(root, 'public/assets/flags/interactive')
const manifestOutput = path.join(root, 'src/games/flaggenkunde/mapManifest.generated.js')
const cacheDirectory = path.join(tmpdir(), 'ugbz-map-source-cache')
const naturalEarthUrl = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_1_states_provinces.geojson'
const naturalEarthCountriesUrl = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson'
const europeHyperExclusions = new Set(['region-BE-VLG', 'region-BE-WAL'])
const sourceCredits = new Map()

async function fetchJson(url) {
  mkdirSync(cacheDirectory, { recursive: true })
  const cacheFile = path.join(cacheDirectory, `${createHash('sha256').update(url).digest('hex')}.json`)
  if (existsSync(cacheFile) && process.env.FLAG_REFRESH_GEOMETRY !== '1') return JSON.parse(readFileSync(cacheFile, 'utf8'))
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`${url}: ${response.status}`)
  const data = await response.json()
  writeFileSync(cacheFile, JSON.stringify(data))
  return data
}

const mapConfigs = {
  AR: { iso3: 'ARG', levels: ['ADM1'] },
  AT: { iso3: 'AUT', levels: ['ADM1'] },
  AU: { iso3: 'AUS', levels: ['ADM1'] },
  BE: { iso3: 'BEL', levels: ['ADM1', 'ADM2'] },
  BR: { iso3: 'BRA', levels: ['ADM1'] },
  CA: { iso3: 'CAN', levels: ['ADM1'] },
  CH: { iso3: 'CHE', levels: ['ADM1'] },
  CL: { iso3: 'CHL', levels: ['ADM1'] },
  CO: { iso3: 'COL', levels: ['ADM1'] },
  CZ: { iso3: 'CZE', levels: ['ADM1'] },
  DE: { iso3: 'DEU', levels: ['ADM1'] },
  ES: { iso3: 'ESP', levels: ['ADM1'] },
  GB: { iso3: 'GBR', levels: ['ADM1'] },
  HR: { iso3: 'HRV', levels: ['ADM1'] },
  IT: { iso3: 'ITA', levels: ['ADM2'] },
  JP: { iso3: 'JPN', levels: ['ADM1'] },
  MX: { iso3: 'MEX', levels: ['ADM1'] },
  MY: { iso3: 'MYS', levels: ['ADM1'] },
  NL: { iso3: 'NLD', levels: ['ADM1'] },
  PL: { iso3: 'POL', levels: ['ADM1'] },
  SE: { iso3: 'SWE', levels: ['ADM1'] },
  SK: { iso3: 'SVK', levels: ['ADM1'] },
  US: { iso3: 'USA', levels: ['ADM1'] },
}

const selectorOverrides = {
  'AR-E': { naturalEarthCode: 'AR-E' },
  'BE-BRU': { code: 'BRU' }, 'BE-VLG': { code: 'VLG' }, 'BE-WAL': { code: 'WAL' },
  'CA-QC': { code: 'CA-QB' },
  'CZ-PR': { code: 'CZ-10' },
  'MX-CMX': { name: 'Distrito Federal' },
  'MX-MEX': { name: 'Mexico' },
  'US-SD': { code: 'SU-SD' },
  'PL-02': { code: 'PL-DS' }, 'PL-04': { code: 'PL-KP' }, 'PL-06': { code: 'PL-LU' }, 'PL-08': { code: 'PL-LB' },
  'PL-10': { code: 'PL-LD' }, 'PL-12': { code: 'PL-MA' }, 'PL-14': { code: 'PL-MZ' }, 'PL-16': { code: 'PL-OP' },
  'PL-18': { code: 'PL-PK' }, 'PL-20': { code: 'PL-PD' }, 'PL-22': { code: 'PL-PM' }, 'PL-24': { code: 'PL-SL' },
  'PL-26': { code: 'PL-SK' }, 'PL-28': { code: 'PL-WN' }, 'PL-30': { code: 'PL-WP' }, 'PL-32': { code: 'PL-ZP' },
  'ES-AN': { name: 'Andalucía' }, 'ES-AR': { name: 'Aragón' }, 'ES-AS': { name: 'Principado de Asturias' },
  'ES-CB': { name: 'Cantabria' }, 'ES-CL': { name: 'Castilla y León' }, 'ES-CM': { name: 'Castilla-La Mancha' },
  'ES-CT': { name: 'Cataluña/Catalunya' }, 'ES-EX': { name: 'Extremadura' }, 'ES-GA': { name: 'Galicia' },
  'ES-IB': { name: 'Illes Balears' }, 'ES-CN': { name: 'Canarias' }, 'ES-MC': { name: 'Región de Murcia' },
  'ES-MD': { name: 'Comunidad de Madrid' }, 'ES-NC': { name: 'Comunidad Foral de Navarra' }, 'ES-PV': { name: 'País Vasco/Euskadi' },
  'ES-RI': { name: 'La Rioja' }, 'ES-VC': { name: 'Comunitat Valenciana' },
  'ES-CE': { name: 'Ciudad Autónoma de Ceuta' }, 'ES-ML': { name: 'Ciudad Autónoma de Melilla' },
  'IT-21': { name: 'Piemonte' }, 'IT-23': { name: "Valle d'Aosta" }, 'IT-25': { name: 'Lombardia' },
  'IT-32': { name: 'Trentino-Alto Adige' }, 'IT-34': { name: 'Veneto' }, 'IT-36': { name: 'Friuli Venezia Giulia' },
  'IT-42': { name: 'Liguria' }, 'IT-45': { name: 'Emilia-Romagna' }, 'IT-52': { name: 'Toscana' },
  'IT-55': { name: 'Umbria' }, 'IT-57': { name: 'Marche' }, 'IT-62': { name: 'Lazio' },
  'IT-65': { name: 'Abruzzo' }, 'IT-67': { name: 'Molise' }, 'IT-72': { name: 'Campania' },
  'IT-75': { name: 'Puglia' }, 'IT-77': { name: 'Basilicata' }, 'IT-78': { name: 'Calabria' },
  'IT-82': { name: 'Sicilia' }, 'IT-88': { name: 'Sardegna' },
}

function normalizeName(value = '') {
  return value.normalize('NFKD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function getRings(geometry) {
  if (!geometry) return []
  if (geometry.type === 'Polygon') return geometry.coordinates
  if (geometry.type === 'MultiPolygon') return geometry.coordinates.flat()
  return []
}

function pointLineDistance(point, start, end) {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1])
  const t = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(point[0] - (start[0] + t * dx), point[1] - (start[1] + t * dy))
}

function simplify(points, tolerance = 0.45) {
  if (points.length <= 4) return points
  let farthest = 0
  let index = 0
  for (let cursor = 1; cursor < points.length - 1; cursor += 1) {
    const distance = pointLineDistance(points[cursor], points[0], points.at(-1))
    if (distance > farthest) {
      farthest = distance
      index = cursor
    }
  }
  if (farthest <= tolerance) return [points[0], points.at(-1)]
  return [...simplify(points.slice(0, index + 1), tolerance).slice(0, -1), ...simplify(points.slice(index), tolerance)]
}

function createProjection(features, width = 240, height = 160, padding = 10) {
  const coordinates = features.flatMap((feature) => getRings(feature.geometry).flat())
  let minLat = Infinity
  let maxLat = -Infinity
  for (const [, latitude] of coordinates) {
    minLat = Math.min(minLat, latitude)
    maxLat = Math.max(maxLat, latitude)
  }
  const longitudeCandidates = [
    (longitude) => longitude,
    (longitude) => longitude > 0 ? longitude - 360 : longitude,
    (longitude) => longitude < 0 ? longitude + 360 : longitude,
  ]
  const longitudeTransform = longitudeCandidates
    .map((transform) => {
      let minimum = Infinity
      let maximum = -Infinity
      for (const [longitude] of coordinates) {
        const transformed = transform(longitude)
        minimum = Math.min(minimum, transformed)
        maximum = Math.max(maximum, transformed)
      }
      return { transform, minimum, maximum, range: maximum - minimum }
    })
    .sort((left, right) => left.range - right.range)[0]
  const minLongitude = longitudeTransform.minimum
  const maxLongitude = longitudeTransform.maximum
  const longitudeScale = Math.max(0.2, Math.cos(((minLat + maxLat) / 2) * Math.PI / 180))
  const minX = minLongitude * longitudeScale
  const maxX = maxLongitude * longitudeScale
  const scale = Math.min((width - padding * 2) / Math.max(0.001, maxX - minX), (height - padding * 2) / Math.max(0.001, maxLat - minLat))
  const usedWidth = (maxX - minX) * scale
  const usedHeight = (maxLat - minLat) * scale
  const offsetX = (width - usedWidth) / 2
  const offsetY = (height - usedHeight) / 2
  return ([longitude, latitude]) => [
    offsetX + (longitudeTransform.transform(longitude) * longitudeScale - minX) * scale,
    offsetY + (maxLat - latitude) * scale,
  ]
}

function pathFor(features, project, tolerance = 0.45, preserveArea = true) {
  return features.flatMap((feature) => getRings(feature.geometry).map((ring) => {
    const projected = ring.map(project)
    const open = projected.length > 2 && projected[0][0] === projected.at(-1)[0] && projected[0][1] === projected.at(-1)[1]
      ? projected.slice(0, -1)
      : projected
    if (!preserveArea) {
      const reduced = simplify(open, tolerance)
      if (reduced.length < 3) return ''
      return `M${reduced.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`
    }
    if (open.length < 3) return ''
    const xs = open.map(([x]) => x)
    const ys = open.map(([, y]) => y)
    const shortSide = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys))
    const reduced = simplify(open, Math.min(tolerance, shortSide / 20)).map(([x, y]) => [Number(x.toFixed(2)), Number(y.toFixed(2))])
    const area = reduced.reduce((sum, point, index) => {
      const next = reduced[(index + 1) % reduced.length]
      return sum + point[0] * next[1] - next[0] * point[1]
    }, 0)
    // Three points may still be collinear or identical after rounding (Athos,
    // Encamp). Preserve the original ring rather than producing an unclickable line.
    const points = reduced.length < 3 || Math.abs(area) < 0.000001 ? open : reduced
    return `M${points.map(([x, y]) => `${Number(x.toFixed(3))} ${Number(y.toFixed(3))}`).join('L')}Z`
  })).filter(Boolean).join('')
}

function boundsFor(feature, project) {
  const points = getRings(feature.geometry).flat().map(project)
  const bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  for (const [x, y] of points) {
    bounds.minX = Math.min(bounds.minX, x)
    bounds.maxX = Math.max(bounds.maxX, x)
    bounds.minY = Math.min(bounds.minY, y)
    bounds.maxY = Math.max(bounds.maxY, y)
  }
  return bounds
}

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character])
}

function renderMap(flag, background, target) {
  const project = createProjection(background)
  // Locator thumbnails already use a marker for tiny targets; keep them compact.
  const backgroundPath = pathFor(background, project, 0.45, false)
  const targetPath = pathFor([target], project, 0.45, false)
  const bounds = boundsFor(target, project)
  const isTiny = Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) < 5
  const centerX = ((bounds.minX + bounds.maxX) / 2).toFixed(1)
  const centerY = ((bounds.minY + bounds.maxY) / 2).toFixed(1)
  const marker = isTiny ? `<circle cx="${centerX}" cy="${centerY}" r="4" fill="#ed7659" stroke="#fffaf0" stroke-width="2"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160"><title>${escapeXml(`Lage von ${flag.name} in ${flag.parent}`)}</title><rect width="240" height="160" rx="16" fill="#f4eddf"/><path d="${backgroundPath}" fill="#cfc6b5" fill-rule="evenodd" stroke="#fffaf0" stroke-linejoin="round" stroke-width=".8"/><path d="${targetPath}" fill="#ed7659" fill-rule="evenodd" stroke="#173748" stroke-linejoin="round" stroke-width="1.3"/>${marker}</svg>`
}

async function fetchGeoBoundaries(prefix, config) {
  const features = []
  for (const level of config.levels) {
    const url = `https://www.geoboundaries.org/api/current/gbOpen/${config.iso3}/${level}/`
    const metadata = await fetchJson(url)
    const geometry = await fetchJson(metadata.simplifiedGeometryGeoJSON)
    sourceCredits.set(`${prefix}-${level}`, { source: 'geoBoundaries gbOpen', url, geometry: metadata.simplifiedGeometryGeoJSON, year: metadata.boundaryYearRepresented, license: metadata.boundaryLicense })
    features.push(...geometry.features.map((feature) => ({ ...feature, sourceGroup: `${prefix}-${level}` })))
  }
  return features
}

function findGeoFeature(code, features) {
  const selector = selectorOverrides[code]
  if (selector?.naturalEarthCode) return null
  if (selector?.code) return features.find((feature) => feature.properties.shapeISO === selector.code)
  if (selector?.name) return features.find((feature) => normalizeName(feature.properties.shapeName) === normalizeName(selector.name))
  return features.find((feature) => feature.properties.shapeISO === code)
}

async function fetchNaturalEarth() {
  return (await fetchJson(naturalEarthUrl)).features
}

async function fetchEuropeCountries() {
  const features = (await fetchJson(naturalEarthCountriesUrl)).features
  const europeExtras = new Set(['CY', 'TR'])
  const insideEurope = ([longitude, latitude]) => longitude >= -32 && longitude <= 60 && latitude >= 27 && latitude <= 72
  return features.flatMap((feature) => {
    const properties = feature.properties ?? {}
    const code = properties.ISO_A2_EH ?? properties.ISO_A2 ?? properties.iso_a2
    const continent = properties.CONTINENT ?? properties.continent
    if (continent !== 'Europe' && !europeExtras.has(code)) return []
    const polygons = feature.geometry?.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry?.coordinates ?? []
    const visiblePolygons = polygons.filter((polygon) => polygon[0]?.some(insideEurope)).map((polygon) => polygon.map((ring) => ring.map(([x, y]) => [Math.max(-32, Math.min(60, x)), Math.max(27, Math.min(72, y))])))
    if (!visiblePolygons.length) return []
    return [{ ...feature, geometry: { type: 'MultiPolygon', coordinates: visiblePolygons } }]
  })
}

function uniqueFeatures(features) {
  return [...new Set(features)]
}

function createShape(flag, feature, project, tolerance = 0.8) {
  const bounds = boundsFor(feature, project)
  return {
    flagId: flag.id,
    name: flag.name,
    parent: flag.parent,
    bounds: [bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY].map((number) => Number(number.toFixed(3))),
    d: pathFor([feature], project, tolerance),
  }
}

function europeanPart(feature) {
  const polygons = feature.geometry?.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry?.coordinates ?? []
  const visible = polygons.filter((polygon) => polygon[0]?.some(([x, y]) => x >= -32 && x <= 60 && y >= 27 && y <= 72))
    .map((polygon) => polygon.map((ring) => ring.map(([x, y]) => [Math.max(-32, Math.min(60, x)), Math.max(27, Math.min(72, y))])))
  return visible.length ? { ...feature, geometry: { type: 'MultiPolygon', coordinates: visible } } : null
}

async function addEuropeanRegions(europeFlags, countries, targetByFlagId, naturalEarthFeatures) {
  const covered = new Set(europeFlags.map((flag) => flag.code.split('-')[0]))
  // Åland is already one of Finland's 19 regions. Do not overlay a second,
  // incompatible municipality layer on the same islands.
  covered.add('AX')
  const extras = await Promise.all(countries.filter((country) => !covered.has(country.properties.ISO_A2_EH)).map(async (country) => {
    const code = country.properties.ISO_A2_EH
    const parent = country.properties.NAME_DE
    const iso3 = code === 'XK' ? 'XKX' : country.properties.ISO_A3_EH
    let features
    try {
      // These gbOpen ADM1 sets use supra-regions (GR) or omit the capital (HU).
      // Use a complete, non-overlapping Natural Earth subdivision set instead.
      if (code === 'GR' || code === 'HU') throw new Error('Natural Earth subdivision level preferred')
      features = await fetchGeoBoundaries(code, { iso3, levels: ['ADM1'] })
    } catch {
      features = naturalEarthFeatures.filter((feature) => feature.properties.iso_a2 === code)
      sourceCredits.set(`${code}-fallback`, { source: 'Natural Earth', url: naturalEarthUrl, license: 'Public Domain' })
    }
    if (!features.length) features = [country]
    const matches = features.map((feature, index) => {
      const geometry = europeanPart(feature)
      if (!geometry) return null
      const props = feature.properties
      const name = props.shapeName || props.name_de || props.name || parent
      const regionCode = props.shapeISO || props.iso_3166_2 || `${code}-${index + 1}`
      const flag = { id: `map-${code}-${index + 1}`, code: regionCode, name, parent, kind: 'map-region', continent: 'europe' }
      targetByFlagId.set(flag.id, geometry)
      return flag
    }).filter(Boolean)
    if (!matches.length) throw new Error(`Keine europäischen Regionen für ${parent}`)
    console.log(`${parent}: ${matches.length} Europa-Ziele`)
    return matches
  }))
  return [...europeFlags, ...extras.flat()].sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

async function writeInteractiveGeometry(regionalFlags, matchedGeoByPrefix, naturalEarthFeatures) {
  const mapSets = {}
  const mapSetByFlagId = {}
  const targetByFlagId = new Map()

  for (const [prefix, prefixFlags] of Map.groupBy(regionalFlags, (flag) => flag.code.split('-')[0])) {
    let matches = prefixFlags.map((flag) => ({ flag, feature: matchedGeoByPrefix.get(prefix)?.get(flag.code) })).filter(({ feature }) => feature)
    if (matches.length !== prefixFlags.length) {
      const fallbackMatches = prefixFlags.map((flag) => {
        const fallbackCode = selectorOverrides[flag.code]?.naturalEarthCode ?? flag.code
        return { flag, feature: naturalEarthFeatures.find((feature) => feature.properties.iso_3166_2 === fallbackCode) }
      })
      if (fallbackMatches.every(({ feature }) => feature)) matches = fallbackMatches.map((match) => ({ ...match, feature: { ...match.feature, sourceGroup: `${prefix}-NE` } }))
    }

    for (const [sourceGroup, groupMatches] of Map.groupBy(matches, ({ feature }) => feature.sourceGroup ?? `${prefix}-NE`)) {
      const features = uniqueFeatures(groupMatches.map(({ feature }) => feature))
      const project = createProjection(features)
      const setId = sourceGroup
      mapSets[setId] = {
        label: groupMatches[0].flag.parent,
        viewBox: '0 0 240 160',
        shapes: groupMatches.map(({ flag, feature }) => createShape(flag, feature, project)),
      }
      for (const { flag, feature } of groupMatches) {
        mapSetByFlagId[flag.id] = setId
        targetByFlagId.set(flag.id, feature)
      }
    }
  }

  let europeFlags = regionalFlags.filter((flag) => flag.continent === 'europe' && !europeHyperExclusions.has(flag.id) && targetByFlagId.has(flag.id))
  const europeCountries = await fetchEuropeCountries()
  europeFlags = await addEuropeanRegions(europeFlags, europeCountries, targetByFlagId, naturalEarthFeatures)
  const europeTargets = europeFlags.map((flag) => targetByFlagId.get(flag.id))
  const europeProject = createProjection([...europeCountries, ...europeTargets], 980, 620, 22)
  const europeMap = {
    label: 'Europa-Hypermodus',
    viewBox: '0 0 980 620',
    backgroundPath: pathFor(europeCountries, europeProject, 1.8, false),
    shapes: europeFlags.map((flag) => createShape(flag, targetByFlagId.get(flag.id), europeProject, 0.9)),
  }

  mkdirSync(interactiveOutput, { recursive: true })
  for (const [id, map] of Object.entries({ ...mapSets, europe: europeMap })) writeFileSync(path.join(interactiveOutput, `${id}.json`), JSON.stringify(map))
  const source = `// Automatisch erzeugt durch scripts/generate-flag-locator-maps.mjs.\n// Die Geometrie wird je Karte aus lokalen JSON-Dateien nachgeladen.\nexport const mapSetByFlagId = ${JSON.stringify(mapSetByFlagId)}\nexport const europeMapTargets = ${JSON.stringify(europeFlags.map(({ id, code, name, parent, kind }) => ({ id, code, name, parent, kind })))}\n`
  writeFileSync(manifestOutput, source)
  writeFileSync(path.join(interactiveOutput, 'SOURCES.json'), JSON.stringify({ naturalEarth: { countries: naturalEarthCountriesUrl, subdivisions: naturalEarthUrl, license: 'Public Domain' }, datasets: Object.fromEntries(sourceCredits), extent: 'Europäischer Kartenausschnitt: 32°W bis 60°E, 27°N bis 72°N; Türkei und Zypern eingeschlossen. Verwaltungsstände je Quelldatensatz.' }, null, 2))
  console.log(`${Object.keys(mapSets).length} interaktive Kartensätze und ${europeFlags.length} Europa-Ziele erzeugt.`)
}

export async function generateFlagLocatorMaps(flags, { outputDirectory = defaultOutput, skipGeneration = false } = {}) {
  const regionalFlags = flags.filter((flag) => flag.kind === 'region')
  mkdirSync(outputDirectory, { recursive: true })

  if (skipGeneration) {
    return new Set(regionalFlags.filter((flag) => existsSync(path.join(outputDirectory, `${flag.code}.svg`))).map((flag) => flag.code))
  }

  const byPrefix = Map.groupBy(regionalFlags, (flag) => flag.code.split('-')[0])
  const geometryByPrefix = new Map()
  await Promise.all([...byPrefix.keys()].map(async (prefix) => {
    const config = mapConfigs[prefix]
    if (config) geometryByPrefix.set(prefix, await fetchGeoBoundaries(prefix, config))
  }))

  const matchedGeoByPrefix = new Map([...byPrefix].map(([prefix, prefixFlags]) => {
    const features = geometryByPrefix.get(prefix) ?? []
    return [prefix, new Map(prefixFlags.map((flag) => [flag.code, findGeoFeature(flag.code, features)]).filter(([, feature]) => feature))]
  }))

  let naturalEarth
  const mappedCodes = new Set()
  const missing = []
  for (const flag of regionalFlags) {
    const prefix = flag.code.split('-')[0]
    const geoTargets = matchedGeoByPrefix.get(prefix) ?? new Map()
    let target = geoTargets.get(flag.code)
    let background = target
      ? [...new Set(geoTargets.values())].filter((feature) => feature.sourceGroup === target.sourceGroup)
      : []

    if (!target) {
      naturalEarth ??= await fetchNaturalEarth()
      const fallbackCode = selectorOverrides[flag.code]?.naturalEarthCode ?? flag.code
      target = naturalEarth.find((feature) => feature.properties.iso_3166_2 === fallbackCode)
      background = target ? naturalEarth.filter((feature) => feature.properties.iso_a2 === prefix) : []
    }

    if (!target || background.length === 0) {
      missing.push(flag.code)
      continue
    }

    writeFileSync(path.join(outputDirectory, `${flag.code}.svg`), renderMap(flag, background, target))
    mappedCodes.add(flag.code)
  }

  for (const filename of readdirSync(outputDirectory)) {
    if (filename.endsWith('.svg') && !mappedCodes.has(filename.slice(0, -4))) rmSync(path.join(outputDirectory, filename))
  }

  if (missing.length) console.warn(`Keine Lagekarte für: ${missing.join(', ')}`)
  naturalEarth ??= await fetchNaturalEarth()
  await writeInteractiveGeometry(regionalFlags, matchedGeoByPrefix, naturalEarth)
  console.log(`${mappedCodes.size} lokale Lagekarten erzeugt.`)
  return mappedCodes
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isDirectRun) {
  const source = readFileSync(path.join(root, 'src/games/flaggenkunde/catalog.generated.js'), 'utf8')
  const flags = JSON.parse(source.slice(source.indexOf('[')))
  await generateFlagLocatorMaps(flags)
}
