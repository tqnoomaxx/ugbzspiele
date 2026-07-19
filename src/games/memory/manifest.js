import { appPath } from '../../basePath.js'
import { memoryManifest } from './generatedManifest.js'

export const MEMORY_MIN_PAIRS = 6
export const MEMORY_PAIR_OPTIONS = Object.freeze([6, 8, 10, 12])

export function isMemoryReady(manifest = memoryManifest) {
  if (!manifest || manifest.schemaVersion !== 1 || manifest.minPairs !== MEMORY_MIN_PAIRS) return false
  if (!Array.isArray(manifest.cards) || manifest.cards.length < MEMORY_MIN_PAIRS) return false
  if (new Set(manifest.cards.map((card) => card.id)).size !== manifest.cards.length) return false
  return manifest.ready === true && typeof manifest.fingerprint === 'string' && manifest.fingerprint.length === 64
}

export function getAvailableMemoryPairCounts(manifest = memoryManifest) {
  if (!isMemoryReady(manifest)) return []
  return MEMORY_PAIR_OPTIONS.filter((count) => count <= manifest.cards.length)
}

export function getDefaultMemoryPairCount(manifest = memoryManifest) {
  const options = getAvailableMemoryPairCounts(manifest)
  if (options.includes(8)) return 8
  return options[0] ?? null
}

export function getMemoryAssets(manifest = memoryManifest) {
  if (!isMemoryReady(manifest)) return []
  return manifest.cards.map((card) => ({ ...card, src: appPath(card.src) }))
}

export { memoryManifest }
