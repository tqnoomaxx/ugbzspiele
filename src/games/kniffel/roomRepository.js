import {
  addKniffelPlayer,
  applyDiceRoll,
  generateDiceRoll,
  getKniffelRoomSummary,
  KNIFFEL_CATEGORIES,
  KNIFFEL_SCHEMA_VERSION,
} from './gameEngine.js'
import { createGameRoomRepository, hasSupabaseRoomConfig } from '../../platform/supabaseRoomRepository.js'
import { ensureSupabaseSession, getSupabaseClient } from '../../platform/supabaseClient.js'

const ROOMS_KEY = 'ugbz:kniffel:rooms:v1'
const SESSION_KEY = 'ugbz:kniffel:session:v1'
const PENDING_KEY = 'ugbz:kniffel:pending:v1'
const CHANNEL_NAME = 'ugbz:kniffel:v1'
const SESSION_RECOVERY_KEY = `${SESSION_KEY}:recovery`
const BACKUP_FORMAT = 'ugbz-kniffel-backup'
const BACKUP_VERSION = 1

function normalizeCode(code) {
  return String(code ?? '').replace(/\s/g, '').toUpperCase()
}

function canStore() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isValidScoreSheet(sheet) {
  return Boolean(sheet
    && sheet.scores
    && KNIFFEL_CATEGORIES.every(({ id }) => sheet.scores[id] === null
      || (Number.isInteger(sheet.scores[id]) && sheet.scores[id] >= 0 && sheet.scores[id] <= 5000))
    && Number.isInteger(sheet.kniffelBonus)
    && sheet.kniffelBonus >= 0
    && sheet.kniffelBonus <= 5000)
}

export function isValidKniffelRoom(room) {
  if (!room || room.schemaVersion !== KNIFFEL_SCHEMA_VERSION || typeof room.id !== 'string' || !room.id) return false
  if (typeof room.code !== 'string' || !/^[A-HJ-NP-Z2-9]{4,6}$/.test(room.code)) return false
  if (!['lobby', 'playing', 'complete'].includes(room.status) || !['private', 'public'].includes(room.visibility)) return false
  if (!Number.isInteger(room.revision) || room.revision < 1 || !room.options) return false
  if (!['digital', 'scorepad'].includes(room.options.playMode) || !['shared', 'separate'].includes(room.options.deviceMode)) return false
  if (room.options.playMode === 'scorepad' && room.options.deviceMode !== 'shared') return false
  if (!Array.isArray(room.players) || room.players.length < 1) return false
  if (room.players.some((player) => !player || typeof player.id !== 'string' || !player.id || typeof player.name !== 'string' || !player.name.trim())) return false
  const playerIds = room.players.map((player) => player.id)
  if (new Set(playerIds).size !== playerIds.length || !playerIds.includes(room.hostId)) return false
  if (room.status === 'lobby') return room.game === null

  const game = room.game
  if (!game || !['turn', 'complete'].includes(game.phase) || !playerIds.includes(game.activePlayerId)) return false
  if (!Number.isInteger(game.activePlayerIndex) || game.activePlayerIndex < 0 || game.activePlayerIndex >= room.players.length) return false
  if (room.players[game.activePlayerIndex]?.id !== game.activePlayerId) return false
  if (!Number.isInteger(game.turnIndex) || game.turnIndex < 0 || game.turnIndex > room.players.length * KNIFFEL_CATEGORIES.length) return false
  if (!Number.isInteger(game.roundNumber) || game.roundNumber < 1 || game.roundNumber > KNIFFEL_CATEGORIES.length) return false
  if (!Array.isArray(game.dice) || game.dice.length !== 5 || game.dice.some((die) => die !== null && (!Number.isInteger(die) || die < 1 || die > 6))) return false
  if (!Array.isArray(game.held) || game.held.length !== 5 || game.held.some((held) => typeof held !== 'boolean')) return false
  if (!Number.isInteger(game.rollCount) || game.rollCount < 0 || game.rollCount > 3 || !Array.isArray(game.history)) return false
  if (game.history.length > room.players.length * KNIFFEL_CATEGORIES.length) return false
  if (!game.sheets || playerIds.some((id) => !isValidScoreSheet(game.sheets[id]))) return false
  if (room.status === 'complete') {
    return game.phase === 'complete'
      && playerIds.every((id) => KNIFFEL_CATEGORIES.every(({ id: categoryId }) => game.sheets[id].scores[categoryId] !== null))
  }
  return game.phase === 'turn'
}

