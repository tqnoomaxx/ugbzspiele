import {
  addKniffelPlayer,
  applyDiceRoll,
  generateDiceRoll,
  getKniffelRoomSummary,
  KNIFFEL_SCHEMA_VERSION,
} from './gameEngine.js'
import { createGameRoomRepository, hasSupabaseRoomConfig } from '../../platform/supabaseRoomRepository.js'
import { ensureSupabaseSession, getSupabaseClient } from '../../platform/supabaseClient.js'

const ROOMS_KEY = 'ugbz:kniffel:rooms:v1'
const SESSION_KEY = 'ugbz:kniffel:session:v1'
const PENDING_KEY = 'ugbz:kniffel:pending:v1'
const CHANNEL_NAME = 'ugbz:kniffel:v1'

function normalizeCode(code) {
  return String(code ?? '').replace(/\s/g, '').toUpperCase()
}

function canStore() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isValidRoom(room) {
  return Boolean(room
    && room.schemaVersion === KNIFFEL_SCHEMA_VERSION
    && typeof room.code === 'string'
    && Array.isArray(room.players)
    && room.options
    && Number.isFinite(room.revision))
}

function readJson(key, fallback) {
  if (!canStore()) return fallback
  try { return JSON.parse(window.localStorage.getItem(key) ?? JSON.stringify(fallback)) }
  catch { return fallback }
}

function writeJson(key, value) {
  if (!canStore()) return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch { return false }
}

function readRooms() {
  const rooms = readJson(ROOMS_KEY, {})
  return Object.fromEntries(Object.entries(rooms).filter(([, room]) => isValidRoom(room)))
}

function broadcast(code, type = 'room-updated') {
  if (typeof window === 'undefined' || typeof window.BroadcastChannel === 'undefined') return
  const channel = new window.BroadcastChannel(CHANNEL_NAME)
  channel.postMessage({ type, code: normalizeCode(code), sentAt: Date.now() })
  channel.close()
}

function mirrorRoom(room) {
  if (!isValidRoom(room)) return false
  const saved = writeJson(ROOMS_KEY, { ...readRooms(), [normalizeCode(room.code)]: room })
  if (saved) broadcast(room.code)
  return saved
}

function readSession() {
  if (typeof window === 'undefined' || !window.sessionStorage) return null
  try {
    const value = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? 'null')
    return value?.roomCode && value?.playerId ? value : null
  } catch { return null }
}

export const localKniffelRoomRepository = {
  mode: 'local',
  isOnline: false,

  load(code) { return readRooms()[normalizeCode(code)] ?? null },
  listPublic() {
    return Object.values(readRooms())
      .filter((room) => room.visibility === 'public' && room.status === 'lobby')
      .map(getKniffelRoomSummary)
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
  },
  save(room) {
    if (!isValidRoom(room)) return false
    const stored = this.load(room.code)
    if (stored && stored.revision >= room.revision) return false
    return mirrorRoom(room)
  },
  create(room) {
    if (this.load(room.code)) throw new Error('Der Raumcode ist bereits vergeben.')
    if (!mirrorRoom(room)) throw new Error('Der Raum konnte nicht gespeichert werden.')
    return room
  },
  join(code, name, options = {}) {
    const room = this.load(code)
    if (!room) throw new Error('Unter diesem Code wurde in diesem Browser kein Raum gefunden.')
    if (room.password && room.password !== options.password) throw new Error('Das Raumpasswort stimmt nicht.')
    const next = addKniffelPlayer(room, name, options)
    if (!mirrorRoom(next)) throw new Error('Der Raum konnte nicht gespeichert werden.')
    return next
  },
  mutate(code, mutation) {
    const room = this.load(code)
    if (!room) throw new Error('Der Raum wurde nicht gefunden.')
    const next = mutation(room)
    if (next !== room && !mirrorRoom(next)) throw new Error('Die Raumänderung konnte nicht gespeichert werden.')
    return next
  },
  leave(code, nextRoom) { return nextRoom.status === 'closed' ? this.remove(code) : mirrorRoom(nextRoom) },
  remove(code) {
    const rooms = readRooms()
    const key = normalizeCode(code)
    if (!(key in rooms)) return false
    delete rooms[key]
    const saved = writeJson(ROOMS_KEY, rooms)
    if (saved) broadcast(key, 'room-removed')
    return saved
  },
  loadSession: readSession,
  saveSession(roomCode, playerId) {
    if (typeof window === 'undefined' || !window.sessionStorage) return false
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode: normalizeCode(roomCode), playerId, updatedAt: new Date().toISOString() }))
      return true
    } catch { return false }
  },
  clearSession() {
    if (typeof window === 'undefined' || !window.sessionStorage) return false
    window.sessionStorage.removeItem(SESSION_KEY)
    return true
  },
  subscribe(listener) {
    if (typeof window === 'undefined') return () => {}
    const handleStorage = (event) => { if ([ROOMS_KEY, PENDING_KEY].includes(event.key)) listener({ type: 'rooms-updated' }) }
    window.addEventListener('storage', handleStorage)
    const channel = typeof window.BroadcastChannel !== 'undefined' ? new window.BroadcastChannel(CHANNEL_NAME) : null
    channel?.addEventListener('message', ({ data }) => listener(data))
    return () => { window.removeEventListener('storage', handleStorage); channel?.close() }
  },
  summarize: getKniffelRoomSummary,
}

