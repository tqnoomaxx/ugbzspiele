export const KNIFFEL_SCHEMA_VERSION = 1
export const UNLIMITED_PLAYERS = 2_147_483_647

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const UPPER_CATEGORIES = Object.freeze([
  { id: 'ones', label: 'Einser', face: 1, section: 'upper' },
  { id: 'twos', label: 'Zweier', face: 2, section: 'upper' },
  { id: 'threes', label: 'Dreier', face: 3, section: 'upper' },
  { id: 'fours', label: 'Vierer', face: 4, section: 'upper' },
  { id: 'fives', label: 'Fünfer', face: 5, section: 'upper' },
  { id: 'sixes', label: 'Sechser', face: 6, section: 'upper' },
])

export const LOWER_CATEGORIES = Object.freeze([
  { id: 'threeKind', label: 'Dreierpasch', section: 'lower' },
  { id: 'fourKind', label: 'Viererpasch', section: 'lower' },
  { id: 'fullHouse', label: 'Full House', section: 'lower', fixedScore: 25 },
  { id: 'smallStraight', label: 'Kleine Straße', section: 'lower', fixedScore: 30 },
  { id: 'largeStraight', label: 'Große Straße', section: 'lower', fixedScore: 40 },
  { id: 'kniffel', label: 'Kniffel', section: 'lower', fixedScore: 50 },
  { id: 'chance', label: 'Chance', section: 'lower' },
])

export const KNIFFEL_CATEGORIES = Object.freeze([...UPPER_CATEGORIES, ...LOWER_CATEGORIES])
const CATEGORY_BY_ID = new Map(KNIFFEL_CATEGORIES.map((category) => [category.id, category]))

function timestamp(now = Date.now()) {
  return new Date(now).toISOString()
}

function randomIndex(length, rng) {
  return Math.min(length - 1, Math.floor(rng() * length))
}

function touch(room, now = Date.now()) {
  return {
    ...room,
    revision: (room.revision ?? 0) + 1,
    updatedAt: timestamp(now),
  }
}

function requireHost(room, actorId) {
  if (room.hostId !== actorId) throw new Error('Nur die Spielleitung darf das ausführen.')
}

function requireTurn(room) {
  if (room.status !== 'playing' || room.game?.phase !== 'turn') {
    throw new Error('Diese Aktion ist im Moment nicht möglich.')
  }
}

function categoryScores() {
  return Object.fromEntries(KNIFFEL_CATEGORIES.map((category) => [category.id, null]))
}

function sanitizeName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 28)
}

function normalizeRoomName(value, hostName) {
  const roomName = String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 48)
  return roomName || `${hostName}s Kniffelrunde`
}

function nextRoomCode(rng = Math.random, length = 5) {
  return Array.from({ length }, () => ROOM_CODE_ALPHABET[randomIndex(ROOM_CODE_ALPHABET.length, rng)]).join('')
}

function countDice(dice) {
  const counts = Array(7).fill(0)
  dice.forEach((die) => { counts[die] += 1 })
  return counts
}

function isKniffel(dice) {
  return dice.length === 5 && dice.every((die) => die === dice[0])
}

function scoreStraight(dice, requiredLength) {
  const values = [...new Set(dice)].sort((first, second) => first - second)
  let run = 1
  let bestRun = values.length ? 1 : 0
  for (let index = 1; index < values.length; index += 1) {
    run = values[index] === values[index - 1] + 1 ? run + 1 : 1
    bestRun = Math.max(bestRun, run)
  }
  return bestRun >= requiredLength
}

function canActForCurrentPlayer(room, actorId) {
  return actorId === room.game.activePlayerId
    || (room.options.deviceMode === 'shared' && actorId === room.hostId)
}

function requireCurrentPlayer(room, actorId) {
  if (!canActForCurrentPlayer(room, actorId)) throw new Error('Du bist noch nicht am Zug.')
}

function validateDice(dice) {
  if (!Array.isArray(dice) || dice.length !== 5 || dice.some((die) => !Number.isInteger(die) || die < 1 || die > 6)) {
    throw new Error('Der Würfelwurf ist ungültig.')
  }
}

