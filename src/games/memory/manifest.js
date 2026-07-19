import { appPath } from '../../basePath.js'
import { memoryManifest } from './generatedManifest.js'

export const MEMORY_MIN_PAIRS = 6
export const MEMORY_MAX_PAIRS = 15
export const MEMORY_PAIR_OPTIONS = Object.freeze(Array.from(
  { length: MEMORY_MAX_PAIRS - MEMORY_MIN_PAIRS + 1 },
  (_, index) => MEMORY_MIN_PAIRS + index,
))

function isValidMemorySet(set) {
  if (!set || typeof set.id !== 'string' || !set.id || typeof set.label !== 'string' || !set.label.trim()) return false
  if (typeof set.fingerprint !== 'string' || set.fingerprint.length !== 64 || !Array.isArray(set.cards)) return false
  const ids = set.cards.map((card) => card?.id)
  if (ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) return false
  return set.ready === (set.cards.length >= MEMORY_MIN_PAIRS)
}

export function getMemorySets(manifest = memoryManifest) {
  if (!manifest || manifest.schemaVersion !== 2 || manifest.minPairs !== MEMORY_MIN_PAIRS || !Array.isArray(manifest.sets)) return []
  if (new Set(manifest.sets.map((set) => set?.id)).size !== manifest.sets.length) return []
  return manifest.sets.filter(isValidMemorySet)
}

export function getMemorySet(setId, manifest = memoryManifest) {
  return getMemorySets(manifest).find((set) => set.id === setId) ?? null
}

export function getDefaultMemorySetId(manifest = memoryManifest) {
  return getMemorySets(manifest).find((set) => set.ready)?.id ?? null
}

export function isMemoryReady(manifest = memoryManifest) {
  if (manifest?.ready !== true || typeof manifest?.fingerprint !== 'string' || manifest.fingerprint.length !== 64) return false
  return getMemorySets(manifest).some((set) => set.ready)
}

export function getAvailableMemoryPairCounts(setId = getDefaultMemorySetId(), manifest = memoryManifest) {
  const set = getMemorySet(setId, manifest)
  if (!set?.ready) return []
  return MEMORY_PAIR_OPTIONS.filter((count) => count <= set.cards.length)
}

export function getDefaultMemoryPairCount(setId = getDefaultMemorySetId(), manifest = memoryManifest) {
  const options = getAvailableMemoryPairCounts(setId, manifest)
  if (options.includes(8)) return 8
  return options[0] ?? null
}

export function getMemoryAssets(setId = getDefaultMemorySetId(), manifest = memoryManifest) {
  const set = getMemorySet(setId, manifest)
  if (!set?.ready) return []
  return set.cards.map((card) => ({ ...card, src: appPath(card.src) }))
}

export { memoryManifest }
