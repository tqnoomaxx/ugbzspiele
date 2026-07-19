import { afterEach, describe, expect, it, vi } from 'vitest'
import { createKniffelRoom, startKniffelGame } from './gameEngine.js'
import { createKniffelBackup, localKniffelRoomRepository, parseKniffelBackup } from './roomRepository.js'

afterEach(() => vi.unstubAllGlobals())

function memoryStorage() {
  const entries = new Map()
  return {
    getItem: (key) => entries.get(key) ?? null,
    removeItem: (key) => entries.delete(key),
    setItem: (key, value) => entries.set(key, String(value)),
  }
}

function room() {
  const ids = ['player-host', 'room-backup']
  return createKniffelRoom(
    { hostName: 'Ada', roomName: 'Sicherung', options: { playMode: 'digital', deviceMode: 'shared' } },
    { idFactory: () => ids.shift(), now: 1000, rng: () => 0 },
  )
}

describe('Kniffel backups', () => {
  it('creates and validates a versioned host backup', () => {
    const game = startKniffelGame(room(), 'player-host', 2000)
    const backup = createKniffelBackup(game, 'player-host')
    const restored = parseKniffelBackup(JSON.stringify(backup))

    expect(backup).toMatchObject({ format: 'ugbz-kniffel-backup', version: 1, actorId: 'player-host' })
    expect(restored.room).toMatchObject({ code: game.code, status: 'playing', password: '' })
  })

  it('rejects malformed or guest-authored backups', () => {
    const game = room()
    expect(() => createKniffelBackup(game, 'guest')).toThrow('Spielleitung')
    expect(() => parseKniffelBackup('{kaputt')).toThrow('gültiges JSON')
    expect(() => parseKniffelBackup({ format: 'ugbz-kniffel-backup', version: 1, actorId: 'guest', room: game })).toThrow('verändert')
  })

  it('keeps a shared local table recoverable after its tab closes', () => {
    const sessionStorage = memoryStorage()
    const localStorage = memoryStorage()
    vi.stubGlobal('window', { sessionStorage, localStorage })

    expect(localKniffelRoomRepository.saveSession('abcde', 'player-host')).toBe(true)
    sessionStorage.removeItem('ugbz:kniffel:session:v1')
    expect(localKniffelRoomRepository.loadSession()).toMatchObject({ roomCode: 'ABCDE', playerId: 'player-host' })
    expect(localKniffelRoomRepository.clearSession()).toBe(true)
    expect(localKniffelRoomRepository.loadSession()).toBeNull()
  })
})
