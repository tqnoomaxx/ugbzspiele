import { describe, expect, it } from 'vitest'
import {
  WEREWOLF_PHASES,
  WEREWOLF_ROLES,
  beginDayVote,
  confirmWerewolfRole,
  continueAfterExecution,
  continueToDay,
  createWerewolfGame,
  getCurrentRoleRevealPlayerId,
  getCurrentVoterId,
  getWerewolfPreset,
  inspectWithSeer,
  isValidWerewolfGame,
  selectWolfVictim,
  submitDayVote,
  submitHunterShot,
  submitWitchAction,
} from './gameEngine.js'

function createGame(playerCount) {
  let id = 0
  return createWerewolfGame(
    { names: Array.from({ length: playerCount }, (_, index) => `Person ${index + 1}`) },
    {
      idFactory: (prefix) => `${prefix}-${++id}`,
      now: 1000,
      rng: () => 0.999999,
    },
  )
}

function player(game, role, roleIndex = 0) {
  return game.players.filter((entry) => entry.role === role)[roleIndex]
}

function confirmAllRoles(game) {
  let current = game
  while (current.phase === WEREWOLF_PHASES.ROLE_REVEAL) {
    current = confirmWerewolfRole(current, getCurrentRoleRevealPlayerId(current))
  }
  return current
}

function finishNight(game, { wolfTargetId, seerTargetId, witchAction = {} }) {
  let current = selectWolfVictim(game, wolfTargetId)
  if (current.phase === WEREWOLF_PHASES.NIGHT_SEER) {
    current = inspectWithSeer(current, seerTargetId)
  }
  if (current.phase === WEREWOLF_PHASES.NIGHT_WITCH) {
    current = submitWitchAction(current, witchAction)
  }
  return current
}

function voteUniqueTarget(game, targetId) {
  let current = beginDayVote(game)
  while ([WEREWOLF_PHASES.DAY_VOTE, WEREWOLF_PHASES.RUNOFF_VOTE].includes(current.phase)) {
    const voterId = getCurrentVoterId(current)
    const fallback = current.vote.candidateIds.find((id) => id !== voterId && id !== targetId)
      ?? current.vote.candidateIds.find((id) => id !== voterId)
    current = submitDayVote(current, voterId, voterId === targetId ? fallback : targetId)
  }
  return current
}

describe('Werwolf presets and role reveal', () => {
  it('builds the required beginner presets for all player bands', () => {
    expect(getWerewolfPreset(5).counts).toEqual({ wolf: 1, seer: 1, witch: 0, hunter: 0, villager: 3 })
    expect(getWerewolfPreset(7).counts).toEqual({ wolf: 2, seer: 1, witch: 1, hunter: 0, villager: 3 })
    expect(getWerewolfPreset(10).counts).toEqual({ wolf: 3, seer: 1, witch: 1, hunter: 1, villager: 4 })
    expect(getWerewolfPreset(12).counts).toEqual({ wolf: 3, seer: 1, witch: 1, hunter: 1, villager: 6 })
    expect(() => getWerewolfPreset(4)).toThrow('5 bis 12')
    expect(() => getWerewolfPreset(13)).toThrow('5 bis 12')
  })

  it('assigns roles deterministically and confirms them in pass-and-play order', () => {
    let game = createGame(7)
    expect(game.players.map(({ role }) => role)).toEqual([
      WEREWOLF_ROLES.WOLF,
      WEREWOLF_ROLES.WOLF,
      WEREWOLF_ROLES.SEER,
      WEREWOLF_ROLES.WITCH,
      WEREWOLF_ROLES.VILLAGER,
      WEREWOLF_ROLES.VILLAGER,
      WEREWOLF_ROLES.VILLAGER,
    ])
    expect(() => confirmWerewolfRole(game, game.players[1].id)).toThrow('andere Person')
    game = confirmAllRoles(game)
    expect(game.phase).toBe(WEREWOLF_PHASES.NIGHT_WOLVES)
    expect(game.players.every(({ roleConfirmed }) => roleConfirmed)).toBe(true)
    expect(isValidWerewolfGame(game)).toBe(true)
  })

  it('rejects missing, duplicate and unsupported player lists', () => {
    expect(() => createWerewolfGame({ names: ['A', 'B', 'C', 'D', ''] })).toThrow('Namen')
    expect(() => createWerewolfGame({ names: ['A', 'B', 'C', 'D', 'a'] })).toThrow('eindeutigen')
    expect(() => createWerewolfGame({ names: ['A', 'B', 'C', 'D'] })).toThrow('5 bis 12')
  })
})

