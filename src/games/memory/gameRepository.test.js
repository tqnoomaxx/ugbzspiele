import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMemoryGame, flipMemoryCard, resolveMemoryTurn } from './gameEngine.js'
import {
  isStableMemoryState,
  MEMORY_STORAGE_KEY,
  memoryGameRepository,
} from './gameRepository.js'

class MemoryStorage {
  constructor() { this.values = new Map() }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null }
  setItem(key, value) { this.values.set(key, String(value)) }
  removeItem(key) { this.values.delete(key) }
}

const manifest = {
  fingerprint: 'b'.repeat(64),
  cards: Array.from({ length: 6 }, (_, index) => ({ id: `motiv-${index + 1}` })),
}

function newGame() {
  return createMemoryGame({
    names: ['Anna', 'Ben'],
    pairCount: 6,
    assets: manifest.cards,
    manifestFingerprint: manifest.fingerprint,
  }, { rng: () => 0.2 })
}

afterEach(() => vi.unstubAllGlobals())

describe('memory repository', () => {
  it('persists resumable turns without saving a single free card', () => {
    const localStorage = new MemoryStorage()
    vi.stubGlobal('window', { localStorage })
    let game = newGame()
    expect(isStableMemoryState(game)).toBe(true)
    expect(memoryGameRepository.save(game, manifest)).toBe(true)
    const stableRaw = localStorage.getItem(MEMORY_STORAGE_KEY)

    const pair = game.deck.filter((card) => card.pairId === game.deck[0].pairId)
    game = flipMemoryCard(game, pair[0].id)
    expect(isStableMemoryState(game)).toBe(false)
    expect(memoryGameRepository.save(game, manifest)).toBe(false)
    expect(localStorage.getItem(MEMORY_STORAGE_KEY)).toBe(stableRaw)

    game = flipMemoryCard(game, pair[1].id)
    expect(isStableMemoryState(game)).toBe(true)
    expect(memoryGameRepository.save(game, manifest)).toBe(true)
    expect(memoryGameRepository.load(manifest).phase).toBe('resolving')
    game = resolveMemoryTurn(game)
    expect(memoryGameRepository.save(game, manifest)).toBe(true)
    expect(memoryGameRepository.load(manifest).matchedPairs).toBe(1)
  })

  it('invalidates a saved game when the manifest fingerprint changes', () => {
    const localStorage = new MemoryStorage()
    vi.stubGlobal('window', { localStorage })
    expect(memoryGameRepository.save(newGame(), manifest)).toBe(true)

    const changedManifest = { ...manifest, fingerprint: 'c'.repeat(64) }
    const inspected = memoryGameRepository.inspect(changedManifest)
    expect(inspected.game).toBeNull()
    expect(inspected.issue).toBe('assets-changed')
    expect(localStorage.getItem(MEMORY_STORAGE_KEY)).toBeNull()
  })

  it('rejects corrupted deck invariants', () => {
    const localStorage = new MemoryStorage()
    vi.stubGlobal('window', { localStorage })
    const game = newGame()
    game.deck[1] = { ...game.deck[0] }
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(game))
    expect(memoryGameRepository.inspect(manifest).issue).toBe('corrupt')
  })
})
