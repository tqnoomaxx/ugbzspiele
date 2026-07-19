import { describe, expect, it } from 'vitest'
import {
  getAvailableMemoryPairCounts,
  getDefaultMemoryPairCount,
  getDefaultMemorySetId,
  getMemorySet,
  getMemorySets,
  isMemoryReady,
} from './manifest.js'

function fakeManifest(count, ready = count >= 6) {
  return {
    schemaVersion: 2,
    minPairs: 6,
    ready,
    fingerprint: 'd'.repeat(64),
    sets: [{
      id: 'familie',
      label: 'Familie',
      ready,
      fingerprint: 'e'.repeat(64),
      cards: Array.from({ length: count }, (_, index) => ({ id: `motiv-${index}` })),
    }],
  }
}

describe('memory manifest gate', () => {
  it('stays hard-hidden below six unique cards', () => {
    expect(isMemoryReady(fakeManifest(0))).toBe(false)
    expect(isMemoryReady(fakeManifest(5))).toBe(false)
    expect(isMemoryReady(fakeManifest(6, false))).toBe(false)
    expect(getAvailableMemoryPairCounts('familie', fakeManifest(5))).toEqual([])
  })

  it('offers only supported sizes covered by the asset inventory', () => {
    expect(isMemoryReady(fakeManifest(6))).toBe(true)
    expect(getAvailableMemoryPairCounts('familie', fakeManifest(6))).toEqual([6])
    expect(getAvailableMemoryPairCounts('familie', fakeManifest(8))).toEqual([6, 7, 8])
    expect(getAvailableMemoryPairCounts('familie', fakeManifest(11))).toEqual([6, 7, 8, 9, 10, 11])
    expect(getAvailableMemoryPairCounts('familie', fakeManifest(20))).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15])
    expect(getDefaultMemoryPairCount('familie', fakeManifest(6))).toBe(6)
    expect(getDefaultMemoryPairCount('familie', fakeManifest(12))).toBe(8)
    expect(getDefaultMemorySetId(fakeManifest(12))).toBe('familie')
    expect(getMemorySet('familie', fakeManifest(12))?.label).toBe('Familie')
  })

  it('rejects duplicate IDs even if ready is true', () => {
    const manifest = fakeManifest(6)
    manifest.sets[0].cards[5].id = manifest.sets[0].cards[0].id
    expect(isMemoryReady(manifest)).toBe(false)
    expect(getMemorySets(manifest)).toEqual([])
  })

  it('keeps incomplete sets visible in metadata while choosing the first playable set', () => {
    const manifest = fakeManifest(8)
    manifest.sets.unshift({
      id: 'neu',
      label: 'Neu',
      ready: false,
      fingerprint: 'f'.repeat(64),
      cards: [{ id: 'eins' }],
    })
    expect(getMemorySets(manifest)).toHaveLength(2)
    expect(getDefaultMemorySetId(manifest)).toBe('familie')
  })
})