export function createKniffelBackup(room, actorId) {
  if (!isValidKniffelRoom(room) || actorId !== room.hostId) throw new Error('Nur die Spielleitung kann eine gültige Sicherung erstellen.')
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    actorId,
    room: { ...room, password: '' },
  }
}

export function parseKniffelBackup(value) {
  let backup
  try { backup = typeof value === 'string' ? JSON.parse(value) : value }
  catch { throw new Error('Die Sicherungsdatei enthält kein gültiges JSON.') }
  if (!backup || backup.format !== BACKUP_FORMAT || backup.version !== BACKUP_VERSION) {
    throw new Error('Diese Datei ist keine unterstützte UGBZ-Kniffel-Sicherung.')
  }
  if (!isValidKniffelRoom(backup.room) || backup.actorId !== backup.room.hostId) {
    throw new Error('Die Sicherung ist unvollständig oder wurde verändert.')
  }
  return { actorId: backup.actorId, room: { ...backup.room, password: '' } }
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
  return Object.fromEntries(Object.entries(rooms).filter(([, room]) => isValidKniffelRoom(room)))
}

function broadcast(code, type = 'room-updated') {
  if (typeof window === 'undefined' || typeof window.BroadcastChannel === 'undefined') return
  const channel = new window.BroadcastChannel(CHANNEL_NAME)
  channel.postMessage({ type, code: normalizeCode(code), sentAt: Date.now() })
  channel.close()
}

function mirrorRoom(room, { notify = true } = {}) {
  if (!isValidKniffelRoom(room)) return false
  const saved = writeJson(ROOMS_KEY, { ...readRooms(), [normalizeCode(room.code)]: room })
  if (saved && notify) broadcast(room.code)
  return saved
}

function readSession() {
  if (typeof window === 'undefined') return null
  try {
    const value = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) ?? 'null')
    if (value?.roomCode && value?.playerId) return value
  } catch { /* Try the durable shared-table recovery. */ }
  try {
    const recovery = JSON.parse(window.localStorage.getItem(SESSION_RECOVERY_KEY) ?? 'null')
    return recovery?.roomCode && recovery?.playerId ? recovery : null
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
    if (!isValidKniffelRoom(room)) return false
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
    if (typeof window === 'undefined') return false
    const serialized = JSON.stringify({ roomCode: normalizeCode(roomCode), playerId, updatedAt: new Date().toISOString() })
    let saved = false
    try { window.sessionStorage.setItem(SESSION_KEY, serialized); saved = true } catch { /* Continue with durable recovery. */ }
    try { window.localStorage.setItem(SESSION_RECOVERY_KEY, serialized); saved = true } catch { /* Session storage may still work. */ }
    return saved
  },
  clearSession() {
    if (typeof window === 'undefined') return false
    let cleared = false
    try { window.sessionStorage.removeItem(SESSION_KEY); cleared = true } catch { /* Continue. */ }
    try { window.localStorage.removeItem(SESSION_RECOVERY_KEY); cleared = true } catch { /* Session may still be clear. */ }
    return cleared
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
  if (room) mirrorRoom(room, { notify: false })
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
  async restoreBackup(value) {
    const { actorId, room } = parseKniffelBackup(value)
    const existing = await this.load(room.code)
    if (existing) {
      if (existing.id !== room.id) throw new Error('Der Raumcode dieser Sicherung gehört inzwischen zu einem anderen Tisch.')
      if (!this.saveSession(existing.code, actorId)) throw new Error('Die wiederhergestellte Sitzung konnte nicht gespeichert werden.')
      return existing
    }

    let restored
    if (!baseRepository.isOnline) {
      restored = baseRepository.create(room)
    } else {
      try { restored = await mirrorOnline(() => baseRepository.create(room)) }
      catch (error) {
        if (room.options.deviceMode !== 'shared') throw error
        restored = localKniffelRoomRepository.create(room)
        setPending(restored, true)
      }
    }
    if (!this.saveSession(restored.code, actorId)) throw new Error('Die wiederhergestellte Sitzung konnte nicht gespeichert werden.')
    return restored
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
      mirrorRoom(room, { notify: false })
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
