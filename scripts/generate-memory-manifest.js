import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const MIN_MEMORY_PAIRS = 6
export const MAX_MEMORY_PAIRS = 15
export const MEMORY_PAIR_OPTIONS = Object.freeze(Array.from(
  { length: MAX_MEMORY_PAIRS - MIN_MEMORY_PAIRS + 1 },
  (_, index) => MIN_MEMORY_PAIRS + index,
))
export const ALLOWED_MEMORY_EXTENSIONS = Object.freeze(['.avif', '.jpeg', '.jpg', '.png', '.webp'])
export const MAX_MEMORY_FILE_BYTES = 2 * 1024 * 1024
export const MIN_MEMORY_IMAGE_EDGE = 512

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, '..')
const DEFAULT_MEMORY_DIRECTORY = path.join(PROJECT_ROOT, 'public', 'assets', 'memory')
const DEFAULT_PAIRS_DIRECTORY = path.join(DEFAULT_MEMORY_DIRECTORY, 'pairs')
const DEFAULT_OUTPUT_FILE = path.join(PROJECT_ROOT, 'src', 'games', 'memory', 'generatedManifest.js')
const DEFAULT_PUBLIC_OUTPUT_FILE = path.join(DEFAULT_MEMORY_DIRECTORY, 'manifest.json')
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const OPAQUE_PHOTO_NAME_PATTERN = /^(?:[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}(?:[_-].*)?|(?:img|dsc|pxl)[_-]?\d[\w-]*)$/i
const UNSUPPORTED_HEIC_EXTENSIONS = new Set(['.heic', '.heif'])

function readUint24LE(buffer, offset) {
  return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16)
}

function pngDimensions(buffer) {
  const signature = '89504e470d0a1a0a'
  if (buffer.length < 24 || buffer.subarray(0, 8).toString('hex') !== signature) return null
  const width = buffer.readUInt32BE(16)
  const height = buffer.readUInt32BE(20)
  return width && height ? { width, height } : null
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null
  const startOfFrameMarkers = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf])
  let offset = 2
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue }
    const marker = buffer[offset + 1]
    offset += 2
    if (marker === 0xd8 || marker === 0xd9) continue
    if (marker === 0xda) break
    if (offset + 2 > buffer.length) break
    const segmentLength = buffer.readUInt16BE(offset)
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break
    if (startOfFrameMarkers.has(marker) && segmentLength >= 7) {
      const height = buffer.readUInt16BE(offset + 3)
      const width = buffer.readUInt16BE(offset + 5)
      return width && height ? { width, height } : null
    }
    offset += segmentLength
  }
  return null
}

function webpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null
  const format = buffer.toString('ascii', 12, 16)
  if (format === 'VP8X') {
    return { width: readUint24LE(buffer, 24) + 1, height: readUint24LE(buffer, 27) + 1 }
  }
  if (format === 'VP8L' && buffer.length >= 25 && buffer[20] === 0x2f) {
    const bits = buffer.readUInt32LE(21)
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
  }
  if (format === 'VP8 ') {
    const frameHeader = buffer.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20)
    if (frameHeader >= 0 && frameHeader + 7 <= buffer.length) {
      return {
        width: buffer.readUInt16LE(frameHeader + 3) & 0x3fff,
        height: buffer.readUInt16LE(frameHeader + 5) & 0x3fff,
      }
    }
  }
  return null
}

function avifDimensions(buffer) {
  if (buffer.length < 32 || buffer.toString('ascii', 4, 8) !== 'ftyp') return null
  const brands = buffer.subarray(8, Math.min(buffer.length, 80)).toString('ascii')
  if (!brands.includes('avif') && !brands.includes('avis')) return null
  const marker = buffer.indexOf(Buffer.from('ispe'))
  if (marker < 4 || marker + 16 > buffer.length) return null
  const width = buffer.readUInt32BE(marker + 8)
  const height = buffer.readUInt32BE(marker + 12)
  return width && height ? { width, height } : null
}

