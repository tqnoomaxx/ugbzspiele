import { describe, expect, it } from 'vitest'
import {
  KNIFFEL_CATEGORIES,
  addKniffelPlayer,
  applyDiceRoll,
  calculateCategoryScore,
  createKniffelRoom,
  getDigitalScoreOptions,
  getPlayerTotals,
  recordManualScore,
  scoreDigitalCategory,
  startKniffelGame,
  toggleHeldDie,
  undoLastKniffelTurn,
} from './gameEngine.js'

const fixedIds = () => {
  let index = 0
  return (prefix) => `${prefix}-${++index}`
}

function createRoom(options = {}, playerCount = 2) {
  const idFactory = fixedIds()
  let room = createKniffelRoom(
    { hostName: 'Ada', roomName: 'Test', options },
    { idFactory, rng: () => 0, now: 1000 },
  )
  for (let index = 1; index < playerCount; index += 1) {
    room = addKniffelPlayer(room, `Person ${index + 1}`, { id: `extra-${index}`, now: 1000 + index })
  }
  return room
}

describe('Kniffel scoring', () => {
  it('scores the classic upper and lower categories', () => {
    expect(calculateCategoryScore([1, 1, 1, 4, 5], 'ones')).toBe(3)
    expect(calculateCategoryScore([6, 6, 6, 2, 3], 'threeKind')).toBe(23)
    expect(calculateCategoryScore([4, 4, 4, 4, 2], 'fourKind')).toBe(18)
    expect(calculateCategoryScore([2, 2, 3, 3, 3], 'fullHouse')).toBe(25)
    expect(calculateCategoryScore([1, 2, 3, 4, 6], 'smallStraight')).toBe(30)
    expect(calculateCategoryScore([2, 3, 4, 5, 6], 'largeStraight')).toBe(40)
    expect(calculateCategoryScore([5, 5, 5, 5, 5], 'kniffel')).toBe(50)
    expect(calculateCategoryScore([1, 3, 4, 5, 6], 'chance')).toBe(19)
  })

  it('does not treat a normal Kniffel as a full house', () => {
    expect(calculateCategoryScore([3, 3, 3, 3, 3], 'fullHouse')).toBe(0)
  })
})

describe('Kniffel game engine', () => {
  it('creates an unlimited room and starts all score sheets', () => {
    const room = startKniffelGame(createRoom(), 'player-1', 2000)
    expect(room.game.roundNumber).toBe(1)
    expect(room.options.maxPlayers).toBeGreaterThan(1_000_000)
    expect(Object.keys(room.game.sheets)).toHaveLength(2)
    expect(Object.keys(room.game.sheets['player-1'].scores)).toHaveLength(13)
  })

  it('rolls, holds dice and moves to the next player after scoring', () => {
    let room = startKniffelGame(createRoom({ playMode: 'digital', deviceMode: 'shared' }), 'player-1', 2000)
    room = applyDiceRoll(room, room.hostId, [1, 2, 3, 4, 5], 2100)
    room = toggleHeldDie(room, room.hostId, 0, 2200)
    room = applyDiceRoll(room, room.hostId, [6, 6, 6, 6, 6], 2300)
    expect(room.game.dice).toEqual([1, 6, 6, 6, 6])
    room = scoreDigitalCategory(room, room.hostId, 'fourKind', 2400)
    expect(room.game.sheets['player-1'].scores.fourKind).toBe(25)
    expect(room.game.activePlayerId).toBe('extra-1')
    expect(room.game.rollCount).toBe(0)
  })

  it('applies the classic repeated-Kniffel bonus and forced upper field', () => {
    let room = startKniffelGame(createRoom({ playMode: 'digital', deviceMode: 'shared' }, 1), 'player-1', 2000)
    room = applyDiceRoll(room, room.hostId, [6, 6, 6, 6, 6], 2100)
    room = scoreDigitalCategory(room, room.hostId, 'kniffel', 2200)
    room = applyDiceRoll(room, room.hostId, [2, 2, 2, 2, 2], 2300)
    const options = getDigitalScoreOptions(room)
    expect(options.twos).toMatchObject({ score: 10, bonus: 50, forced: true, selectable: true })
    expect(options.chance.selectable).toBe(false)
    room = scoreDigitalCategory(room, room.hostId, 'twos', 2400)
    expect(room.game.sheets['player-1'].kniffelBonus).toBe(50)
  })

  it('records validated manual scores and can undo the last turn', () => {
    let room = startKniffelGame(createRoom({ playMode: 'scorepad' }, 1), 'player-1', 2000)
    expect(() => recordManualScore(room, room.hostId, 'fullHouse', 17)).toThrow('passt nicht')
    room = recordManualScore(room, room.hostId, 'fullHouse', 25, { now: 2100 })
    expect(room.game.sheets['player-1'].scores.fullHouse).toBe(25)
    room = undoLastKniffelTurn(room, room.hostId, 2200)
    expect(room.game.sheets['player-1'].scores.fullHouse).toBeNull()
    expect(room.game.activePlayerId).toBe('player-1')
  })

  it('calculates the upper bonus and completes a solo score sheet', () => {
    let room = startKniffelGame(createRoom({ playMode: 'scorepad' }, 1), 'player-1', 2000)
    const scores = {
      ones: 3,
      twos: 6,
      threes: 9,
      fours: 12,
      fives: 15,
      sixes: 18,
      threeKind: 20,
      fourKind: 24,
      fullHouse: 25,
      smallStraight: 30,
      largeStraight: 40,
      kniffel: 50,
      chance: 22,
    }
    KNIFFEL_CATEGORIES.forEach((category, index) => {
      room = recordManualScore(room, room.hostId, category.id, scores[category.id], { now: 2100 + index })
    })
    const totals = getPlayerTotals(room, 'player-1')
    expect(totals.upperSum).toBe(63)
    expect(totals.upperBonus).toBe(35)
    expect(totals.total).toBe(309)
    expect(room.status).toBe('complete')
  })
})
