import { DOPPELWORT_SCHEMA_VERSION, getRoomSummary } from './gameEngine.js'

const ROOMS_KEY = 'ugbz:doppelwort:rooms:v1'
const SESSION_KEY = 'ugbz:doppelwort:session:v1'
const CHANNEL_NAME = 'ugbz:doppelwort:v1'

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isValidRoom(room) {
  return Boolean(
    room
      && room.schemaVersion === DOPPELWORT_SCHEMA_VERSION
      && typeof room.code === 'string'
      && Array.isArray(room.players)
      && room.options
      && Number.isFinite(room.revision),
  )
}

function readRooms() {
  if (!canUseBrowserStorage()) return {}
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ROOMS_KEY) ?? '{}')
    return Object.fromEntries(
      Object.entries(parsed).filter(([, room]) => isValidRoom(room)),
    )
  } catch {
    return {}
  }
}

function writeRooms(rooms) {
  if (!canUseBrowserStorage()) return false
  try {
    window.localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms))
    return true
  } catch {
    return false
  }
}

function broadcast(code, type = 'room-updated') {
  if (typeof window === 'undefined' || typeof window.BroadcastChannel === 'undefined') return
  const channel = new window.BroadcastChannel(CHANNEL_NAME)
  channel.postMessage({ type, code, sentAt: Date.now() })
  channel.close()
}

export const doppelwortRoomRepository = {
  load(code) {
    if (!code) return null
    return readRooms()[String(code).toUpperCase()] ?? null
  },

  listPublic() {
    return Object.values(readRooms())
      .filter((room) => room.visibility === 'public' && room.status !== 'closed')
      .map(getRoomSummary)
      .sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt))
  },

  save(room) {
    if (!isValidRoom(room)) return false
    const rooms = readRooms()
    const stored = rooms[room.code]
    if (stored && stored.revision > room.revision) return false
    const saved = writeRooms({ ...rooms, [room.code]: room })
    if (saved) broadcast(room.code)
    return saved
  },

  mutate(code, mutation) {
    const room = this.load(code)
    if (!room) throw new Error('Der Raum wurde nicht gefunden.')
    const nextRoom = mutation(room)
    if (nextRoom === room) return room
    if (!this.save(nextRoom)) throw new Error('Die Raumänderung konnte nicht gespeichert werden.')
    return nextRoom
  },

  remove(code) {
    const rooms = readRooms()
    const normalizedCode = String(code ?? '').toUpperCase()
    if (!(normalizedCode in rooms)) return false
    delete rooms[normalizedCode]
    const saved = writeRooms(rooms)
    if (saved) broadcast(normalizedCode, 'room-removed')
    return saved
  },

  loadSession() {
    if (typeof window === 'undefined' || !window.sessionStorage) return null
    try {
      const session = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? 'null')
      if (!session?.roomCode || !session?.playerId) return null
      return session
    } catch {
      return null
    }
  },

  saveSession(roomCode, playerId) {
    if (typeof window === 'undefined' || !window.sessionStorage) return false
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({
        roomCode: String(roomCode).toUpperCase(),
        playerId,
        updatedAt: new Date().toISOString(),
      }))
      return true
    } catch {
      return false
    }
  },

  clearSession() {
    if (typeof window === 'undefined' || !window.sessionStorage) return false
    window.sessionStorage.removeItem(SESSION_KEY)
    return true
  },

  subscribe(listener) {
    if (typeof window === 'undefined') return () => {}

    const handleStorage = (event) => {
      if (event.key === ROOMS_KEY) listener({ type: 'rooms-updated' })
    }
    window.addEventListener('storage', handleStorage)

    let channel = null
    if (typeof window.BroadcastChannel !== 'undefined') {
      channel = new window.BroadcastChannel(CHANNEL_NAME)
      channel.addEventListener('message', ({ data }) => listener(data))
    }

    return () => {
      window.removeEventListener('storage', handleStorage)
      channel?.close()
    }
  },
}
