import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLocalGameRepository } from './localGameRepository.js'

function storage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('local game repository revision protection', () => {
  it('rejects stale writes to the same game but permits an explicit new game id', () => {
    vi.stubGlobal('window', { localStorage: storage() })
    const repository = createLocalGameRepository({
      storageKey: 'test:revision',
      protectRevision: true,
      validate: (state) => Boolean(state?.id && Number.isInteger(state.revision)),
    })
    expect(repository.save({ id: 'a', revision: 1 })).toBe(true)
    expect(repository.save({ id: 'a', revision: 2 })).toBe(true)
    expect(repository.save({ id: 'a', revision: 2 })).toBe(false)
    expect(repository.save({ id: 'a', revision: 1 })).toBe(false)
    expect(repository.save({ id: 'b', revision: 1 })).toBe(true)
  })
})
