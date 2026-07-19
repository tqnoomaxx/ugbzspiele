import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGame } from './gameEngine.js'
import { gameRepository } from './gameRepository.js'

class MemoryStorage {
  constructor() {
    this.values = new Map()
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null
  }

  removeItem(key) {
    this.values.delete(key)
  }

  setItem(key, value) {
    this.values.set(key, String(value))
  }
}

describe('card game repository recovery', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { localStorage: new MemoryStorage() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('round-trips a complete valid game schema', () => {
    const game = createGame({ names: ['Ada', 'Ben'], deckSize: 32, mode: 'one' })
    expect(gameRepository.save(game)).toBe(true)
    expect(gameRepository.inspect()).toMatchObject({ issue: null, game: { players: [{ name: 'Ada' }, { name: 'Ben' }] } })
  })

  it('quarantines a structurally incomplete save instead of loading it', () => {
    window.localStorage.setItem('ugbz:card-game:v1', JSON.stringify({
      schemaVersion: 1,
      players: [{ id: 'broken', name: 'Defekt' }],
      rounds: [1],
      scores: [0],
      history: [],
    }))

    const inspection = gameRepository.inspect()
    expect(inspection.game).toBeNull()
    expect(inspection.issue).toBe('corrupt')
    expect(inspection.raw).toContain('Defekt')
  })

  it('keeps malformed JSON downloadable and can remove it safely', () => {
    window.localStorage.setItem('ugbz:card-game:v1', '{kaputt')
    expect(gameRepository.inspect()).toMatchObject({ game: null, issue: 'corrupt', raw: '{kaputt' })
    expect(gameRepository.clear()).toBe(true)
    expect(gameRepository.inspect()).toEqual({ game: null, issue: null, raw: null })
  })
})
