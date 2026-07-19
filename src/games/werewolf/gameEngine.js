export const WEREWOLF_SCHEMA_VERSION = 1

export const WEREWOLF_ROLES = Object.freeze({
  WOLF: 'wolf',
  SEER: 'seer',
  WITCH: 'witch',
  HUNTER: 'hunter',
  VILLAGER: 'villager',
})

export const WEREWOLF_PHASES = Object.freeze({
  ROLE_REVEAL: 'role-reveal',
  NIGHT_WOLVES: 'night-wolves',
  NIGHT_SEER: 'night-seer',
  NIGHT_WITCH: 'night-witch',
  HUNTER_REACTION: 'hunter-reaction',
  DAWN: 'dawn',
  DAY: 'day',
  DAY_VOTE: 'day-vote',
  RUNOFF_VOTE: 'runoff-vote',
  EXECUTION: 'execution',
  COMPLETE: 'complete',
})

const MIN_PLAYERS = 5
const MAX_PLAYERS = 12
const ROLE_VALUES = new Set(Object.values(WEREWOLF_ROLES))
const PHASE_VALUES = new Set(Object.values(WEREWOLF_PHASES))

function timestamp(now = Date.now()) {
  return new Date(now).toISOString()
}

function createId(prefix) {
  const suffix = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${suffix}`
}

function cleanName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 28)
}

function randomIndex(length, rng) {
  return Math.min(length - 1, Math.floor(Math.max(0, rng()) * length))
}

function shuffle(values, rng) {
  const shuffled = [...values]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1, rng)
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function touch(game, now = Date.now()) {
  return { ...game, revision: game.revision + 1, updatedAt: timestamp(now) }
}

function playerById(game, playerId) {
  return game.players.find((player) => player.id === playerId)
}

function requirePhase(game, ...phases) {
  if (!phases.includes(game.phase)) {
    throw new Error('Diese Aktion ist in der aktuellen Spielphase nicht möglich.')
  }
}

function requireLivingPlayer(game, playerId) {
  const player = playerById(game, playerId)
  if (!player) throw new Error('Diese Person gehört nicht zur Partie.')
  if (!player.alive) throw new Error('Ausgeschiedene Personen dürfen nicht mehr handeln.')
  return player
}

function rolePlayer(game, role) {
  return game.players.find((player) => player.role === role)
}

function livingRolePlayers(game, role) {
  return game.players.filter((player) => player.alive && player.role === role)
}

export function getWerewolfPreset(playerCount) {
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new Error(`Werwolf benötigt ${MIN_PLAYERS} bis ${MAX_PLAYERS} mitspielende Personen.`)
  }

  const counts = playerCount <= 6
    ? { wolf: 1, seer: 1, witch: 0, hunter: 0 }
    : playerCount <= 9
      ? { wolf: 2, seer: 1, witch: 1, hunter: 0 }
      : { wolf: 3, seer: 1, witch: 1, hunter: 1 }

  const specialCount = counts.wolf + counts.seer + counts.witch + counts.hunter
  return Object.freeze({
    playerCount,
    counts: Object.freeze({ ...counts, villager: playerCount - specialCount }),
  })
}

function rolesForPreset(playerCount) {
  const { counts } = getWerewolfPreset(playerCount)
  return [
    ...Array(counts.wolf).fill(WEREWOLF_ROLES.WOLF),
    ...Array(counts.seer).fill(WEREWOLF_ROLES.SEER),
    ...Array(counts.witch).fill(WEREWOLF_ROLES.WITCH),
    ...Array(counts.hunter).fill(WEREWOLF_ROLES.HUNTER),
    ...Array(counts.villager).fill(WEREWOLF_ROLES.VILLAGER),
  ]
}

export function createWerewolfGame(
  { names },
  { idFactory = createId, now = Date.now(), rng = Math.random } = {},
) {
  if (!Array.isArray(names)) throw new Error('Trage die mitspielenden Personen ein.')
  const cleanNames = names.map(cleanName)
  getWerewolfPreset(cleanNames.length)
  if (cleanNames.some((name) => !name)) throw new Error('Jeder Spielplatz braucht einen Namen.')
  const normalized = cleanNames.map((name) => name.toLocaleLowerCase('de-DE'))
  if (new Set(normalized).size !== normalized.length) {
    throw new Error('Jede Person braucht einen eindeutigen Namen.')
  }

  const assignedRoles = shuffle(rolesForPreset(cleanNames.length), rng)
  const players = cleanNames.map((name, index) => ({
    id: idFactory('player'),
    name,
    role: assignedRoles[index],
    alive: true,
    roleConfirmed: false,
    revealedRole: null,
  }))
  const createdAt = timestamp(now)

  return {
    schemaVersion: WEREWOLF_SCHEMA_VERSION,
    id: idFactory('werewolf'),
    phase: WEREWOLF_PHASES.ROLE_REVEAL,
    players,
    revealOrder: players.map((player) => player.id),
    revealIndex: 0,
    night: null,
    day: null,
    vote: null,
    witchResources: { healAvailable: true, poisonAvailable: true },
    resolution: null,
    hunterQueue: [],
    lastDeaths: [],
    winner: null,
    history: [],
    revision: 1,
    createdAt,
    updatedAt: createdAt,
  }
}

export function getCurrentRoleRevealPlayerId(game) {
  return game.phase === WEREWOLF_PHASES.ROLE_REVEAL
    ? game.revealOrder[game.revealIndex] ?? null
    : null
}

export function getCurrentVoterId(game) {
  return [WEREWOLF_PHASES.DAY_VOTE, WEREWOLF_PHASES.RUNOFF_VOTE].includes(game.phase)
    ? game.vote?.voterOrder[game.vote.currentVoterIndex] ?? null
    : null
}

export function getCurrentHunterId(game) {
  return game.phase === WEREWOLF_PHASES.HUNTER_REACTION
    ? game.hunterQueue[0] ?? null
    : null
}

export function getAlivePlayers(game) {
  return game.players.filter((player) => player.alive)
}

function createNight(number) {
  return {
    number,
    wolfTargetId: null,
    seerInspection: null,
    witchAction: null,
  }
}

function beginNight(game, number) {
  return {
    ...game,
    phase: WEREWOLF_PHASES.NIGHT_WOLVES,
    night: createNight(number),
    day: null,
    vote: null,
    resolution: null,
    hunterQueue: [],
    lastDeaths: [],
  }
}

export function confirmWerewolfRole(game, playerId, now = Date.now()) {
  requirePhase(game, WEREWOLF_PHASES.ROLE_REVEAL)
  const expectedPlayerId = getCurrentRoleRevealPlayerId(game)
  if (playerId !== expectedPlayerId) throw new Error('Dieses Gerät ist gerade für eine andere Person bestimmt.')

  const players = game.players.map((player) => (
    player.id === playerId ? { ...player, roleConfirmed: true } : player
  ))
  const revealIndex = game.revealIndex + 1
  const next = revealIndex === game.players.length
    ? beginNight({ ...game, players, revealIndex }, 1)
    : { ...game, players, revealIndex }
  return touch(next, now)
}

function nextNightPhaseAfterWolves(game, now) {
  if (livingRolePlayers(game, WEREWOLF_ROLES.SEER).length) {
    return { ...game, phase: WEREWOLF_PHASES.NIGHT_SEER }
  }
  if (livingRolePlayers(game, WEREWOLF_ROLES.WITCH).length
    && (game.witchResources.healAvailable || game.witchResources.poisonAvailable)) {
    return { ...game, phase: WEREWOLF_PHASES.NIGHT_WITCH }
  }
  return resolveNight(game, now)
}

function nextNightPhaseAfterSeer(game, now) {
  if (livingRolePlayers(game, WEREWOLF_ROLES.WITCH).length
    && (game.witchResources.healAvailable || game.witchResources.poisonAvailable)) {
    return { ...game, phase: WEREWOLF_PHASES.NIGHT_WITCH }
  }
  return resolveNight(game, now)
}

export function selectWolfVictim(game, targetId, now = Date.now()) {
  requirePhase(game, WEREWOLF_PHASES.NIGHT_WOLVES)
  const target = requireLivingPlayer(game, targetId)
  if (target.role === WEREWOLF_ROLES.WOLF) throw new Error('Die Werwölfe können keinen Werwolf wählen.')
  const next = nextNightPhaseAfterWolves({
    ...game,
    night: { ...game.night, wolfTargetId: targetId },
  }, now)
  return touch(next, now)
}

export function inspectWithSeer(game, targetId, now = Date.now()) {
  requirePhase(game, WEREWOLF_PHASES.NIGHT_SEER)
  const seer = rolePlayer(game, WEREWOLF_ROLES.SEER)
  if (!seer?.alive) throw new Error('Die Seherin kann nicht mehr handeln.')
  const target = requireLivingPlayer(game, targetId)
  if (target.id === seer.id) throw new Error('Die Seherin kann sich nicht selbst prüfen.')

  const next = nextNightPhaseAfterSeer({
    ...game,
    night: {
      ...game.night,
      seerInspection: { targetId, isWolf: target.role === WEREWOLF_ROLES.WOLF },
    },
  }, now)
  return touch(next, now)
}

export function submitWitchAction(
  game,
  { heal = false, poisonTargetId = null } = {},
  now = Date.now(),
) {
  requirePhase(game, WEREWOLF_PHASES.NIGHT_WITCH)
  const witch = rolePlayer(game, WEREWOLF_ROLES.WITCH)
  if (!witch?.alive) throw new Error('Die Hexe kann nicht mehr handeln.')
  if (heal && poisonTargetId) throw new Error('Die Hexe darf pro Nacht höchstens einen Trank verwenden.')
  if (heal && !game.witchResources.healAvailable) throw new Error('Der Heiltrank wurde bereits verwendet.')
  if (heal && !game.night.wolfTargetId) throw new Error('In dieser Nacht gibt es kein Ziel für den Heiltrank.')
  if (poisonTargetId && !game.witchResources.poisonAvailable) throw new Error('Der Gifttrank wurde bereits verwendet.')

  if (poisonTargetId) {
    const target = requireLivingPlayer(game, poisonTargetId)
    if (target.id === witch.id) throw new Error('Die Hexe kann sich nicht selbst vergiften.')
  }

  const witchAction = { heal: Boolean(heal), poisonTargetId: poisonTargetId || null }
  const next = resolveNight({
    ...game,
    night: { ...game.night, witchAction },
    witchResources: {
      healAvailable: heal ? false : game.witchResources.healAvailable,
      poisonAvailable: poisonTargetId ? false : game.witchResources.poisonAvailable,
    },
  }, now)
  return touch(next, now)
}

function determineWinner(players) {
  const living = players.filter((player) => player.alive)
  const wolves = living.filter((player) => player.role === WEREWOLF_ROLES.WOLF).length
  const village = living.length - wolves
  if (wolves === 0) return 'village'
  if (wolves >= village) return 'wolves'
  return null
}

function publicDeath(player, causes) {
  return { playerId: player.id, role: player.role, causes: [...new Set(causes)] }
}

function historyEntryForResolution(game, resolution, now) {
  if (resolution.resumePhase === WEREWOLF_PHASES.DAWN) {
    return {
      type: 'night',
      number: game.night.number,
      wolfTargetId: game.night.wolfTargetId,
      seerInspection: game.night.seerInspection,
      witchAction: game.night.witchAction,
      deaths: resolution.deaths,
      completedAt: timestamp(now),
    }
  }
  return {
    type: 'day',
    number: game.day.number,
    primary: game.day.primary,
    runoff: game.day.runoff,
    executedId: game.day.executedId,
    deaths: resolution.deaths,
    completedAt: timestamp(now),
  }
}

function finishResolution(game, now) {
  const winner = determineWinner(game.players)
  const historyEntry = historyEntryForResolution(game, game.resolution, now)
  return {
    ...game,
    phase: winner ? WEREWOLF_PHASES.COMPLETE : game.resolution.resumePhase,
    winner,
    history: [...game.history, historyEntry],
    lastDeaths: game.resolution.deaths,
    resolution: null,
    hunterQueue: [],
    vote: null,
  }
}

function beginDeathResolution(game, deaths, resumePhase, now) {
  const causesByPlayer = new Map()
  deaths.forEach(({ playerId, cause }) => {
    if (!causesByPlayer.has(playerId)) causesByPlayer.set(playerId, [])
    causesByPlayer.get(playerId).push(cause)
  })
  const newlyDead = game.players.filter((player) => player.alive && causesByPlayer.has(player.id))
  const players = game.players.map((player) => (
    causesByPlayer.has(player.id) && player.alive
      ? { ...player, alive: false, revealedRole: player.role }
      : player
  ))
  const publicDeaths = newlyDead.map((player) => publicDeath(player, causesByPlayer.get(player.id)))
  const hunterQueue = newlyDead
    .filter((player) => player.role === WEREWOLF_ROLES.HUNTER)
    .map((player) => player.id)
  const next = {
    ...game,
    players,
    resolution: { resumePhase, deaths: publicDeaths },
    hunterQueue,
  }
  return hunterQueue.length
    ? { ...next, phase: WEREWOLF_PHASES.HUNTER_REACTION }
    : finishResolution(next, now)
}

function resolveNight(game, now) {
  const deaths = []
  if (game.night.wolfTargetId && !game.night.witchAction?.heal) {
    deaths.push({ playerId: game.night.wolfTargetId, cause: 'wolves' })
  }
  if (game.night.witchAction?.poisonTargetId) {
    deaths.push({ playerId: game.night.witchAction.poisonTargetId, cause: 'witch' })
  }
  return beginDeathResolution(game, deaths, WEREWOLF_PHASES.DAWN, now)
}

export function submitHunterShot(game, hunterId, targetId = null, now = Date.now()) {
  requirePhase(game, WEREWOLF_PHASES.HUNTER_REACTION)
  if (hunterId !== getCurrentHunterId(game)) throw new Error('Eine andere Jägerreaktion ist zuerst an der Reihe.')
  const hunter = playerById(game, hunterId)
  if (!hunter || hunter.role !== WEREWOLF_ROLES.HUNTER || hunter.alive) {
    throw new Error('Nur ein gerade ausgeschiedener Jäger darf reagieren.')
  }

  const possibleTargets = game.players.filter((player) => player.alive && player.id !== hunterId)
  if (!targetId && possibleTargets.length) throw new Error('Der Jäger muss ein lebendes Ziel wählen.')
  if (targetId && !possibleTargets.some((player) => player.id === targetId)) {
    throw new Error('Der Jäger kann nur eine lebende andere Person wählen.')
  }

  let players = game.players
  let deaths = game.resolution.deaths
  let hunterQueue = game.hunterQueue.slice(1)
  if (targetId) {
    const target = playerById(game, targetId)
    players = game.players.map((player) => (
      player.id === targetId ? { ...player, alive: false, revealedRole: player.role } : player
    ))
    deaths = [...deaths, publicDeath(target, ['hunter'])]
    if (target.role === WEREWOLF_ROLES.HUNTER) hunterQueue = [...hunterQueue, target.id]
  }

  const next = {
    ...game,
    players,
    hunterQueue,
    resolution: { ...game.resolution, deaths },
  }
  return touch(hunterQueue.length ? next : finishResolution(next, now), now)
}

export function continueToDay(game, now = Date.now()) {
  requirePhase(game, WEREWOLF_PHASES.DAWN)
  return touch({
    ...game,
    phase: WEREWOLF_PHASES.DAY,
    day: { number: game.night.number, primary: null, runoff: null, executedId: null },
    vote: null,
  }, now)
}

function createVote(game, kind, candidateIds) {
  return {
    kind,
    voterOrder: getAlivePlayers(game).map((player) => player.id),
    candidateIds: [...candidateIds],
    currentVoterIndex: 0,
    ballots: {},
  }
}

export function beginDayVote(game, now = Date.now()) {
  requirePhase(game, WEREWOLF_PHASES.DAY)
  const candidates = getAlivePlayers(game).map((player) => player.id)
  return touch({
    ...game,
    phase: WEREWOLF_PHASES.DAY_VOTE,
    vote: createVote(game, 'primary', candidates),
  }, now)
}

function countVotes(candidateIds, ballots) {
  const counts = Object.fromEntries(candidateIds.map((id) => [id, 0]))
  Object.values(ballots).forEach((targetId) => { counts[targetId] += 1 })
  return counts
}

function leadingCandidates(counts) {
  const maximum = Math.max(...Object.values(counts))
  return Object.entries(counts).filter(([, count]) => count === maximum).map(([id]) => id)
}

function executeDayTarget(game, targetId, now) {
  const day = { ...game.day, executedId: targetId }
  return beginDeathResolution({ ...game, day, vote: null }, [
    { playerId: targetId, cause: 'execution' },
  ], WEREWOLF_PHASES.EXECUTION, now)
}

function finishVote(game, ballots, now) {
  const counts = countVotes(game.vote.candidateIds, ballots)
  const leaders = leadingCandidates(counts)
  if (game.vote.kind === 'primary') {
    const day = { ...game.day, primary: { ballots, counts } }
    if (leaders.length === 1) return executeDayTarget({ ...game, day }, leaders[0], now)
    return {
      ...game,
      phase: WEREWOLF_PHASES.RUNOFF_VOTE,
      day,
      vote: createVote(game, 'runoff', leaders),
    }
  }

  const day = { ...game.day, runoff: { ballots, counts } }
  if (leaders.length === 1) return executeDayTarget({ ...game, day }, leaders[0], now)
  return beginDeathResolution(
    { ...game, day, vote: null },
    [],
    WEREWOLF_PHASES.EXECUTION,
    now,
  )
}

export function submitDayVote(game, voterId, targetId, now = Date.now()) {
  requirePhase(game, WEREWOLF_PHASES.DAY_VOTE, WEREWOLF_PHASES.RUNOFF_VOTE)
  const expectedVoterId = getCurrentVoterId(game)
  if (voterId !== expectedVoterId) throw new Error('Dieses Gerät ist gerade für eine andere abstimmende Person bestimmt.')
  requireLivingPlayer(game, voterId)
  const target = requireLivingPlayer(game, targetId)
  if (target.id === voterId) throw new Error('Eine Person kann nicht für sich selbst stimmen.')
  if (!game.vote.candidateIds.includes(targetId)) throw new Error('Diese Person steht in der Stichwahl nicht zur Auswahl.')

  const ballots = { ...game.vote.ballots, [voterId]: targetId }
  const currentVoterIndex = game.vote.currentVoterIndex + 1
  const next = currentVoterIndex === game.vote.voterOrder.length
    ? finishVote(game, ballots, now)
    : { ...game, vote: { ...game.vote, ballots, currentVoterIndex } }
  return touch(next, now)
}

export function continueAfterExecution(game, now = Date.now()) {
  requirePhase(game, WEREWOLF_PHASES.EXECUTION)
  return touch(beginNight(game, game.night.number + 1), now)
}

function validTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function validIdArray(value, allowedIds, { unique = true } = {}) {
  return Array.isArray(value)
    && value.every((id) => typeof id === 'string' && allowedIds.has(id))
    && (!unique || new Set(value).size === value.length)
}

function validDeaths(value, playersById) {
  return Array.isArray(value) && value.every((death) => {
    const player = playersById.get(death?.playerId)
    return player
      && !player.alive
      && death.role === player.role
      && Array.isArray(death.causes)
      && death.causes.length > 0
      && death.causes.every((cause) => ['wolves', 'witch', 'execution', 'hunter'].includes(cause))
  })
}

function validBallotResult(value, playerIds) {
  if (value === null) return true
  if (!value || typeof value.ballots !== 'object' || typeof value.counts !== 'object') return false
  const ballotsValid = Object.entries(value.ballots).every(([voterId, targetId]) => (
    playerIds.has(voterId) && playerIds.has(targetId) && voterId !== targetId
  ))
  const countsValid = Object.entries(value.counts).every(([targetId, count]) => (
    playerIds.has(targetId) && Number.isInteger(count) && count >= 0
  ))
  if (!ballotsValid || !countsValid || Object.keys(value.counts).length < 2) return false
  const expectedCounts = countVotes(Object.keys(value.counts), value.ballots)
  return Object.entries(expectedCounts).every(([targetId, count]) => value.counts[targetId] === count)
}

function validVote(game, playerIds) {
  const vote = game.vote
  if (!vote || !['primary', 'runoff'].includes(vote.kind)) return false
  if (!validIdArray(vote.voterOrder, playerIds) || !validIdArray(vote.candidateIds, playerIds)) return false
  if (vote.voterOrder.length === 0 || vote.candidateIds.length < 2) return false
  const livingIds = getAlivePlayers(game).map((player) => player.id)
  if (vote.voterOrder.some((id, index) => id !== livingIds[index]) || vote.voterOrder.length !== livingIds.length) return false
  if (vote.candidateIds.some((id) => !playerById(game, id)?.alive)) return false
  if (!Number.isInteger(vote.currentVoterIndex) || vote.currentVoterIndex < 0 || vote.currentVoterIndex >= vote.voterOrder.length) return false
  if (!vote.ballots || typeof vote.ballots !== 'object') return false
  const submittedVoters = Object.keys(vote.ballots)
  if (submittedVoters.length !== vote.currentVoterIndex) return false
  return submittedVoters.every((voterId, index) => voterId === vote.voterOrder[index]
    && playerById(game, voterId)?.alive
    && vote.candidateIds.includes(vote.ballots[voterId])
    && vote.ballots[voterId] !== voterId)
}

export function isValidWerewolfGame(game) {
  if (!game || game.schemaVersion !== WEREWOLF_SCHEMA_VERSION || typeof game.id !== 'string' || !game.id) return false
  if (!PHASE_VALUES.has(game.phase) || !Number.isInteger(game.revision) || game.revision < 1) return false
  if (!validTimestamp(game.createdAt) || !validTimestamp(game.updatedAt)) return false
  if (!Array.isArray(game.players) || game.players.length < MIN_PLAYERS || game.players.length > MAX_PLAYERS) return false

  const playerIds = new Set(game.players.map((player) => player?.id))
  if (playerIds.size !== game.players.length || playerIds.has(undefined)) return false
  if (game.players.some((player) => typeof player.id !== 'string' || !player.id
    || typeof player.name !== 'string' || !player.name.trim()
    || !ROLE_VALUES.has(player.role)
    || typeof player.alive !== 'boolean'
    || typeof player.roleConfirmed !== 'boolean'
    || (player.alive ? player.revealedRole !== null : player.revealedRole !== player.role))) return false

  const preset = getWerewolfPreset(game.players.length).counts
  const actualCounts = Object.fromEntries([...ROLE_VALUES].map((role) => [role, 0]))
  game.players.forEach((player) => { actualCounts[player.role] += 1 })
  if (Object.entries(preset).some(([role, count]) => actualCounts[role] !== count)) return false
  if (!validIdArray(game.revealOrder, playerIds) || game.revealOrder.length !== game.players.length) return false
  if (!Number.isInteger(game.revealIndex) || game.revealIndex < 0 || game.revealIndex > game.players.length) return false
  const confirmedIds = new Set(game.revealOrder.slice(0, game.revealIndex))
  if (game.players.some((player) => player.roleConfirmed !== confirmedIds.has(player.id))) return false
  if (game.phase === WEREWOLF_PHASES.ROLE_REVEAL) {
    if (game.revealIndex >= game.players.length || game.night !== null) return false
  } else if (game.revealIndex !== game.players.length || game.players.some((player) => !player.roleConfirmed)) return false

  if (!game.witchResources
    || typeof game.witchResources.healAvailable !== 'boolean'
    || typeof game.witchResources.poisonAvailable !== 'boolean') return false
  if (!Array.isArray(game.history) || !Array.isArray(game.lastDeaths)) return false
  const playersById = new Map(game.players.map((player) => [player.id, player]))
  if (!validDeaths(game.lastDeaths, playersById)) return false
  if (![null, 'village', 'wolves'].includes(game.winner)) return false
  if ((game.phase === WEREWOLF_PHASES.COMPLETE) !== Boolean(game.winner)) return false
  const calculatedWinner = determineWinner(game.players)
  if (game.phase === WEREWOLF_PHASES.COMPLETE && game.winner !== calculatedWinner) return false
  if (game.phase !== WEREWOLF_PHASES.COMPLETE
    && game.phase !== WEREWOLF_PHASES.HUNTER_REACTION
    && calculatedWinner !== null) return false

  if (game.phase !== WEREWOLF_PHASES.ROLE_REVEAL) {
    if (!game.night || !Number.isInteger(game.night.number) || game.night.number < 1) return false
    if (game.night.wolfTargetId !== null && !playerIds.has(game.night.wolfTargetId)) return false
    if (game.night.seerInspection !== null && (!playerIds.has(game.night.seerInspection?.targetId)
      || typeof game.night.seerInspection.isWolf !== 'boolean')) return false
    if (game.night.witchAction !== null && (typeof game.night.witchAction?.heal !== 'boolean'
      || (game.night.witchAction.poisonTargetId !== null && !playerIds.has(game.night.witchAction.poisonTargetId)))) return false
  }

  const votePhases = [WEREWOLF_PHASES.DAY_VOTE, WEREWOLF_PHASES.RUNOFF_VOTE]
  if (votePhases.includes(game.phase)) {
    if (!validVote(game, playerIds)) return false
    if ((game.phase === WEREWOLF_PHASES.DAY_VOTE) !== (game.vote.kind === 'primary')) return false
  } else if (game.vote !== null) return false

  const dayPhases = [WEREWOLF_PHASES.DAY, ...votePhases, WEREWOLF_PHASES.EXECUTION]
  if (dayPhases.includes(game.phase)) {
    if (!game.day || !Number.isInteger(game.day.number) || game.day.number !== game.night.number) return false
    if (!validBallotResult(game.day.primary, playerIds) || !validBallotResult(game.day.runoff, playerIds)) return false
    if (game.day.executedId !== null && !playerIds.has(game.day.executedId)) return false
  }

  if (game.phase === WEREWOLF_PHASES.HUNTER_REACTION) {
    if (!game.resolution || ![WEREWOLF_PHASES.DAWN, WEREWOLF_PHASES.EXECUTION].includes(game.resolution.resumePhase)) return false
    if (!validDeaths(game.resolution.deaths, playersById)) return false
    if (!validIdArray(game.hunterQueue, playerIds) || game.hunterQueue.length === 0) return false
    if (game.hunterQueue.some((id) => playersById.get(id).role !== WEREWOLF_ROLES.HUNTER || playersById.get(id).alive)) return false
  } else if (game.resolution !== null || game.hunterQueue.length !== 0) return false

  return game.history.every((entry) => entry
    && ['night', 'day'].includes(entry.type)
    && Number.isInteger(entry.number)
    && entry.number >= 1
    && validTimestamp(entry.completedAt)
    && validDeaths(entry.deaths, playersById))
}
