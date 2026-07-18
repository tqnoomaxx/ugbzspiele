import { describe, expect, it } from 'vitest'
import {
  buildRanking,
  buildRounds,
  calculateDelta,
  changeEntry,
  confirmBids,
  confirmResults,
  createGame,
  describeScore,
  getGamePlan,
  setEntry,
  undo,
  validatePlayerNames,
} from './gameEngine.js'

describe('card game engine', () => {
  it('builds one-way and return round sequences', () => {
    expect(buildRounds(32, 4, 'one')).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(buildRounds(32, 4, 'both')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1])
    expect(buildRounds(52, 4, 'one')).toHaveLength(13)
  })

  it('keeps the original scoring formula', () => {
    expect(calculateDelta(2, 2)).toBe(7)
    expect(calculateDelta(2, 0)).toBe(-7)
    expect(calculateDelta(0, 1)).toBe(-6)
    expect(describeScore(1, 1).calculation).toBe('5 + 1 = +6')
    expect(describeScore(0, 1).calculation).toBe('−5 − 1 = -6')
  })

  it('describes round count, duration, and card sequence before starting', () => {
    const plan = getGamePlan(32, 4, 'both')
    expect(plan.roundCount).toBe(15)
    expect(plan.maximumCards).toBe(8)
    expect(plan.sequenceLabel).toBe('1 → 8 → 1 Karten')
    expect(plan.durationLabel).toMatch(/^ca\./)

    const soloPlan = getGamePlan(32, 1, 'one')
    expect(soloPlan.roundCount).toBe(32)
    expect(soloPlan.maximumCards).toBe(32)
    expect(soloPlan.sequenceLabel).toBe('1 → 32 Karten')
  })

  it('supports solo games and rejects duplicate names', () => {
    expect(validatePlayerNames(['Solo']).valid).toBe(true)
    expect(validatePlayerNames(['Max', 'max']).valid).toBe(false)
    expect(validatePlayerNames(['Max', '']).message).toContain('leere Zeilen')
  })

  it('supports direct, clamped counter input', () => {
    const game = createGame({ names: ['Max'], deckSize: 32, mode: 'one' })
    expect(setEntry(game, 0, 12).bids).toEqual([1])
    expect(setEntry(game, 0, -2).bids).toEqual([0])
  })

  it('requires the result sum to match the tricks in the round', () => {
    let game = createGame({ names: ['Max', 'Lea'], deckSize: 32, mode: 'one' })
    game = confirmBids(game)
    const invalid = confirmResults(game)
    expect(invalid.error).toContain('genau 1 Stich')

    game = changeEntry(game, 0, 1)
    const valid = confirmResults(game)
    expect(valid.error).toBeNull()
    expect(valid.game.roundIndex).toBe(1)
  })

  it('restores the last round for correction', () => {
    let game = createGame({ names: ['Max'], deckSize: 32, mode: 'one' })
    game = changeEntry(game, 0, 1)
    game = confirmBids(game)
    game = changeEntry(game, 0, 1)
    game = confirmResults(game).game
    const restored = undo(game)

    expect(restored.phase).toBe('result')
    expect(restored.roundIndex).toBe(0)
    expect(restored.bids).toEqual([1])
    expect(restored.results).toEqual([1])
    expect(restored.scores).toEqual([0])
  })

  it('restores the final round after the game is complete', () => {
    let game = createGame({ names: ['Max'], deckSize: 1, mode: 'one' })
    game = changeEntry(game, 0, 1)
    game = confirmBids(game)
    game = changeEntry(game, 0, 1)
    game = confirmResults(game).game

    expect(game.phase).toBe('complete')
    const restored = undo(game)
    expect(restored.phase).toBe('result')
    expect(restored.roundIndex).toBe(0)
    expect(restored.results).toEqual([1])
  })

  it('assigns the same rank to tied players and highlights all winners', () => {
    const players = ['Ada', 'Ben', 'Cleo', 'Doro'].map((name, index) => ({ id: index, name }))
    const ranking = buildRanking(players, [30, 30, 25, 20])

    expect(ranking.map((player) => player.rank)).toEqual([1, 1, 3, 4])
    expect(ranking.filter((player) => player.isWinner).map((player) => player.name)).toEqual(['Ada', 'Ben'])
  })
})
