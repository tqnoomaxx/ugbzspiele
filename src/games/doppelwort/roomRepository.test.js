import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoom } from './gameEngine.js'
import { localDoppelwortRoomRepository as doppelwortRoomRepository } from './roomRepository.js'

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

describe('Doppelwort local room repository', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      addEventListener() {},
      localStorage: new MemoryStorage(),
      removeEventListener() {},
      sessionStorage: new MemoryStorage(),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows public lobbies but hides rooms once a game is running', () => {
    const room = createRoom({ hostName: 'Ada', options: { visibility: 'public' } })
    expect(doppelwortRoomRepository.save(room)).toBe(true)
    expect(doppelwortRoomRepository.listPublic()).toHaveLength(1)

    const runningRoom = { ...room, revision: room.revision + 1, status: 'playing' }
    expect(doppelwortRoomRepository.save(runningRoom)).toBe(true)
    expect(doppelwortRoomRepository.listPublic()).toHaveLength(0)
  })

  it('rejects stale and equal revisions while accepting the next revision', () => {
    const room = createRoom({ hostName: 'Ada' })
    expect(doppelwortRoomRepository.save(room)).toBe(true)
    expect(doppelwortRoomRepository.save(room)).toBe(false)
    expect(doppelwortRoomRepository.save({ ...room, revision: room.revision - 1 })).toBe(false)
    expect(doppelwortRoomRepository.save({ ...room, revision: room.revision + 1 })).toBe(true)
  })

  it('round-trips and clears the tab session safely', () => {
    expect(doppelwortRoomRepository.saveSession('abcde', 'player-1')).toBe(true)
    expect(doppelwortRoomRepository.loadSession()).toMatchObject({ roomCode: 'ABCDE', playerId: 'player-1' })
    expect(doppelwortRoomRepository.clearSession()).toBe(true)
    expect(doppelwortRoomRepository.loadSession()).toBeNull()
  })

  it('uses the same semantic create and join contract as the online adapter', () => {
    const room = createRoom({ hostName: 'Ada', password: 'salon' })
    expect(doppelwortRoomRepository.create(room)).toEqual(room)

    const joined = doppelwortRoomRepository.join(room.code, 'Grace', {
      id: 'player-grace',
      password: 'salon',
    })

    expect(joined.players.map((player) => player.name)).toEqual(['Ada', 'Grace'])
    expect(doppelwortRoomRepository.load(room.code).revision).toBe(joined.revision)
  })
})
