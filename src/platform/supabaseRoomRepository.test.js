import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.resetModules()
})

function memoryStorage() {
  const entries = new Map()
  return {
    getItem: (key) => entries.get(key) ?? null,
    removeItem: (key) => entries.delete(key),
    setItem: (key, value) => entries.set(key, String(value)),
  }
}

describe('shared game room repository selection', () => {
  it('keeps the supplied local adapter when online mode is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_ROOM_MODE', 'local')
    const { createGameRoomRepository } = await import('./supabaseRoomRepository.js')
    const localRepository = { mode: 'local' }

    expect(createGameRoomRepository({
      gameKey: 'example',
      localRepository,
      sessionKey: 'test',
    })).toBe(localRepository)
  })

  it('provides the reusable online contract when all public settings exist', async () => {
    vi.stubEnv('NEXT_PUBLIC_ROOM_MODE', 'online')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_test')
    const { createGameRoomRepository } = await import('./supabaseRoomRepository.js')

    const repository = createGameRoomRepository({
      gameKey: 'example',
      localRepository: { mode: 'local' },
      sessionKey: 'test',
    })

    expect(repository.isOnline).toBe(true)
    for (const method of ['create', 'join', 'load', 'listPublic', 'mutate', 'leave', 'remove', 'subscribe']) {
      expect(repository[method]).toBeTypeOf('function')
    }
  })

  it('recovers an online identity after the tab session is lost', async () => {
    vi.stubEnv('NEXT_PUBLIC_ROOM_MODE', 'online')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'sb_publishable_test')
    const sessionStorage = memoryStorage()
    const localStorage = memoryStorage()
    vi.stubGlobal('window', { sessionStorage, localStorage })
    const { createGameRoomRepository } = await import('./supabaseRoomRepository.js')
    const repository = createGameRoomRepository({ gameKey: 'example', localRepository: {}, sessionKey: 'ugbz:test' })

    expect(repository.saveSession(' ab c12 ', 'player-1')).toBe(true)
    sessionStorage.removeItem('ugbz:test')
    expect(repository.loadSession()).toMatchObject({ gameKey: 'example', roomCode: 'ABC12', playerId: 'player-1' })

    expect(repository.clearSession()).toBe(true)
    expect(repository.loadSession()).toBeNull()
  })
})
