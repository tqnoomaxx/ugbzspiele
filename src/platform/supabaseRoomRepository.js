import { ensureSupabaseSession, getSupabaseClient, hasSupabaseConfig } from './supabaseClient.js'

const onlineRequested = process.env.NEXT_PUBLIC_ROOM_MODE === 'online'
const MAX_CONCURRENT_MUTATION_ATTEMPTS = 12

function normalizeCode(code) {
  return String(code ?? '').replace(/\s/g, '').toUpperCase()
}

function mapError(error, fallback) {
  const message = error?.message || fallback
  if (/password/i.test(message)) return new Error('Das Raumpasswort stimmt nicht.')
  if (/rate_limited/i.test(message)) return new Error('Zu viele Aktionen auf einmal. Bitte warte einen kurzen Moment.')
  if (/immutable|identities/i.test(message)) return new Error('Diese Raumänderung ist aus Sicherheitsgründen nicht erlaubt.')
  if (/revision/i.test(message)) return new Error('Der Raum hat sich geändert. Bitte versuche es erneut.')
  if (/full|max_players/i.test(message)) return new Error('Der Raum ist bereits voll.')
  if (/not found|room_missing/i.test(message)) return new Error('Der Raum wurde nicht gefunden.')
  return new Error(message)
}

function isRetryableMutation(error) {
  return /revision|raum hat sich geändert|zu viele aktionen|rate_limited/i.test(error?.message ?? '')
}

function waitForRetry(attempt) {
  const delay = 25 + attempt * 15 + Math.floor(Math.random() * 40)
  return new Promise((resolve) => setTimeout(resolve, delay))
}

function recoveryKey(sessionKey) {
  return `${sessionKey}:recovery`
}

function readStoredSession(storage, key) {
  if (!storage) return null
  try {
    const session = JSON.parse(storage.getItem(key) ?? 'null')
    return session?.roomCode && session?.playerId ? session : null
  } catch { return null }
}

function readSession(sessionKey) {
  if (typeof window === 'undefined') return null
  return readStoredSession(window.sessionStorage, sessionKey)
    ?? readStoredSession(window.localStorage, recoveryKey(sessionKey))
}

export function hasSupabaseRoomConfig() {
  return onlineRequested && hasSupabaseConfig()
}