export function inspectMemoryImage(buffer, extension) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_MEMORY_FILE_BYTES) return null
  if (extension === '.png') return pngDimensions(buffer)
  if (extension === '.jpg' || extension === '.jpeg') return jpegDimensions(buffer)
  if (extension === '.webp') return webpDimensions(buffer)
  if (extension === '.avif') return avifDimensions(buffer)
  return null
}

export function labelFromMemorySlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase('de-DE') + part.slice(1))
    .join(' ')
}

export function memoryIdFromFilename(filename) {
  const extension = path.extname(filename)
  const normalized = path.basename(filename, extension)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de-DE')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return normalized || `motiv-${createHash('sha256').update(filename).digest('hex').slice(0, 10)}`
}

async function readLabels(labelsPath, warnings) {
  if (!existsSync(labelsPath)) return {}
  try {
    const value = JSON.parse(await readFile(labelsPath, 'utf8'))
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error('kein Objekt')
    return value
  } catch (error) {
    warnings.push(`labels.json wird ignoriert (${error.message}).`)
    return {}
  }
}

function labelOverride(labels, setSlug, id) {
  const nested = setSlug && labels[setSlug] && typeof labels[setSlug] === 'object'
    ? labels[setSlug][id]
    : null
  const pathLabel = setSlug ? labels[`${setSlug}/${id}`] : null
  const value = nested ?? pathLabel ?? labels[id]
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 80) : ''
}

async function buildMemorySet({ directory, id, label, publicPath, setSlug, entries, labels, warnings }) {
  const candidates = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort((first, second) => first.localeCompare(second, 'de-DE'))
  const cards = []
  const hashes = new Set()
  const ids = new Set()

  for (const filename of candidates) {
    const extension = path.extname(filename).toLowerCase()
    const relativeName = setSlug ? `${setSlug}/${filename}` : filename
    if (UNSUPPORTED_HEIC_EXTENSIONS.has(extension)) {
      warnings.push(`${relativeName}: HEIC/HEIF wird im Browser nicht zuverlässig unterstützt. Bitte als JPEG, WebP, PNG oder AVIF exportieren.`)
      continue
    }
    if (!ALLOWED_MEMORY_EXTENSIONS.includes(extension)) continue
    const imageId = memoryIdFromFilename(filename)
    if (!SLUG_PATTERN.test(imageId)) {
      warnings.push(`${relativeName}: Es konnte keine gültige Motiv-ID gebildet werden.`)
      continue
    }
    if (ids.has(imageId)) {
      warnings.push(`${relativeName}: Motiv-ID „${imageId}“ ist in diesem Set bereits vergeben.`)
      continue
    }

    const filePath = path.join(directory, filename)
    const buffer = await readFile(filePath)
    const dimensions = inspectMemoryImage(buffer, extension)
    if (!dimensions) {
      warnings.push(`${relativeName}: Datei ist zu groß, defekt oder kein unterstütztes Bild.`)
      continue
    }
    const ratio = dimensions.width / dimensions.height
    if (dimensions.width < MIN_MEMORY_IMAGE_EDGE || dimensions.height < MIN_MEMORY_IMAGE_EDGE || ratio < 0.5 || ratio > 2) {
      warnings.push(`${relativeName}: mindestens 512×512 px und Seitenverhältnis 0,5–2 erforderlich.`)
      continue
    }

    const sha256 = createHash('sha256').update(buffer).digest('hex')
    if (hashes.has(sha256)) {
      warnings.push(`${relativeName}: exaktes Bildduplikat wird nicht als weiteres Paar gezählt.`)
      continue
    }
    hashes.add(sha256)
    ids.add(imageId)
    const override = labelOverride(labels, setSlug, imageId)
    const originalSlug = path.basename(filename, path.extname(filename))
    cards.push({
      id: imageId,
      src: `/assets/memory/pairs/${publicPath ? `${encodeURIComponent(publicPath)}/` : ''}${encodeURIComponent(filename)}`,
      label: override || (OPAQUE_PHOTO_NAME_PATTERN.test(originalSlug) ? `Foto ${cards.length + 1}` : labelFromMemorySlug(imageId)),
      width: dimensions.width,
      height: dimensions.height,
      sha256,
    })
  }

  cards.sort((first, second) => first.id.localeCompare(second.id, 'de-DE'))
  const fingerprint = createHash('sha256').update(JSON.stringify(cards)).digest('hex')
  const availablePairCounts = MEMORY_PAIR_OPTIONS.filter((count) => count <= cards.length)
  return {
    id,
    label,
    ready: cards.length >= MIN_MEMORY_PAIRS,
    fingerprint,
    availablePairCounts,
    cards,
  }
}

