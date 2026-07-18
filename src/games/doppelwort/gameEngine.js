import { DEFAULT_DOPPELWORT_OPTIONS, MAX_PLAYERS, MIN_PLAYERS } from './defaults.js'
import { getWordPairs } from './wordPairs.js'

export const DOPPELWORT_SCHEMA_VERSION = 1

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function clampInteger(value, minimum, maximum, fallback) {
  const number = Number.parseInt(value, 10)
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback
}

function timestamp(now = Date.now()) {
  return new Date(now).toISOString()
}

function randomIndex(length, rng) {
  return Math.min(length - 1, Math.floor(rng() * length))
}

function shuffle(values, rng) {
  const result = [...values]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, rng)
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

function touch(room, now = Date.now()) {
  return {
    ...room,
    revision: (room.revision ?? 0) + 1,
    updatedAt: timestamp(now),
  }
}

function requireRoomPhase(room, ...phases) {
  if (!phases.includes(room.game?.phase)) {
    throw new Error('Diese Aktion ist in der aktuellen Spielphase nicht möglich.')
  }
}

function requireHost(room, actorId) {
  if (room.hostId !== actorId) throw new Error('Nur die Spielleitung darf das ausführen.')
}

function activeRoundPlayers(room) {
  const ids = new Set(room.game?.playerIds ?? [])
  return room.players.filter((player) => ids.has(player.id))
}

