import { describe, expect, it } from 'vitest'
import {
  createMemoryGame,
  describeMemoryStatus,
  flipMemoryCard,
  getMemoryRanking,
  MEMORY_PHASES,
  resolveMemoryTurn,
  validateMemoryPlayers,
} from './gameEngine.js'

const fingerprint = 'a'.repeat(64)
const assets = Array.from({ length: 12 }, (_, index) => ({ id: `motiv-${index + 1}` }))

function createGame(names = ['Anna', 'Ben'], pairCount = 6) {
  let randomValue = 0
  return createMemoryGame(
    { names, pairCount, assets, manifestFingerprint: fingerprint },
    { rng: () => { randomValue = (randomValue + 0.173) % 1; return randomValue } },
  )
}

function cardsForPair(game, pairId) {
  return game.deck.filter((card) => card.pairId === pairId)
}

describe('memory engine', () => {
  it('creates exactly two cards for every selected pair', () => {
    const game = createGame()
    expect(game.deck).toHaveLength(12)
    expect(new Set(game.deck.map((card) => card.id)).size).toBe(12)
    const grouped = game.deck.reduce((counts, card) => counts.set(card.pairId, (counts.get(card.pairId) ?? 0) + 1), new Map())
    const counts = [...grouped.values()]
    expect(counts).toHaveLength(6)
    expect(counts.every((count) => count === 2)).toBe(true)
  })

  it('supports one to six people and rejects duplicate or empty names', () => {
    expect(validateMemoryPlayers(['Solo']).valid).toBe(true)
    expect(validateMemoryPlayers(Array.from({ length: 6 }, (_, index) => `P${index}`)).valid).toBe(true)
    expect(validateMemoryPlayers([]).valid).toBe(false)
    expect(validateMemoryPlayers(Array.from({ length: 7 }, (_, index) => `P${index}`)).valid).toBe(false)
    expect(validateMemoryPlayers(['Anna', ' anna ']).valid).toBe(false)
    expect(validateMemoryPlayers(['Anna', ' ']).valid).toBe(false)
  })

  it('locks after the second card and a match keeps the turn', () => {
    let game = createGame()
    const pair = cardsForPair(game, game.deck[0].pairId)
    game = flipMemoryCard(game, pair[0].id)
    game = flipMemoryCard(game, pair[1].id)

    expect(game.phase).toBe(MEMORY_PHASES.RESOLVING)
    expect(game.pendingMatch).toBe(true)
    expect(flipMemoryCard(game, game.deck.find((card) => card.status === 'hidden').id)).toBe(game)

    game = resolveMemoryTurn(game)
    expect(game.phase).toBe(MEMORY_PHASES.PLAYING)
    expect(game.activePlayerIndex).toBe(0)
    expect(game.players[0].score).toBe(1)
    expect(game.matchedPairs).toBe(1)
    expect(game.turns).toBe(1)
    expect(game.deck.filter((card) => card.status === 'matched')).toHaveLength(2)
    expect(describeMemoryStatus(game)).toContain('noch einmal')
  })

  it('hides a mismatch and advances exactly one player', () => {
    let game = createGame()
    const first = game.deck[0]
    const second = game.deck.find((card) => card.pairId !== first.pairId)
    game = flipMemoryCard(game, first.id)
    expect(flipMemoryCard(game, first.id)).toBe(game)
    game = flipMemoryCard(game, second.id)
    expect(game.pendingMatch).toBe(false)

    game = resolveMemoryTurn(game)
    expect(game.activePlayerIndex).toBe(1)
    expect(game.players.map((player) => player.score)).toEqual([0, 0])
    expect(game.deck.find((card) => card.id === first.id).status).toBe('hidden')
    expect(game.deck.find((card) => card.id === second.id).status).toBe('hidden')
  })

  it('finishes on the final pair and ranks ties jointly', () => {
    let game = createGame(['Solo'])
    for (const pairId of [...new Set(game.deck.map((card) => card.pairId))]) {
      const pair = cardsForPair(game, pairId)
      game = resolveMemoryTurn(flipMemoryCard(flipMemoryCard(game, pair[0].id), pair[1].id))
    }
    expect(game.phase).toBe(MEMORY_PHASES.COMPLETE)
    expect(game.players[0].score).toBe(6)
    expect(describeMemoryStatus(game)).toBe('Solo gewinnt.')

    const tied = { ...createGame(['Anna', 'Ben', 'Caro']), players: [
      { id: 'a', name: 'Anna', score: 2 },
      { id: 'b', name: 'Ben', score: 2 },
      { id: 'c', name: 'Caro', score: 1 },
    ] }
    expect(getMemoryRanking(tied).map((player) => player.rank)).toEqual([1, 1, 3])
  })
})
