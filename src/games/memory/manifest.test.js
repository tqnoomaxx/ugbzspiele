import { describe, expect, it } from 'vitest'
import {
  getAvailableMemoryPairCounts,
  getDefaultMemoryPairCount,
  isMemoryReady,
} from './manifest.js'

function fakeManifest(count, ready = count >= 6) {
  return {
    schemaVersion: 1,
    minPairs: 6,
    ready,
    fingerprint: 'd'.repeat(64),
    cards: Array.from({ length: count }, (_, index) => ({ id: `motiv-${index}` })),
  }
}

describe('memory manifest gate', () => {
  it('stays hard-hidden below six unique cards', () => {
    expect(isMemoryReady(fakeManifest(0))).toBe(false)
    expect(isMemoryReady(fakeManifest(5))).toBe(false)
    expect(isMemoryReady(fakeManifest(6, false))).toBe(false)
    expect(getAvailableMemoryPairCounts(fakeManifest(5))).toEqual([])
  })

  it('offers only supported sizes covered by the asset inventory', () => {
    expect(isMemoryReady(fakeManifest(6))).toBe(true)
    expect(getAvailableMemoryPairCounts(fakeManifest(6))).toEqual([6])
    expect(getAvailableMemoryPairCounts(fakeManifest(8))).toEqual([6, 8])
    expect(getAvailableMemoryPairCounts(fakeManifest(11))).toEqual([6, 8, 10])
    expect(getAvailableMemoryPairCounts(fakeManifest(20))).toEqual([6, 8, 10, 12])
    expect(getDefaultMemoryPairCount(fakeManifest(6))).toBe(6)
    expect(getDefaultMemoryPairCount(fakeManifest(12))).toBe(8)
  })

  it('rejects duplicate IDs even if ready is true', () => {
    const manifest = fakeManifest(6)
    manifest.cards[5].id = manifest.cards[0].id
    expect(isMemoryReady(manifest)).toBe(false)
  })
})