export function createSupabaseRoomRepository({ gameKey, summarize, sessionKey }) {
  async function rpc(name, parameters, fallback) {
    await ensureSupabaseSession()
    const { data, error } = await getSupabaseClient().rpc(name, parameters)
    if (error) throw mapError(error, fallback)
    if (data?.__platformError) throw mapError(new Error(data.__platformError), fallback)
    return data
  }

  return {
    mode: 'online',
    isOnline: true,

    async load(code) {
      await ensureSupabaseSession()
      const { data, error } = await getSupabaseClient()
        .from('platform_rooms')
        .select('state')
        .eq('game_key', gameKey)
        .eq('code', normalizeCode(code))
        .maybeSingle()
      if (error) throw mapError(error, 'Der Raum konnte nicht geladen werden.')
      return data?.state ?? null
    },

    async listPublic() {
      await ensureSupabaseSession()
      const { data, error } = await getSupabaseClient()
        .from('platform_public_rooms')
        .select('*')
        .eq('game_key', gameKey)
        .order('updated_at', { ascending: false })
        .limit(30)
      if (error) throw mapError(error, 'Öffentliche Räume konnten nicht geladen werden.')
      return (data ?? []).map((entry) => ({
        code: entry.code,
        name: entry.name,
        status: entry.status,
        playerCount: entry.player_count,
        maxPlayers: entry.max_players,
        language: entry.language,
        passwordProtected: entry.password_protected,
      }))
    },

    async create(room) {
      return rpc('platform_create_room', {
        p_game_key: gameKey,
        p_room_state: room,
        p_password: room.password || null,
      }, 'Der Onlineraum konnte nicht erstellt werden.')
    },

    async join(code, name, { id, password = '' } = {}) {
      const player = {
        id,
        name: String(name ?? '').trim(),
        score: 0,
        isHost: false,
        isDemo: false,
        connected: true,
        joinedAt: new Date().toISOString(),
      }
      return rpc('platform_join_room', {
        p_game_key: gameKey,
        p_code: normalizeCode(code),
        p_player: player,
        p_password: password || null,
      }, 'Der Raum konnte nicht betreten werden.')
    },

    async save(room) {
      try {
        await rpc('platform_update_room', {
          p_game_key: gameKey,
          p_code: normalizeCode(room.code),
          p_expected_revision: Math.max(1, Number(room.revision) - 1),
          p_room_state: room,
        }, 'Der Raum konnte nicht gespeichert werden.')
        return true
      } catch {
        return false
      }
    },

    async mutate(code, mutation) {
      for (let attempt = 0; attempt < MAX_CONCURRENT_MUTATION_ATTEMPTS; attempt += 1) {
        const current = await this.load(code)
        if (!current) throw new Error('Der Raum wurde nicht gefunden.')
        const next = mutation(current)
        if (next === current) return current

        try {
          return await rpc('platform_update_room', {
            p_game_key: gameKey,
            p_code: normalizeCode(code),
            p_expected_revision: current.revision,
            p_room_state: next,
          }, 'Die Raumänderung konnte nicht gespeichert werden.')
        } catch (error) {
          if (!isRetryableMutation(error) || attempt === MAX_CONCURRENT_MUTATION_ATTEMPTS - 1) throw error
          await waitForRetry(attempt)
        }
      }
      throw new Error('Die Raumänderung konnte nicht gespeichert werden.')
    },

    async remove(code) {
      await rpc('platform_close_room', {
        p_game_key: gameKey,
        p_code: normalizeCode(code),
      }, 'Der Raum konnte nicht geschlossen werden.')
      return true
    },

    async leave(code, nextRoom) {
      await rpc('platform_leave_room', {
        p_game_key: gameKey,
        p_code: normalizeCode(code),
        p_expected_revision: Math.max(1, Number(nextRoom.revision) - 1),
        p_room_state: nextRoom,
      }, 'Der Raum konnte nicht verlassen werden.')
      return true
    },

    loadSession() {
      return readSession(sessionKey)
    },

    saveSession(roomCode, playerId) {
      if (typeof window === 'undefined') return false
      const serialized = JSON.stringify({
        gameKey,
        roomCode: normalizeCode(roomCode),
        playerId,
        updatedAt: new Date().toISOString(),
      })
      let saved = false
      try { window.sessionStorage?.setItem(sessionKey, serialized); saved = true } catch { /* Try recovery storage. */ }
      try { window.localStorage?.setItem(recoveryKey(sessionKey), serialized); saved = true } catch { /* Session storage may still work. */ }
      return saved
    },

    clearSession() {
      if (typeof window === 'undefined') return false
      let cleared = false
      try { window.sessionStorage?.removeItem(sessionKey); cleared = true } catch { /* Continue with recovery storage. */ }
      try { window.localStorage?.removeItem(recoveryKey(sessionKey)); cleared = true } catch { /* Session storage may already be clear. */ }
      return cleared
    },

    subscribe(listener) {
      if (typeof window === 'undefined') return () => {}
      let cancelled = false
      let channel = null
      ensureSupabaseSession().then(() => {
        if (cancelled) return
        const subscriptionId = `platform:${gameKey}:${crypto.randomUUID()}`
        channel = getSupabaseClient()
          .channel(subscriptionId)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'platform_rooms',
            filter: `game_key=eq.${gameKey}`,
          }, (payload) => {
            const row = payload.new?.code ? payload.new : payload.old
            listener({ code: row?.code, type: 'room-updated' })
          })
          .subscribe()
      }).catch((error) => listener({ error, type: 'connection-error' }))
      return () => {
        cancelled = true
        if (channel) getSupabaseClient().removeChannel(channel)
      }
    },

    summarize,
  }
}

export function createGameRoomRepository(options) {
  if (!hasSupabaseRoomConfig()) return options.localRepository
  return createSupabaseRoomRepository(options)
}