function getSheet(room, playerId) {
  const sheet = room.game?.sheets?.[playerId]
  if (!sheet) throw new Error('Für diese Person fehlt der Punkteblock.')
  return sheet
}

function getForcedUpperCategory(sheet, dice) {
  if (!isKniffel(dice) || sheet.scores.kniffel !== 50) return null
  const category = UPPER_CATEGORIES[dice[0] - 1]
  return sheet.scores[category.id] === null ? category.id : null
}

function scoreCategoryWithJoker(dice, categoryId, jokerActive) {
  const category = CATEGORY_BY_ID.get(categoryId)
  if (!category) throw new Error('Unbekannte Kategorie.')
  if (!jokerActive) return calculateCategoryScore(dice, categoryId)
  if (category.id === 'fullHouse' || category.id === 'smallStraight' || category.id === 'largeStraight') {
    return category.fixedScore
  }
  return calculateCategoryScore(dice, categoryId)
}

function validateManualScore(categoryId, score) {
  const category = CATEGORY_BY_ID.get(categoryId)
  if (!category) return false
  if (!Number.isInteger(score) || score < 0) return false
  if (category.face) return score <= category.face * 5 && score % category.face === 0
  if (category.fixedScore) return score === 0 || score === category.fixedScore
  return score <= 30
}

function allCategoriesFilled(sheet) {
  return KNIFFEL_CATEGORIES.every((category) => sheet.scores[category.id] !== null)
}

function finishTurn(room, nextGame, historyEntry, now) {
  const gameWithHistory = {
    ...nextGame,
    history: [...nextGame.history, historyEntry],
  }
  const complete = room.players.every((player) => allCategoriesFilled(gameWithHistory.sheets[player.id]))
  if (complete) {
    return touch({
      ...room,
      status: 'complete',
      game: {
        ...gameWithHistory,
        phase: 'complete',
        dice: [null, null, null, null, null],
        held: [false, false, false, false, false],
        rollCount: 0,
        completedAt: timestamp(now),
      },
    }, now)
  }

  const activePlayerIndex = (room.game.activePlayerIndex + 1) % room.players.length
  const turnIndex = room.game.turnIndex + 1
  return touch({
    ...room,
    game: {
      ...gameWithHistory,
      activePlayerIndex,
      activePlayerId: room.players[activePlayerIndex].id,
      turnIndex,
      roundNumber: Math.min(13, Math.floor(turnIndex / room.players.length) + 1),
      dice: [null, null, null, null, null],
      held: [false, false, false, false, false],
      rollCount: 0,
    },
  }, now)
}

