import { describe, expect, it } from 'vitest'
import {
  buildRounds,
  calculateDelta,
  changeEntry,
  confirmBids,
  confirmResults,
  createGame,
  undo,
  validatePlayerNames,
} from './gameEngine.js'

describe('card game engine', () => {
  it('builds one-way and return round sequences', () => {
    expect(buildRounds(32, 4, 'one')).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(buildRounds(32, 4, 'both')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1])
  })

  it('keeps the original scoring formula', () => {
    expect(calculateDelta(2, 2)).toBe(7)
    expect(calculateDelta(2, 0)).toBe(-7)
    expect(calculateDelta(0, 1)).toBe(-6)
  })

  it('supports solo games and rejects duplicate names', () => {
    expect(validatePlayerNames(['Solo']).valid).toBe(true)
    expect(validatePlayerNames(['Max', 'max']).valid).toBe(false)
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
})