export async function buildMemoryManifest({
  pairsDirectory = DEFAULT_PAIRS_DIRECTORY,
  labelsPath = path.join(path.dirname(pairsDirectory), 'labels.json'),
} = {}) {
  const warnings = []
  const labels = await readLabels(labelsPath, warnings)
  const entries = existsSync(pairsDirectory)
    ? await readdir(pairsDirectory, { withFileTypes: true })
    : []
  const sets = []
  const rootImageEntries = entries.filter((entry) => entry.isFile() && (
    ALLOWED_MEMORY_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())
    || UNSUPPORTED_HEIC_EXTENSIONS.has(path.extname(entry.name).toLowerCase())
  ))
  if (rootImageEntries.length > 0) {
    sets.push(await buildMemorySet({
      directory: pairsDirectory,
      id: '_root',
      label: 'Standard',
      publicPath: '',
      setSlug: '',
      entries: rootImageEntries,
      labels,
      warnings,
    }))
  }

  const directories = entries
    .filter((entry) => entry.isDirectory())
    .sort((first, second) => first.name.localeCompare(second.name, 'de-DE'))
  for (const entry of directories) {
    if (!SLUG_PATTERN.test(entry.name)) {
      warnings.push(`${entry.name}/: Ordnername muss ein kleingeschriebener Slug sein, zum Beispiel „urlaub-2026“.`)
      continue
    }
    const directory = path.join(pairsDirectory, entry.name)
    sets.push(await buildMemorySet({
      directory,
      id: entry.name,
      label: labelFromMemorySlug(entry.name),
      publicPath: entry.name,
      setSlug: entry.name,
      entries: await readdir(directory, { withFileTypes: true }),
      labels,
      warnings,
    }))
  }

  const fingerprint = createHash('sha256').update(JSON.stringify(sets)).digest('hex')
  return {
    manifest: {
      schemaVersion: 2,
      minPairs: MIN_MEMORY_PAIRS,
      ready: sets.some((set) => set.ready),
      fingerprint,
      sets,
    },
    warnings,
  }
}

export function serializeMemoryManifest(manifest) {
  return `// Diese Datei wird von scripts/generate-memory-manifest.js erzeugt.\nexport const memoryManifest = Object.freeze(${JSON.stringify(manifest, null, 2)})\n\nexport default memoryManifest\n`
}

export async function generateMemoryManifest(options = {}) {
  const outputFile = options.outputFile ?? DEFAULT_OUTPUT_FILE
  const publicOutputFile = options.publicOutputFile ?? DEFAULT_PUBLIC_OUTPUT_FILE
  const result = await buildMemoryManifest(options)
  await mkdir(path.dirname(outputFile), { recursive: true })
  await writeFile(outputFile, serializeMemoryManifest(result.manifest), 'utf8')
  if (publicOutputFile) {
    await mkdir(path.dirname(publicOutputFile), { recursive: true })
    await writeFile(publicOutputFile, `${JSON.stringify(result.manifest, null, 2)}\n`, 'utf8')
  }
  return result
}

async function main() {
  const result = await generateMemoryManifest()
  result.warnings.forEach((warning) => console.warn(`[Memory] ${warning}`))
  const status = result.manifest.ready ? 'sichtbar' : 'verborgen'
  const readySets = result.manifest.sets.filter((set) => set.ready).length
  const cards = result.manifest.sets.reduce((total, set) => total + set.cards.length, 0)
  console.log(`[Memory] ${readySets} spielbare Sets mit insgesamt ${cards} validen Motiven; Spiel bleibt ${status}.`)
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(`[Memory] Manifest konnte nicht erzeugt werden: ${error.message}`)
    process.exitCode = 1
  })
}
