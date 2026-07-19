import { describe, expect, it } from 'vitest'
import {
  FLEET,
  confirmBattleshipFleet,
  createBattleshipGame,
  fireBattleshipShot,
  getBattleshipCellState,
  isValidBattleshipGame,
  placeBattleship,
  randomizeBattleshipFleet,
} from './gameEngine.js'

function game() {
  let id = 0
  return createBattleshipGame({ firstName: 'Ada', secondName: 'Ben' }, { idFactory: (prefix) => `${prefix}-${++id}`, now: 1000, rng: () => 0 })
}

function placeFleet(state, playerId, rowOffset = 0) {
  return FLEET.reduce((current, ship, index) => placeBattleship(current, playerId, ship.id, rowOffset + index, 0, 'horizontal', 1100 + index), state)
}

describe('Battleship engine', () => {
  it('places two complete fleets and starts the first turn', () => {
    let state = game()
    state = placeFleet(state, state.players[0].id)
    state = confirmBattleshipFleet(state, state.players[0].id)
    state = placeFleet(state, state.players[1].id)
    state = confirmBattleshipFleet(state, state.players[1].id)
    expect(state.phase).toBe('battle')
    expect(state.players[state.turnIndex].name).toBe('Ada')
    expect(isValidBattleshipGame(state)).toBe(true)
  })

  it('keeps the randomly selected starting player after placement', () => {
    let state = createBattleshipGame(
      { firstName: 'Ada', secondName: 'Ben' },
      { idFactory: (() => { let id = 0; return (prefix) => `${prefix}-${++id}` })(), now: 1000, rng: () => 0.99 },
    )
    const [first, second] = state.players
    state = placeFleet(state, first.id)
    state = confirmBattleshipFleet(state, first.id)
    state = placeFleet(state, second.id)
    state = confirmBattleshipFleet(state, second.id)
    expect(state.players[state.turnIndex].name).toBe('Ben')
  })

  it('prevents overlaps and duplicate shots', () => {
    let state = game()
    state = placeBattleship(state, state.players[0].id, 'carrier', 0, 0)
    expect(() => placeBattleship(state, state.players[0].id, 'destroyer', 0, 2)).toThrow('überlappen')

    state = game()
    const [first, second] = state.players
    state = placeFleet(state, first.id)
    state = confirmBattleshipFleet(state, first.id)
    state = placeFleet(state, second.id)
    state = confirmBattleshipFleet(state, second.id)
    state = fireBattleshipShot(state, first.id, 9, 9)
    state = fireBattleshipShot(state, second.id, 9, 8)
    expect(() => fireBattleshipShot(state, first.id, 9, 9)).toThrow('bereits geschossen')
  })

  it('records hits, misses, sunk ships and a winner', () => {
    let state = game()
    const [first, second] = state.players
    state = placeFleet(state, first.id)
    state = confirmBattleshipFleet(state, first.id)
    state = placeFleet(state, second.id)
    state = confirmBattleshipFleet(state, second.id)

    const targetCells = state.boards[second.id].ships.flatMap((ship) => ship.cells)
    let missIndex = 0
    for (const key of targetCells) {
      const [row, column] = key.split(':').map(Number)
      state = fireBattleshipShot(state, first.id, row, column)
      if (state.phase === 'complete') break
      const missRow = missIndex < 10 ? 9 : 8
      const missColumn = missIndex % 10
      state = fireBattleshipShot(state, second.id, missRow, missColumn)
      missIndex += 1
    }
    expect(state.phase).toBe('complete')
    expect(state.winnerId).toBe(first.id)
    expect(getBattleshipCellState(state, second.id, 0, 0).shot).toBe('hit')
  })

  it('can generate a legal random fleet', () => {
    const state = game()
    const next = randomizeBattleshipFleet(state, state.players[0].id, Math.random)
    expect(next.boards[state.players[0].id].ships).toHaveLength(5)
    expect(new Set(next.boards[state.players[0].id].ships.flatMap((ship) => ship.cells)).size).toBe(17)
  })

  it('rejects forged winners, malformed shots, bent ships and invented history', () => {
    let state = game()
    const [first, second] = state.players
    state = placeFleet(state, first.id)
    state = confirmBattleshipFleet(state, first.id)
    state = placeFleet(state, second.id)
    state = confirmBattleshipFleet(state, second.id)

    expect(isValidBattleshipGame({ ...state, phase: 'complete', winnerId: first.id })).toBe(false)
    expect(isValidBattleshipGame({ ...state, boards: { ...state.boards, [second.id]: { ...state.boards[second.id], shots: { '99:0': 'maybe' } } } })).toBe(false)
    const bent = structuredClone(state)
    bent.boards[first.id].ships[0].cells[4] = '2:2'
    expect(isValidBattleshipGame(bent)).toBe(false)
    expect(isValidBattleshipGame({ ...state, history: [{ playerId: first.id }] })).toBe(false)
  })
})