describe('Werwolf night actions', () => {
  it('runs wolves, seer and witch in order and permits one self-heal', () => {
    let game = confirmAllRoles(createGame(7))
    const wolf = player(game, WEREWOLF_ROLES.WOLF)
    const seer = player(game, WEREWOLF_ROLES.SEER)
    const witch = player(game, WEREWOLF_ROLES.WITCH)

    expect(() => selectWolfVictim(game, wolf.id)).toThrow('keinen Werwolf')
    game = selectWolfVictim(game, witch.id)
    expect(game.phase).toBe(WEREWOLF_PHASES.NIGHT_SEER)
    expect(() => inspectWithSeer(game, seer.id)).toThrow('selbst')
    game = inspectWithSeer(game, wolf.id)
    expect(game.night.seerInspection).toEqual({ targetId: wolf.id, isWolf: true })
    expect(game.phase).toBe(WEREWOLF_PHASES.NIGHT_WITCH)
    expect(() => submitWitchAction(game, { heal: true, poisonTargetId: wolf.id })).toThrow('höchstens einen')

    game = submitWitchAction(game, { heal: true })
    expect(game.phase).toBe(WEREWOLF_PHASES.DAWN)
    expect(game.lastDeaths).toEqual([])
    expect(game.witchResources).toEqual({ healAvailable: false, poisonAvailable: true })
    expect(witch.alive).toBe(true)
    expect(isValidWerewolfGame(game)).toBe(true)
  })

  it('consumes poison once, reveals both night deaths and excludes them from voting', () => {
    let game = confirmAllRoles(createGame(7))
    const wolf = player(game, WEREWOLF_ROLES.WOLF)
    const secondWolf = player(game, WEREWOLF_ROLES.WOLF, 1)
    const seer = player(game, WEREWOLF_ROLES.SEER)
    const villagers = game.players.filter(({ role }) => role === WEREWOLF_ROLES.VILLAGER)

    game = finishNight(game, {
      wolfTargetId: villagers[0].id,
      seerTargetId: wolf.id,
      witchAction: { poisonTargetId: villagers[1].id },
    })
    expect(game.phase).toBe(WEREWOLF_PHASES.DAWN)
    expect(game.lastDeaths.map(({ playerId }) => playerId)).toEqual([villagers[0].id, villagers[1].id])
    expect(game.players.filter(({ alive }) => !alive).every(({ revealedRole, role }) => revealedRole === role)).toBe(true)
    expect(game.witchResources.poisonAvailable).toBe(false)

    game = continueToDay(game)
    game = beginDayVote(game)
    expect(game.vote.voterOrder).not.toContain(villagers[0].id)
    expect(() => submitDayVote(game, villagers[0].id, wolf.id)).toThrow('andere abstimmende')

    while ([WEREWOLF_PHASES.DAY_VOTE, WEREWOLF_PHASES.RUNOFF_VOTE].includes(game.phase)) {
      const voterId = getCurrentVoterId(game)
      const fallback = game.vote.candidateIds.find((id) => id !== voterId && id !== wolf.id)
      game = submitDayVote(game, voterId, voterId === wolf.id ? fallback : wolf.id)
    }
    expect(game.phase).toBe(WEREWOLF_PHASES.EXECUTION)
    game = continueAfterExecution(game)
    game = selectWolfVictim(game, villagers[2].id)
    game = inspectWithSeer(game, secondWolf.id)
    expect(game.phase).toBe(WEREWOLF_PHASES.NIGHT_WITCH)
    expect(() => submitWitchAction(game, { poisonTargetId: seer.id })).toThrow('bereits verwendet')
    game = submitWitchAction(game, {})
    expect(isValidWerewolfGame(game)).toBe(true)
  })
})

