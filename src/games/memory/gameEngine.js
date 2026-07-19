export const MEMORY_SCHEMA_VERSION = 2
export const MEMORY_PHASES = Object.freeze({
  LOBBY: 'lobby',
  PLAYING: 'playing',
  RESOLVING: 'resolving',
  COMPLETE: 'complete',
})

export const MEMORY_MIN_PAIR_COUNT = 6
export const MEMORY_MAX_PAIR_COUNT = 15
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function cleanName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 28)
}

function timestamp(now = Date.now()) { return new Date(now).toISOString() }
function isOnlineMemoryGame(game) { return game?.playMode === 'online' }
function randomIndex(length, rng) { return Math.min(length - 1, Math.floor(rng() * length)) }

export function createMemoryId(prefix = 'id') {
  const suffix = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${suffix}`
}

function createRoomCode(rng = Math.random) {
  return Array.from({ length: 5 }, () => ROOM_CODE_ALPHABET[randomIndex(ROOM_CODE_ALPHABET.length, rng)]).join('')
}

function cleanRoomName(value, hostName) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 48) || `${hostName}s Memory-Raum`
}

function touchOnline(game, next, now = Date.now()) {
  if (!isOnlineMemoryGame(game)) return next
  return { ...next, revision: game.revision + 1, updatedAt: timestamp(now) }
}

export function validateMemoryPlayers(names) {
  if (!Array.isArray(names) || names.length < 1 || names.length > 6) {
    return { valid: false, message: 'Memory kann mit 1 bis 6 Personen gespielt werden.' }
  }
  const cleaned = names.map(cleanName)
  if (cleaned.some((name) => !name)) return { valid: false, message: 'Bitte gib jeder Person einen Namen.' }
  if (new Set(cleaned.map((name) => name.toLocaleLowerCase('de-DE'))).size !== cleaned.length) {
    return { valid: false, message: 'Bitte verwende unterschiedliche Namen.' }
  }
  return { valid: true, names: cleaned, message: '' }
}

function browserRandom() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const value = new Uint32Array(1)
    crypto.getRandomValues(value)
    return value[0] / 0x1_0000_0000
  }
  return Math.random()
}

export function shuffleMemoryItems(items, rng = browserRandom) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const random = Number(rng())
    const normalized = Number.isFinite(random) ? Math.max(0, Math.min(0.999999999999, random)) : 0
    const target = Math.floor(normalized * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function validateAssets(assets, pairCount) {
  if (!Number.isInteger(pairCount) || pairCount < MEMORY_MIN_PAIR_COUNT || pairCount > MEMORY_MAX_PAIR_COUNT) throw new Error('Diese Paarzahl ist nicht verfügbar.')
  if (!Array.isArray(assets) || assets.length < pairCount) throw new Error('Für diese Partie fehlen Memory-Motive.')
  if (assets.some((asset) => !asset || typeof asset.id !== 'string' || !asset.id)) throw new Error('Die Memory-Motive sind ungültig.')
  if (new Set(assets.map((asset) => asset.id)).size !== assets.length) throw new Error('Jedes Memory-Motiv muss eindeutig sein.')
}

function createMemoryDeck(assets, pairCount, rng) {
  const selectedAssets = shuffleMemoryItems(assets, rng).slice(0, pairCount)
  return shuffleMemoryItems(selectedAssets.flatMap((asset) => [
    { id: `${asset.id}-a`, pairId: asset.id, assetId: asset.id, status: 'hidden' },
    { id: `${asset.id}-b`, pairId: asset.id, assetId: asset.id, status: 'hidden' },
  ]), rng)
}

export function createMemoryGame(
  { names, pairCount, assets, setId, setLabel, setFingerprint },
  { rng = browserRandom } = {},
) {
  const players = validateMemoryPlayers(names)
  if (!players.valid) throw new Error(players.message)
  validateAssets(assets, pairCount)
  if (typeof setId !== 'string' || !setId || typeof setLabel !== 'string' || !setLabel.trim()) {
    throw new Error('Das Memory-Set ist ungültig.')
  }
  if (typeof setFingerprint !== 'string' || setFingerprint.length !== 64) {
    throw new Error('Der Memory-Set-Fingerabdruck ist ungültig.')
  }

  const deck = createMemoryDeck(assets, pairCount, rng)

  return {
    schemaVersion: MEMORY_SCHEMA_VERSION,
    setId,
    setLabel: setLabel.trim().slice(0, 80),
    setFingerprint,
    players: players.names.map((name, index) => ({ id: `player-${index + 1}`, name, score: 0 })),
    pairCount,
    deck,
    activePlayerIndex: 0,
    flippedCardIds: [],
    matchedPairs: 0,
    turns: 0,
    phase: MEMORY_PHASES.PLAYING,
    pendingMatch: null,
    lastEvent: { type: 'started', playerIndex: 0 },
  }
}

export function createMemoryRoom(
  { hostName, roomName, visibility = 'private', password = '', pairCount, assets, setId, setLabel, setFingerprint },
  { idFactory = createMemoryId, now = Date.now(), rng = Math.random } = {},
) {
  const name = cleanName(hostName)
  if (!name) throw new Error('Bitte gib deinen Namen ein.')
  validateAssets(assets, pairCount)
  if (typeof setId !== 'string' || !setId || typeof setLabel !== 'string' || !setLabel.trim()) throw new Error('Das Memory-Set ist ungültig.')
  if (typeof setFingerprint !== 'string' || setFingerprint.length !== 64) throw new Error('Der Memory-Set-Fingerabdruck ist ungültig.')
  const hostId = idFactory('player')
  const createdAt = timestamp(now)
  return {
    schemaVersion: MEMORY_SCHEMA_VERSION,
    playMode: 'online',
    id: idFactory('memory'),
    code: createRoomCode(rng),
    name: cleanRoomName(roomName, name),
    visibility: visibility === 'public' ? 'public' : 'private',
    password: String(password ?? '').slice(0, 64),
    status: 'lobby',
    hostId,
    options: { maxPlayers: 6, language: 'de', deviceMode: 'separate', setId, setLabel: setLabel.trim().slice(0, 80), setFingerprint, pairCount },
    setId,
    setLabel: setLabel.trim().slice(0, 80),
    setFingerprint,
    players: [{ id: hostId, name, score: 0, isHost: true, isDemo: false, connected: true, joinedAt: createdAt }],
    pairCount,
    deck: [],
    activePlayerIndex: 0,
    flippedCardIds: [],
    matchedPairs: 0,
    turns: 0,
    phase: MEMORY_PHASES.LOBBY,
    pendingMatch: null,
    lastEvent: { type: 'room-created', playerIndex: 0 },
    revision: 1,
    createdAt,
    updatedAt: createdAt,
  }
}

export function startOnlineMemoryGame(game, actorId, assets, { rng = browserRandom, now = Date.now() } = {}) {
  if (!isOnlineMemoryGame(game) || game.phase !== MEMORY_PHASES.LOBBY || game.status !== 'lobby') throw new Error('Dieser Raum kann nicht gestartet werden.')
  if (actorId !== game.hostId) throw new Error('Nur die Raumleitung kann die Partie starten.')
  if (game.players.length < 2) throw new Error('Für den Mehrgeräte-Modus müssen mindestens zwei Personen im Raum sein.')
  validateAssets(assets, game.pairCount)
  const activePlayerIndex = randomIndex(game.players.length, rng)
  return touchOnline(game, {
    ...game,
    status: 'playing',
    players: game.players.map((player) => ({ ...player, score: 0 })),
    deck: createMemoryDeck(assets, game.pairCount, rng),
    activePlayerIndex,
    flippedCardIds: [],
    matchedPairs: 0,
    turns: 0,
    phase: MEMORY_PHASES.PLAYING,
    pendingMatch: null,
    lastEvent: { type: 'started', playerIndex: activePlayerIndex },
  }, now)
}

export function flipMemoryCard(game, cardId, actorId = null, now = Date.now()) {
  if (game.phase !== MEMORY_PHASES.PLAYING || game.flippedCardIds.length >= 2) return game
  if (isOnlineMemoryGame(game) && game.players[game.activePlayerIndex]?.id !== actorId) throw new Error('Du bist noch nicht am Zug.')
  const cardIndex = game.deck.findIndex((card) => card.id === cardId)
  if (cardIndex < 0 || game.deck[cardIndex].status !== 'hidden') return game

  const deck = game.deck.map((card, index) => index === cardIndex ? { ...card, status: 'revealed' } : card)
  const flippedCardIds = [...game.flippedCardIds, cardId]
  if (flippedCardIds.length === 1) {
    return touchOnline(game, { ...game, deck, flippedCardIds, lastEvent: { type: 'first-card', playerIndex: game.activePlayerIndex } }, now)
  }

  const [firstId, secondId] = flippedCardIds
  const first = deck.find((card) => card.id === firstId)
  const second = deck.find((card) => card.id === secondId)
  return touchOnline(game, {
    ...game,
    deck,
    flippedCardIds,
    phase: MEMORY_PHASES.RESOLVING,
    pendingMatch: first.pairId === second.pairId,
    lastEvent: { type: 'cards-revealed', playerIndex: game.activePlayerIndex },
  }, now)
}

export function resolveMemoryTurn(game, now = Date.now()) {
  if (game.phase !== MEMORY_PHASES.RESOLVING || game.flippedCardIds.length !== 2) return game
  const selected = new Set(game.flippedCardIds)
  const isMatch = game.pendingMatch === true
  const deck = game.deck.map((card) => selected.has(card.id)
    ? { ...card, status: isMatch ? 'matched' : 'hidden' }
    : card)
  const players = game.players.map((player, index) => index === game.activePlayerIndex && isMatch
    ? { ...player, score: player.score + 1 }
    : player)
  const matchedPairs = game.matchedPairs + (isMatch ? 1 : 0)
  const complete = matchedPairs === game.pairCount
  const activePlayerIndex = isMatch || complete
    ? game.activePlayerIndex
    : (game.activePlayerIndex + 1) % game.players.length

  return touchOnline(game, {
    ...game,
    status: complete && isOnlineMemoryGame(game) ? 'complete' : game.status,
    deck,
    players,
    activePlayerIndex,
    flippedCardIds: [],
    matchedPairs,
    turns: game.turns + 1,
    phase: complete ? MEMORY_PHASES.COMPLETE : MEMORY_PHASES.PLAYING,
    pendingMatch: null,
    lastEvent: complete
      ? { type: 'complete', playerIndex: game.activePlayerIndex, match: isMatch }
      : { type: isMatch ? 'match' : 'miss', playerIndex: activePlayerIndex, previousPlayerIndex: game.activePlayerIndex },
  }, now)
}

export function getMemoryRanking(game) {
  const sorted = game.players
    .map((player, index) => ({ ...player, playerIndex: index }))
    .sort((first, second) => second.score - first.score || first.playerIndex - second.playerIndex)
  let priorScore = null
  let priorRank = 0
  return sorted.map((player, index) => {
    const rank = player.score === priorScore ? priorRank : index + 1
    priorScore = player.score
    priorRank = rank
    return { ...player, rank, isWinner: rank === 1 }
  })
}

export function describeMemoryStatus(game) {
  const activeName = game.players[game.activePlayerIndex]?.name ?? ''
  if (game.phase === MEMORY_PHASES.COMPLETE) {
    const winners = getMemoryRanking(game).filter((player) => player.isWinner).map((player) => player.name)
    return winners.length > 1 ? `Unentschieden: ${winners.join(' und ')}` : `${winners[0]} gewinnt.`
  }
  if (game.phase === MEMORY_PHASES.RESOLVING) return game.pendingMatch ? 'Paar gefunden.' : 'Kein Paar.'
  if (game.lastEvent?.type === 'match') return `Paar gefunden. ${activeName} ist noch einmal dran.`
  if (game.lastEvent?.type === 'miss') return `Kein Paar. ${activeName} ist dran.`
  return `${activeName} ist dran.`
}

export function getMemoryRoomSummary(game) {
  return {
    code: game.code,
    name: game.name,
    status: game.status,
    visibility: game.visibility,
    passwordProtected: Boolean(game.password),
    playerCount: game.players.length,
    maxPlayers: 6,
    language: 'de',
    updatedAt: game.updatedAt,
  }
}