export function createDoppelwortId(prefix = 'id') {
  const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${randomPart}`
}

export function createRoomCode(rng = Math.random, length = 5) {
  return Array.from(
    { length: clampInteger(length, 4, 6, 5) },
    () => ROOM_CODE_ALPHABET[randomIndex(ROOM_CODE_ALPHABET.length, rng)],
  ).join('')
}

export function sanitizePlayerName(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 28)
}

export function normalizeOptions(options = {}) {
  const merged = { ...DEFAULT_DOPPELWORT_OPTIONS, ...options }
  const maxPlayers = clampInteger(merged.maxPlayers, MIN_PLAYERS, MAX_PLAYERS, 8)

  return {
    imposterCount: clampInteger(merged.imposterCount, 1, Math.max(1, maxPlayers - 1), 1),
    category: typeof merged.category === 'string' ? merged.category : 'all',
    language: merged.language === 'en' ? 'en' : 'de',
    speakingSeconds: clampInteger(merged.speakingSeconds, 10, 180, 30),
    meetingSeconds: clampInteger(merged.meetingSeconds, 0, 300, 45),
    votingSeconds: clampInteger(merged.votingSeconds, 15, 300, 45),
    skipAllowed: Boolean(merged.skipAllowed),
    hintsEnabled: Boolean(merged.hintsEnabled),
    visibility: merged.visibility === 'public' ? 'public' : 'private',
    passwordEnabled: Boolean(merged.passwordEnabled),
    maxPlayers,
    autoNextRound: Boolean(merged.autoNextRound),
    randomHostOnLeave: Boolean(merged.randomHostOnLeave),
    spectatorsAllowed: Boolean(merged.spectatorsAllowed),
    roundCount: clampInteger(merged.roundCount, 1, 20, 3),
    pointsEnabled: Boolean(merged.pointsEnabled),
    autoWordRotation: Boolean(merged.autoWordRotation),
  }
}

export function createRoom(
  { roomName, hostName, options, password = '' },
  { rng = Math.random, now = Date.now(), idFactory = createDoppelwortId } = {},
) {
  const cleanHostName = sanitizePlayerName(hostName)
  if (!cleanHostName) throw new Error('Bitte gib der Spielleitung einen Namen.')

  const cleanRoomName = String(roomName ?? '').replace(/\s+/g, ' ').trim().slice(0, 48)
  const normalizedOptions = normalizeOptions(options)
  const hostId = idFactory('player')
  const createdAt = timestamp(now)

  return {
    schemaVersion: DOPPELWORT_SCHEMA_VERSION,
    id: idFactory('room'),
    code: createRoomCode(rng),
    name: cleanRoomName || `${cleanHostName}s Runde`,
    visibility: normalizedOptions.visibility,
    password: normalizedOptions.passwordEnabled ? String(password).slice(0, 64) : '',
    status: 'lobby',
    hostId,
    players: [{
      id: hostId,
      name: cleanHostName,
      isHost: true,
      connected: true,
      isDemo: false,
      score: 0,
      joinedAt: createdAt,
    }],
    spectators: [],
    bannedNames: [],
    options: normalizedOptions,
    usedPairIds: [],
    game: null,
    revision: 1,
    createdAt,
    updatedAt: createdAt,
  }
}

export function addPlayer(
  room,
  name,
  { id = createDoppelwortId('player'), isDemo = false, now = Date.now() } = {},
) {
  if (room.status !== 'lobby') throw new Error('Die Runde läuft bereits.')
  if (room.players.length >= room.options.maxPlayers) throw new Error('Der Raum ist voll.')

  const cleanName = sanitizePlayerName(name)
  if (!cleanName) throw new Error('Bitte gib einen Namen ein.')
  const normalizedName = cleanName.toLocaleLowerCase('de-DE')

  if (room.bannedNames?.includes(normalizedName)) throw new Error('Dieser Name ist in diesem Raum gesperrt.')
  if (room.players.some((player) => player.name.toLocaleLowerCase('de-DE') === normalizedName)) {
    throw new Error('Dieser Name ist bereits im Raum.')
  }

  return touch({
    ...room,
    players: [...room.players, {
      id,
      name: cleanName,
      isHost: false,
      connected: true,
      isDemo: Boolean(isDemo),
      score: 0,
      joinedAt: timestamp(now),
    }],
  }, now)
}

export function setPlayerConnected(room, playerId, connected, now = Date.now()) {
  if (!room.players.some((player) => player.id === playerId)) return room
  return touch({
    ...room,
    players: room.players.map((player) => (
      player.id === playerId ? { ...player, connected: Boolean(connected) } : player
    )),
  }, now)
}

export function removePlayer(
  room,
  playerId,
  { actorId = playerId, ban = false, rng = Math.random, now = Date.now() } = {},
) {
  const target = room.players.find((player) => player.id === playerId)
  if (!target) return room
  if (actorId !== playerId && actorId !== room.hostId) throw new Error('Keine Berechtigung.')
  if (room.status !== 'lobby' && actorId !== room.hostId) {
    return setPlayerConnected(room, playerId, false, now)
  }

  const players = room.players.filter((player) => player.id !== playerId)
  if (players.length === 0) return touch({ ...room, players, hostId: null, status: 'closed' }, now)

  let nextHostId = room.hostId
  if (playerId === room.hostId) {
    const candidates = room.options.randomHostOnLeave ? shuffle(players, rng) : players
    nextHostId = candidates[0].id
  }

  return touch({
    ...room,
    hostId: nextHostId,
    players: players.map((player) => ({ ...player, isHost: player.id === nextHostId })),
    bannedNames: ban
      ? [...new Set([...(room.bannedNames ?? []), target.name.toLocaleLowerCase('de-DE')])]
      : room.bannedNames,
  }, now)
}

function choosePair(room, rng) {
  const pairs = getWordPairs(room.options.language, room.options.category)
  if (pairs.length === 0) throw new Error('Für diese Auswahl sind keine Wortpaare verfügbar.')

  const unusedPairs = pairs.filter((pair) => !room.usedPairIds.includes(pair.id))
  const pool = room.options.autoWordRotation && unusedPairs.length > 0 ? unusedPairs : pairs
  return pool[randomIndex(pool.length, rng)]
}

function buildRound(room, roundNumber, rng, now) {
  const eligiblePlayers = room.players.filter((player) => player.connected || player.isDemo)
  if (eligiblePlayers.length < MIN_PLAYERS) {
    throw new Error(`Mindestens ${MIN_PLAYERS} verbundene Spieler werden benötigt.`)
  }
  if (room.options.imposterCount >= eligiblePlayers.length) {
    throw new Error('Es muss mindestens eine Crew-Person geben.')
  }

  const pair = choosePair(room, rng)
  const playerIds = eligiblePlayers.map((player) => player.id)
  const roleOrder = shuffle(playerIds, rng)
  const imposterIds = roleOrder.slice(0, room.options.imposterCount)
  const assignments = Object.fromEntries(
    playerIds.map((playerId) => [playerId, imposterIds.includes(playerId) ? 'imposter' : 'crew']),
  )
  const revealOrder = shuffle(playerIds, rng)

  return {
    roundNumber,
    phase: 'reveal',
    phaseStartedAt: timestamp(now),
    phaseEndsAt: null,
    pairId: pair.id,
    category: pair.category,
    categoryLabel: pair.categoryLabel,
    crewWord: pair.crew,
    imposterWord: pair.imposter,
    hint: room.options.hintsEnabled ? pair.hint : null,
    assignments,
    playerIds,
    imposterIds,
    revealOrder,
    revealedPlayerIds: [],
    currentRevealIndex: 0,
    speakingOrder: shuffle(playerIds, rng),
    currentSpeakerIndex: 0,
    votes: {},
    result: null,
  }
}

export function startGame(room, actorId, { rng = Math.random, now = Date.now() } = {}) {
  requireHost(room, actorId)
  if (room.status !== 'lobby') throw new Error('Das Spiel wurde bereits gestartet.')
  const game = buildRound(room, 1, rng, now)

  return touch({
    ...room,
    status: 'playing',
    usedPairIds: [...room.usedPairIds, game.pairId],
    game,
  }, now)
}

export function getCurrentRevealPlayerId(room) {
  return room.game?.revealOrder?.[room.game.currentRevealIndex] ?? null
}

export function getCurrentSpeakerId(room) {
  return room.game?.speakingOrder?.[room.game.currentSpeakerIndex] ?? null
}

export function markPlayerRevealed(room, playerId, now = Date.now()) {
  requireRoomPhase(room, 'reveal')
  if (getCurrentRevealPlayerId(room) !== playerId) throw new Error('Diese Rollenkarte ist noch nicht an der Reihe.')

  const revealedPlayerIds = [...room.game.revealedPlayerIds, playerId]
  const allRevealed = revealedPlayerIds.length === room.game.revealOrder.length
  const game = {
    ...room.game,
    revealedPlayerIds,
    currentRevealIndex: allRevealed ? room.game.currentRevealIndex : room.game.currentRevealIndex + 1,
    phase: allRevealed ? 'speaking' : 'reveal',
    phaseStartedAt: allRevealed ? timestamp(now) : room.game.phaseStartedAt,
    phaseEndsAt: allRevealed ? timestamp(now + room.options.speakingSeconds * 1000) : null,
  }

  return touch({ ...room, game }, now)
}

export function finishSpeakingTurn(room, actorId, now = Date.now()) {
  requireRoomPhase(room, 'speaking')
  const speakerId = getCurrentSpeakerId(room)
  if (actorId !== speakerId && actorId !== room.hostId) throw new Error('Nur die aktive Person oder Spielleitung darf fortfahren.')

  const nextIndex = room.game.currentSpeakerIndex + 1
  const finished = nextIndex >= room.game.speakingOrder.length
  const meetingEndsAt = room.options.meetingSeconds > 0
    ? timestamp(now + room.options.meetingSeconds * 1000)
    : null
  const game = {
    ...room.game,
    currentSpeakerIndex: finished ? room.game.currentSpeakerIndex : nextIndex,
    phase: finished ? 'meeting' : 'speaking',
    phaseStartedAt: timestamp(now),
    phaseEndsAt: finished
      ? meetingEndsAt
      : timestamp(now + room.options.speakingSeconds * 1000),
  }

  return touch({ ...room, game }, now)
}

export function beginVoting(room, actorId, now = Date.now()) {
  requireRoomPhase(room, 'meeting')
  requireHost(room, actorId)

  return touch({
    ...room,
    game: {
      ...room.game,
      phase: 'voting',
      phaseStartedAt: timestamp(now),
      phaseEndsAt: timestamp(now + room.options.votingSeconds * 1000),
      votes: {},
    },
  }, now)
}

function calculateResult(room, votes, now) {
  const players = activeRoundPlayers(room)
  const playerIds = players.map((player) => player.id)
  const voteCounts = Object.fromEntries(playerIds.map((playerId) => [playerId, 0]))

  Object.values(votes).forEach((targets) => {
    targets.forEach((targetId) => {
      if (targetId in voteCounts) voteCounts[targetId] += 1
    })
  })

  const majority = players.length / 2
  const detectedIds = playerIds.filter((playerId) => voteCounts[playerId] > majority)
  const detectedImposterIds = room.game.imposterIds.filter((playerId) => detectedIds.includes(playerId))
  const falsePositiveIds = detectedIds.filter((playerId) => room.game.assignments[playerId] === 'crew')
  const crewWon = detectedImposterIds.length === room.game.imposterIds.length && falsePositiveIds.length === 0
  const winner = crewWon ? 'crew' : 'imposters'
  const winningIds = playerIds.filter((playerId) => (
    crewWon ? room.game.assignments[playerId] === 'crew' : room.game.assignments[playerId] === 'imposter'
  ))
  const pointsByPlayer = Object.fromEntries(
    playerIds.map((playerId) => [
      playerId,
      room.options.pointsEnabled && winningIds.includes(playerId)
        ? (room.game.assignments[playerId] === 'imposter' ? 3 : 2)
        : 0,
    ]),
  )

  return {
    winner,
    majorityRequired: Math.floor(players.length / 2) + 1,
    voteCounts,
    detectedIds,
    detectedImposterIds,
    falsePositiveIds,
    pointsByPlayer,
    completedAt: timestamp(now),
  }
}

function finishVoting(room, votes, now) {
  const result = calculateResult(room, votes, now)
  const players = room.players.map((player) => ({
    ...player,
    score: player.score + (result.pointsByPlayer[player.id] ?? 0),
  }))
  const lastRound = room.game.roundNumber >= room.options.roundCount
  const phaseEndsAt = room.options.autoNextRound
    ? timestamp(now + 8000)
    : null

  return touch({
    ...room,
    players,
    game: {
      ...room.game,
      phase: 'result',
      phaseStartedAt: timestamp(now),
      phaseEndsAt,
      votes,
      result: { ...result, lastRound },
    },
  }, now)
}

export function submitVote(room, voterId, targetIds, now = Date.now()) {
  requireRoomPhase(room, 'voting')
  if (!room.game.playerIds.includes(voterId)) throw new Error('Diese Person stimmt in der Runde nicht ab.')
  if (room.game.votes[voterId]) throw new Error('Die Stimme wurde bereits abgegeben.')

  const uniqueTargets = [...new Set(targetIds ?? [])]
  if (uniqueTargets.length === 0 && !room.options.skipAllowed) throw new Error('Überspringen ist in diesem Raum deaktiviert.')
  if (uniqueTargets.length > room.options.imposterCount) {
    throw new Error(`Wähle höchstens ${room.options.imposterCount} verdächtige ${room.options.imposterCount === 1 ? 'Person' : 'Personen'}.`)
  }
  if (uniqueTargets.includes(voterId)) throw new Error('Du kannst nicht für dich selbst stimmen.')
  if (uniqueTargets.some((targetId) => !room.game.playerIds.includes(targetId))) throw new Error('Ungültige Stimme.')

  const votes = { ...room.game.votes, [voterId]: uniqueTargets }
  if (Object.keys(votes).length === room.game.playerIds.length) return finishVoting(room, votes, now)

  return touch({ ...room, game: { ...room.game, votes } }, now)
}

export function nextRound(room, actorId, { rng = Math.random, now = Date.now() } = {}) {
  requireRoomPhase(room, 'result')
  requireHost(room, actorId)

  if (room.game.roundNumber >= room.options.roundCount) {
    return touch({
      ...room,
      status: 'complete',
      game: {
        ...room.game,
        phase: 'complete',
        phaseStartedAt: timestamp(now),
        phaseEndsAt: null,
      },
    }, now)
  }

  const game = buildRound(room, room.game.roundNumber + 1, rng, now)
  return touch({
    ...room,
    status: 'playing',
    usedPairIds: [...room.usedPairIds, game.pairId],
    game,
  }, now)
}

export function returnToLobby(room, actorId, now = Date.now()) {
  requireHost(room, actorId)
  return touch({
    ...room,
    status: 'lobby',
    usedPairIds: [],
    game: null,
    players: room.players.map((player) => ({ ...player, score: 0 })),
  }, now)
}

export function advanceExpiredPhase(room, now = Date.now(), rng = Math.random) {
  const endsAt = room.game?.phaseEndsAt ? Date.parse(room.game.phaseEndsAt) : null
  if (!endsAt || now < endsAt) return room

  if (room.game.phase === 'speaking') return finishSpeakingTurn(room, room.hostId, now)
  if (room.game.phase === 'meeting') return beginVoting(room, room.hostId, now)
  if (room.game.phase === 'voting') {
    const votes = { ...room.game.votes }
    room.game.playerIds.forEach((playerId) => {
      if (!votes[playerId]) votes[playerId] = []
    })
    return finishVoting(room, votes, now)
  }
  if (room.game.phase === 'result' && room.options.autoNextRound) {
    return nextRound(room, room.hostId, { rng, now })
  }
  return room
}

export function getPrivatePlayerView(room, playerId) {
  const game = room.game
  if (!game) return { ...room, password: undefined }

  const role = game.assignments[playerId]
  const secret = role
    ? {
        role,
        word: role === 'imposter' ? game.imposterWord : game.crewWord,
        hint: game.hint,
      }
    : null

  const publicGame = {
    ...game,
    assignments: undefined,
    crewWord: game.phase === 'result' || game.phase === 'complete' ? game.crewWord : undefined,
    imposterWord: game.phase === 'result' || game.phase === 'complete' ? game.imposterWord : undefined,
    imposterIds: game.phase === 'result' || game.phase === 'complete' ? game.imposterIds : undefined,
    votes: game.phase === 'result' || game.phase === 'complete' ? game.votes : undefined,
  }

  return { ...room, password: undefined, game: publicGame, secret }
}

export function getRoomSummary(room) {
  return {
    code: room.code,
    name: room.name,
    visibility: room.visibility,
    passwordProtected: Boolean(room.password),
    status: room.status,
    playerCount: room.players.length,
    maxPlayers: room.options.maxPlayers,
    language: room.options.language,
    category: room.options.category,
    updatedAt: room.updatedAt,
  }
}
