import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

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
})