const baseRepository = createGameRoomRepository({
  gameKey: 'kniffel',
  localRepository: localKniffelRoomRepository,
  summarize: getKniffelRoomSummary,
  sessionKey: SESSION_KEY,
})

const syncListeners = new Set()
let syncState = 'saved'

function setSyncState(next) {
  syncState = next
  syncListeners.forEach((listener) => listener(next))
}

function pendingRooms() { return readJson(PENDING_KEY, {}) }
function setPending(room, needsCreate = false) {
  writeJson(PENDING_KEY, { ...pendingRooms(), [room.code]: { room, needsCreate } })
  setSyncState('local')
}
function clearPending(code) {
  const pending = pendingRooms()
  delete pending[normalizeCode(code)]
  writeJson(PENDING_KEY, pending)
}

async function mirrorOnline(action) {
  setSyncState('syncing')
  const room = await action()
  if (room) mirrorRoom(room)
  if (room?.code) clearPending(room.code)
  setSyncState('saved')
  return room
}

async function runWithSharedFallback(code, onlineAction, localAction) {
  try { return await mirrorOnline(onlineAction) }
  catch (error) {
    const cached = localKniffelRoomRepository.load(code)
    if (cached?.options.deviceMode !== 'shared') throw error
    const room = await localAction()
    setPending(room, false)
    return room
  }
}

async function rollOnline(code) {
  await ensureSupabaseSession()
  const cached = localKniffelRoomRepository.load(code)
  const { data, error } = await getSupabaseClient().rpc('platform_roll_kniffel_dice', {
    p_code: normalizeCode(code),
    p_expected_revision: cached?.revision ?? 0,
  })
  if (error) throw new Error(error.message || 'Die Würfel konnten nicht geworfen werden.')
  if (data?.__platformError) throw new Error(data.__platformError)
  return data
}

export const kniffelRoomRepository = {
  mode: baseRepository.mode,
  isOnline: baseRepository.isOnline,
  hasCloud: hasSupabaseRoomConfig(),

  async load(code) {
    if (!baseRepository.isOnline) return baseRepository.load(code)
    try {
      const room = await mirrorOnline(() => baseRepository.load(code))
      if (room) await this.flushPending(code)
      return room ?? localKniffelRoomRepository.load(code)
    } catch {
      const cached = localKniffelRoomRepository.load(code)
      if (cached) setSyncState('local')
      return cached
    }
  },
  async listPublic() { return baseRepository.listPublic() },
  async create(room) {
    if (!baseRepository.isOnline) return baseRepository.create(room)
    try { return await mirrorOnline(() => baseRepository.create(room)) }
    catch (error) {
      if (room.options.deviceMode !== 'shared') throw error
      const saved = localKniffelRoomRepository.create(room)
      setPending(saved, true)
      return saved
    }
  },
  async join(...args) { return mirrorOnline(() => baseRepository.join(...args)) },
  async mutate(code, mutation) {
    if (!baseRepository.isOnline) return baseRepository.mutate(code, mutation)
    return runWithSharedFallback(code, () => baseRepository.mutate(code, mutation), () => localKniffelRoomRepository.mutate(code, mutation))
  },
  async rollDice(code, actorId) {
    if (!baseRepository.isOnline) return baseRepository.mutate(code, (room) => applyDiceRoll(room, actorId, generateDiceRoll()))
    return runWithSharedFallback(code, () => rollOnline(code), () => localKniffelRoomRepository.mutate(code, (room) => applyDiceRoll(room, actorId, generateDiceRoll())))
  },
  async flushPending(code) {
    if (!baseRepository.isOnline) return false
    const entry = pendingRooms()[normalizeCode(code)]
    if (!entry) return true
    try {
      const room = entry.needsCreate
        ? await baseRepository.create(entry.room)
        : await baseRepository.mutate(code, () => entry.room)
      mirrorRoom(room)
      clearPending(code)
      setSyncState('saved')
      return true
    } catch { setSyncState('local'); return false }
  },
  async leave(...args) { return baseRepository.leave(...args) },
  async remove(...args) { return baseRepository.remove(...args) },
  loadSession: () => baseRepository.loadSession(),
  saveSession: (...args) => baseRepository.saveSession(...args),
  clearSession: () => baseRepository.clearSession(),
  subscribe(listener) {
    const stopBase = baseRepository.subscribe(listener)
    const stopLocal = baseRepository === localKniffelRoomRepository ? () => {} : localKniffelRoomRepository.subscribe(listener)
    return () => { stopBase(); stopLocal() }
  },
  getSyncState: () => syncState,
  subscribeSync(listener) { syncListeners.add(listener); listener(syncState); return () => syncListeners.delete(listener) },
  summarize: getKniffelRoomSummary,
}