describe('Werwolf day vote, deaths and wins', () => {
  it('keeps votes secret until complete, then runs one runoff and eliminates nobody on another tie', () => {
    let game = confirmAllRoles(createGame(5))
    const [wolf, seer, firstVillager, secondVillager, victim] = game.players
    game = finishNight(game, { wolfTargetId: victim.id, seerTargetId: wolf.id })
    game = continueToDay(game)
    game = beginDayVote(game)

    const primaryTargets = {
      [wolf.id]: seer.id,
      [seer.id]: wolf.id,
      [firstVillager.id]: wolf.id,
      [secondVillager.id]: seer.id,
    }
    while (game.phase === WEREWOLF_PHASES.DAY_VOTE) {
      const voterId = getCurrentVoterId(game)
      game = submitDayVote(game, voterId, primaryTargets[voterId])
    }
    expect(game.phase).toBe(WEREWOLF_PHASES.RUNOFF_VOTE)
    expect(new Set(game.vote.candidateIds)).toEqual(new Set([wolf.id, seer.id]))

    const runoffTargets = {
      [wolf.id]: seer.id,
      [seer.id]: wolf.id,
      [firstVillager.id]: wolf.id,
      [secondVillager.id]: seer.id,
    }
    while (game.phase === WEREWOLF_PHASES.RUNOFF_VOTE) {
      const voterId = getCurrentVoterId(game)
      game = submitDayVote(game, voterId, runoffTargets[voterId])
    }
    expect(game.phase).toBe(WEREWOLF_PHASES.EXECUTION)
    expect(game.lastDeaths).toEqual([])
    expect(game.day.executedId).toBeNull()
    expect(game.history.at(-1)).toMatchObject({ type: 'day', executedId: null })
    expect(isValidWerewolfGame(game)).toBe(true)
  })

  it('declares a village win when the last wolf is executed', () => {
    let game = confirmAllRoles(createGame(5))
    const wolf = player(game, WEREWOLF_ROLES.WOLF)
    const seer = player(game, WEREWOLF_ROLES.SEER)
    const victim = game.players.at(-1)
    game = finishNight(game, { wolfTargetId: victim.id, seerTargetId: wolf.id })
    game = continueToDay(game)
    game = voteUniqueTarget(game, wolf.id)

    expect(game.phase).toBe(WEREWOLF_PHASES.COMPLETE)
    expect(game.winner).toBe('village')
    expect(player(game, WEREWOLF_ROLES.WOLF).revealedRole).toBe(WEREWOLF_ROLES.WOLF)
    expect(game.history.at(-1)).toMatchObject({ type: 'day', executedId: wolf.id })
    expect(seer.alive).toBe(true)
    expect(isValidWerewolfGame(game)).toBe(true)
  })

  it('declares a wolf win as soon as living wolves reach parity', () => {
    let game = confirmAllRoles(createGame(5))
    const wolf = player(game, WEREWOLF_ROLES.WOLF)
    const seer = player(game, WEREWOLF_ROLES.SEER)
    const villagers = game.players.filter(({ role }) => role === WEREWOLF_ROLES.VILLAGER)

    game = finishNight(game, { wolfTargetId: villagers[2].id, seerTargetId: wolf.id })
    game = continueToDay(game)
    game = voteUniqueTarget(game, seer.id)
    expect(game.phase).toBe(WEREWOLF_PHASES.EXECUTION)
    game = continueAfterExecution(game)
    game = selectWolfVictim(game, villagers[0].id)

    expect(game.phase).toBe(WEREWOLF_PHASES.COMPLETE)
    expect(game.winner).toBe('wolves')
    expect(isValidWerewolfGame(game)).toBe(true)
  })

  it('resolves the hunter reaction before checking the winner', () => {
    let game = confirmAllRoles(createGame(10))
    const wolf = player(game, WEREWOLF_ROLES.WOLF)
    const seer = player(game, WEREWOLF_ROLES.SEER)
    const hunter = player(game, WEREWOLF_ROLES.HUNTER)

    game = finishNight(game, {
      wolfTargetId: hunter.id,
      seerTargetId: wolf.id,
      witchAction: {},
    })
    expect(game.phase).toBe(WEREWOLF_PHASES.HUNTER_REACTION)
    expect(game.winner).toBeNull()
    expect(game.history).toHaveLength(0)
    expect(game.players.find(({ id }) => id === hunter.id).alive).toBe(false)

    game = submitHunterShot(game, hunter.id, wolf.id)
    expect(game.phase).toBe(WEREWOLF_PHASES.DAWN)
    expect(game.history).toHaveLength(1)
    expect(game.lastDeaths.map(({ playerId }) => playerId)).toEqual([hunter.id, wolf.id])
    expect(game.players.find(({ id }) => id === hunter.id).revealedRole).toBe(WEREWOLF_ROLES.HUNTER)
    expect(game.winner).toBeNull()
    expect(isValidWerewolfGame(game)).toBe(true)
  })

  it('lets the hunter break temporary wolf parity before the delayed win check', () => {
    let game = confirmAllRoles(createGame(10))
    const wolves = game.players.filter(({ role }) => role === WEREWOLF_ROLES.WOLF)
    const seer = player(game, WEREWOLF_ROLES.SEER)
    const hunter = player(game, WEREWOLF_ROLES.HUNTER)
    const villagers = game.players.filter(({ role }) => role === WEREWOLF_ROLES.VILLAGER)

    game = finishNight(game, {
      wolfTargetId: villagers[3].id,
      seerTargetId: wolves[0].id,
      witchAction: {},
    })
    game = continueToDay(game)
    game = voteUniqueTarget(game, villagers[2].id)
    game = continueAfterExecution(game)

    game = finishNight(game, {
      wolfTargetId: villagers[1].id,
      seerTargetId: wolves[0].id,
      witchAction: {},
    })
    game = continueToDay(game)
    game = voteUniqueTarget(game, hunter.id)

    expect(game.phase).toBe(WEREWOLF_PHASES.HUNTER_REACTION)
    expect(game.players.filter(({ alive, role }) => alive && role === WEREWOLF_ROLES.WOLF)).toHaveLength(3)
    expect(game.players.filter(({ alive, role }) => alive && role !== WEREWOLF_ROLES.WOLF)).toHaveLength(3)
    expect(game.winner).toBeNull()

    game = submitHunterShot(game, hunter.id, wolves[0].id)
    expect(game.phase).toBe(WEREWOLF_PHASES.EXECUTION)
    expect(game.winner).toBeNull()
    expect(game.players.filter(({ alive, role }) => alive && role === WEREWOLF_ROLES.WOLF)).toHaveLength(2)
    expect(game.players.filter(({ alive, role }) => alive && role !== WEREWOLF_ROLES.WOLF)).toHaveLength(3)
    expect(isValidWerewolfGame(game)).toBe(true)
  })
})

describe('Werwolf save validator', () => {
  it('accepts every persisted transition and rejects altered role or death state', () => {
    let game = confirmAllRoles(createGame(10))
    const wolf = player(game, WEREWOLF_ROLES.WOLF)
    const hunter = player(game, WEREWOLF_ROLES.HUNTER)
    game = selectWolfVictim(game, hunter.id)
    expect(isValidWerewolfGame(game)).toBe(true)
    game = inspectWithSeer(game, wolf.id)
    expect(isValidWerewolfGame(game)).toBe(true)
    game = submitWitchAction(game, {})
    expect(game.phase).toBe(WEREWOLF_PHASES.HUNTER_REACTION)
    expect(isValidWerewolfGame(game)).toBe(true)

    const changedRole = structuredClone(game)
    changedRole.players[0].role = WEREWOLF_ROLES.VILLAGER
    expect(isValidWerewolfGame(changedRole)).toBe(false)
    const hiddenDeath = structuredClone(game)
    hiddenDeath.players.find(({ id }) => id === hunter.id).revealedRole = null
    expect(isValidWerewolfGame(hiddenDeath)).toBe(false)
  })
})