export function createKniffelId(prefix = 'id') {
  const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${randomPart}`
}

export function normalizeKniffelOptions(options = {}) {
  const playMode = options.playMode === 'scorepad' ? 'scorepad' : 'digital'
  const deviceMode = playMode === 'scorepad' || options.deviceMode !== 'separate' ? 'shared' : 'separate'
  return {
    playMode,
    deviceMode,
    visibility: deviceMode === 'separate' && options.visibility === 'public' ? 'public' : 'private',
    passwordEnabled: deviceMode === 'separate' && Boolean(options.passwordEnabled),
    maxPlayers: UNLIMITED_PLAYERS,
    language: 'de',
  }
}

export function createKniffelRoom(
  { hostName, roomName, options, password = '' },
  { rng = Math.random, now = Date.now(), idFactory = createKniffelId } = {},
) {
  const cleanHostName = sanitizeName(hostName)
  if (!cleanHostName) throw new Error('Bitte gib der Spielleitung einen Namen.')
  const normalizedOptions = normalizeKniffelOptions(options)
  const hostId = idFactory('player')
  const createdAt = timestamp(now)

  return {
    schemaVersion: KNIFFEL_SCHEMA_VERSION,
    id: idFactory('room'),
    code: nextRoomCode(rng),
    name: normalizeRoomName(roomName, cleanHostName),
    visibility: normalizedOptions.visibility,
    password: normalizedOptions.passwordEnabled ? String(password).slice(0, 64) : '',
    status: 'lobby',
    hostId,
    players: [{
      id: hostId,
      name: cleanHostName,
      isHost: true,
      isDemo: false,
      connected: true,
      joinedAt: createdAt,
    }],
    options: normalizedOptions,
    game: null,
    revision: 1,
    createdAt,
    updatedAt: createdAt,
  }
}

export function addKniffelPlayer(
  room,
  name,
  { id = createKniffelId('player'), isDemo = false, now = Date.now() } = {},
) {
  if (room.status !== 'lobby') throw new Error('Die Partie läuft bereits.')
  const cleanName = sanitizeName(name)
  if (!cleanName) throw new Error('Bitte gib einen Namen ein.')
  const normalizedName = cleanName.toLocaleLowerCase('de-DE')
  if (room.players.some((player) => player.name.toLocaleLowerCase('de-DE') === normalizedName)) {
    throw new Error('Dieser Name ist bereits im Raum.')
  }
  return touch({
    ...room,
    players: [...room.players, {
      id,
      name: cleanName,
      isHost: false,
      isDemo: Boolean(isDemo),
      connected: true,
      joinedAt: timestamp(now),
    }],
  }, now)
}

export function removeKniffelPlayer(room, playerId, actorId, now = Date.now()) {
  if (room.status !== 'lobby') throw new Error('Während der Partie können keine Personen entfernt werden.')
  if (actorId !== room.hostId && actorId !== playerId) throw new Error('Keine Berechtigung.')
  const players = room.players.filter((player) => player.id !== playerId)
  if (players.length === room.players.length) return room
  if (players.length === 0) return touch({ ...room, players, hostId: null, status: 'closed' }, now)
  const hostId = playerId === room.hostId ? players[0].id : room.hostId
  return touch({
    ...room,
    hostId,
    players: players.map((player) => ({ ...player, isHost: player.id === hostId })),
  }, now)
}

export function startKniffelGame(room, actorId, now = Date.now()) {
  requireHost(room, actorId)
  if (room.status !== 'lobby') throw new Error('Die Partie wurde bereits gestartet.')
  if (room.players.length < 1) throw new Error('Mindestens eine Person muss mitspielen.')
  const sheets = Object.fromEntries(room.players.map((player) => [player.id, {
    scores: categoryScores(),
    kniffelBonus: 0,
  }]))
  return touch({
    ...room,
    status: 'playing',
    game: {
      phase: 'turn',
      activePlayerIndex: 0,
      activePlayerId: room.players[0].id,
      turnIndex: 0,
      roundNumber: 1,
      dice: [null, null, null, null, null],
      held: [false, false, false, false, false],
      rollCount: 0,
      sheets,
      history: [],
      startedAt: timestamp(now),
      completedAt: null,
    },
  }, now)
}

export function restartKniffelGame(room, actorId, now = Date.now()) {
  requireHost(room, actorId)
  if (room.status !== 'complete') throw new Error('Eine neue Partie kann erst nach dem Ergebnis gestartet werden.')
  return startKniffelGame({ ...room, status: 'lobby', game: null }, actorId, now)
}

export function generateDiceRoll(rng = Math.random) {
  return Array.from({ length: 5 }, () => randomIndex(6, rng) + 1)
}

export function applyDiceRoll(room, actorId, rolledDice, now = Date.now()) {
  requireTurn(room)
  requireCurrentPlayer(room, actorId)
  if (room.options.playMode !== 'digital') throw new Error('Diese Partie verwendet echte Würfel.')
  if (room.game.rollCount >= 3) throw new Error('Du hast bereits dreimal gewürfelt.')
  validateDice(rolledDice)
  const dice = rolledDice.map((die, index) => (
    room.game.rollCount > 0 && room.game.held[index] ? room.game.dice[index] : die
  ))
  return touch({
    ...room,
    game: {
      ...room.game,
      dice,
      held: room.game.rollCount === 0 ? [false, false, false, false, false] : room.game.held,
      rollCount: room.game.rollCount + 1,
    },
  }, now)
}

export function toggleHeldDie(room, actorId, dieIndex, now = Date.now()) {
  requireTurn(room)
  requireCurrentPlayer(room, actorId)
  if (room.options.playMode !== 'digital' || room.game.rollCount === 0) {
    throw new Error('Würfle zuerst, bevor du Würfel hältst.')
  }
  if (!Number.isInteger(dieIndex) || dieIndex < 0 || dieIndex > 4) throw new Error('Ungültiger Würfel.')
  const held = [...room.game.held]
  held[dieIndex] = !held[dieIndex]
  return touch({ ...room, game: { ...room.game, held } }, now)
}

export function calculateCategoryScore(dice, categoryId) {
  validateDice(dice)
  const category = CATEGORY_BY_ID.get(categoryId)
  if (!category) throw new Error('Unbekannte Kategorie.')
  const counts = countDice(dice)
  const sum = dice.reduce((total, die) => total + die, 0)
  if (category.face) return counts[category.face] * category.face
  if (categoryId === 'threeKind') return counts.some((count) => count >= 3) ? sum : 0
  if (categoryId === 'fourKind') return counts.some((count) => count >= 4) ? sum : 0
  if (categoryId === 'fullHouse') return counts.includes(3) && counts.includes(2) ? 25 : 0
  if (categoryId === 'smallStraight') return scoreStraight(dice, 4) ? 30 : 0
  if (categoryId === 'largeStraight') return scoreStraight(dice, 5) ? 40 : 0
  if (categoryId === 'kniffel') return isKniffel(dice) ? 50 : 0
  return sum
}

export function getDigitalScoreOptions(room) {
  requireTurn(room)
  if (room.game.rollCount === 0) return {}
  const sheet = getSheet(room, room.game.activePlayerId)
  const dice = room.game.dice
  const extraKniffel = isKniffel(dice) && sheet.scores.kniffel === 50
  const forcedCategoryId = getForcedUpperCategory(sheet, dice)
  return Object.fromEntries(KNIFFEL_CATEGORIES.map((category) => {
    if (sheet.scores[category.id] !== null) return [category.id, null]
    const selectable = !forcedCategoryId || forcedCategoryId === category.id
    return [category.id, {
      score: scoreCategoryWithJoker(dice, category.id, extraKniffel && !forcedCategoryId),
      bonus: extraKniffel ? 50 : 0,
      forced: forcedCategoryId === category.id,
      selectable,
    }]
  }))
}

export function scoreDigitalCategory(room, actorId, categoryId, now = Date.now()) {
  requireTurn(room)
  requireCurrentPlayer(room, actorId)
  if (room.options.playMode !== 'digital' || room.game.rollCount === 0) throw new Error('Würfle zuerst.')
  const sheet = getSheet(room, room.game.activePlayerId)
  if (sheet.scores[categoryId] !== null) throw new Error('Diese Kategorie ist bereits belegt.')
  const option = getDigitalScoreOptions(room)[categoryId]
  if (!option?.selectable) throw new Error('Der Kniffel-Joker muss zuerst im passenden oberen Feld eingetragen werden.')
  const sheets = {
    ...room.game.sheets,
    [room.game.activePlayerId]: {
      scores: { ...sheet.scores, [categoryId]: option.score },
      kniffelBonus: sheet.kniffelBonus + option.bonus,
    },
  }
  return finishTurn(room, { ...room.game, sheets }, {
    playerId: room.game.activePlayerId,
    categoryId,
    score: option.score,
    bonus: option.bonus,
    activePlayerIndex: room.game.activePlayerIndex,
    turnIndex: room.game.turnIndex,
    roundNumber: room.game.roundNumber,
    dice: [...room.game.dice],
    held: [...room.game.held],
    rollCount: room.game.rollCount,
    recordedAt: timestamp(now),
  }, now)
}

export function recordManualScore(room, actorId, categoryId, rawScore, { extraKniffel = false, now = Date.now() } = {}) {
  requireTurn(room)
  requireCurrentPlayer(room, actorId)
  if (room.options.playMode !== 'scorepad') throw new Error('Diese Partie verwendet digitale Würfel.')
  const score = Number(rawScore)
  if (!validateManualScore(categoryId, score)) throw new Error('Dieses Ergebnis passt nicht zur gewählten Kategorie.')
  const sheet = getSheet(room, room.game.activePlayerId)
  if (sheet.scores[categoryId] !== null) throw new Error('Diese Kategorie ist bereits belegt.')
  if (extraKniffel && sheet.scores.kniffel !== 50) throw new Error('Ein Zusatz-Kniffel ist erst nach einem gewerteten Kniffel möglich.')
  const bonus = extraKniffel ? 50 : 0
  const sheets = {
    ...room.game.sheets,
    [room.game.activePlayerId]: {
      scores: { ...sheet.scores, [categoryId]: score },
      kniffelBonus: sheet.kniffelBonus + bonus,
    },
  }
  return finishTurn(room, { ...room.game, sheets }, {
    playerId: room.game.activePlayerId,
    categoryId,
    score,
    bonus,
    activePlayerIndex: room.game.activePlayerIndex,
    turnIndex: room.game.turnIndex,
    roundNumber: room.game.roundNumber,
    dice: [null, null, null, null, null],
    held: [false, false, false, false, false],
    rollCount: 0,
    recordedAt: timestamp(now),
  }, now)
}

export function undoLastKniffelTurn(room, actorId, now = Date.now()) {
  requireHost(room, actorId)
  const history = room.game?.history ?? []
  if (!history.length) throw new Error('Es gibt noch keinen Zug zum Rückgängigmachen.')
  const lastEntry = history.at(-1)
  const sheet = getSheet(room, lastEntry.playerId)
  const sheets = {
    ...room.game.sheets,
    [lastEntry.playerId]: {
      scores: { ...sheet.scores, [lastEntry.categoryId]: null },
      kniffelBonus: Math.max(0, sheet.kniffelBonus - lastEntry.bonus),
    },
  }
  return touch({
    ...room,
    status: 'playing',
    game: {
      ...room.game,
      phase: 'turn',
      sheets,
      history: history.slice(0, -1),
      activePlayerIndex: lastEntry.activePlayerIndex,
      activePlayerId: lastEntry.playerId,
      turnIndex: lastEntry.turnIndex,
      roundNumber: lastEntry.roundNumber,
      dice: [...lastEntry.dice],
      held: [...lastEntry.held],
      rollCount: lastEntry.rollCount,
      completedAt: null,
    },
  }, now)
}

export function getPlayerTotals(room, playerId) {
  const sheet = getSheet(room, playerId)
  const upperSum = UPPER_CATEGORIES.reduce((sum, category) => sum + (sheet.scores[category.id] ?? 0), 0)
  const upperBonus = upperSum >= 63 ? 35 : 0
  const lowerSum = LOWER_CATEGORIES.reduce((sum, category) => sum + (sheet.scores[category.id] ?? 0), 0)
  return {
    upperSum,
    upperBonus,
    lowerSum,
    kniffelBonus: sheet.kniffelBonus,
    total: upperSum + upperBonus + lowerSum + sheet.kniffelBonus,
    filled: KNIFFEL_CATEGORIES.filter((category) => sheet.scores[category.id] !== null).length,
  }
}

export function getKniffelRanking(room) {
  return room.players
    .map((player, playerIndex) => ({ ...player, playerIndex, ...getPlayerTotals(room, player.id) }))
    .sort((first, second) => second.total - first.total || first.playerIndex - second.playerIndex)
    .map((player, index, ranking) => ({
      ...player,
      rank: index > 0 && player.total === ranking[index - 1].total ? ranking[index - 1].rank : index + 1,
    }))
}

export function getKniffelRoomSummary(room) {
  return {
    code: room.code,
    name: room.name,
    visibility: room.visibility,
    passwordProtected: Boolean(room.password),
    status: room.status,
    playerCount: room.players.length,
    maxPlayers: room.options.maxPlayers,
    language: 'de',
    playMode: room.options.playMode,
    deviceMode: room.options.deviceMode,
    updatedAt: room.updatedAt,
  }
}
