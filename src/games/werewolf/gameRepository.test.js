import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirmWerewolfRole, createWerewolfGame, getCurrentRoleRevealPlayerId } from './gameEngine.js'
import { werewolfRepository } from './gameRepository.js'

const STORAGE_KEY = 'ugbz:werewolf:v1'

function memoryStorage() {
  const entries = new Map()
  return {
    getItem: (key) => entries.get(key) ?? null,
    removeItem: (key) => entries.delete(key),
    setItem: (key, value) => entries.set(key, String(value)),
  }
}

function game() {
  let id = 0
  let state = createWerewolfGame(
    { names: ['Ada', 'Ben', 'Clara', 'David', 'Eva'] },
    { idFactory: (prefix) => `${prefix}-${++id}`, now: 1000, rng: () => 0.999999 },
  )
  state = confirmWerewolfRole(state, getCurrentRoleRevealPlayerId(state), 1100)
  return state
}

afterEach(() => vi.unstubAllGlobals())

describe('local Werwolf repository', () => {
  it('saves and reloads a validated versioned game', () => {
    const localStorage = memoryStorage()
    vi.stubGlobal('window', { localStorage })
    const state = game()

    expect(werewolfRepository.save(state)).toBe(true)
    expect(werewolfRepository.load()).toEqual(state)
    expect(werewolfRepository.inspect()).toEqual({ state, issue: null, raw: null })
    expect(werewolfRepository.clear()).toBe(true)
    expect(werewolfRepository.load()).toBeNull()
  })

  it('reports malformed or structurally invalid saves without loading them', () => {
    const localStorage = memoryStorage()
    vi.stubGlobal('window', { localStorage })
    localStorage.setItem(STORAGE_KEY, '{kaputt')
    expect(werewolfRepository.inspect()).toMatchObject({ state: null, issue: 'corrupt', raw: '{kaputt' })

    const altered = game()
    altered.players[0].alive = false
    localStorage.setItem(STORAGE_KEY, JSON.stringify(altered))
    expect(werewolfRepository.load()).toBeNull()
    expect(werewolfRepository.inspect().issue).toBe('corrupt')
    expect(werewolfRepository.save(altered)).toBe(false)
  })

  it('is inert during server rendering', () => {
    vi.stubGlobal('window', undefined)
    expect(werewolfRepository.load()).toBeNull()
    expect(werewolfRepository.save(game())).toBe(false)
    expect(werewolfRepository.clear()).toBe(false)
  })
})
