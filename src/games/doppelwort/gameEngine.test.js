import { describe, expect, it } from 'vitest'
import { WORD_PAIRS, getWordPairs } from './wordPairs.js'
import {
  addPlayer,
  advanceExpiredPhase,
  beginVoting,
  createRoom,
  finishSpeakingTurn,
  getPrivatePlayerView,
  markPlayerRevealed,
  nextRound,
  removePlayer,
  startGame,
  submitVote,
} from './gameEngine.js'

const fixedIds = () => {
  let index = 0
  return (prefix) => `${prefix}-${++index}`
}

function roomWithPlayers(count = 4, options = {}) {
  const idFactory = fixedIds()
  let room = createRoom(
    { hostName: 'Ada', roomName: 'Testsalon', options },
    { rng: () => 0, now: 1000, idFactory },
  )
  for (let index = 1; index < count; index += 1) {
    room = addPlayer(room, `Person ${index + 1}`, { id: `player-extra-${index}`, now: 1000 + index })
  }
  return room
}

function revealAll(room, now = 2000) {
  let result = room
  result.game.revealOrder.forEach((playerId, index) => {
    result = markPlayerRevealed(result, playerId, now + index)
  })
  return result
}

function reachVoting(room) {
  let result = revealAll(room)
  result.game.speakingOrder.forEach((playerId, index) => {
    result = finishSpeakingTurn(result, playerId, 3000 + index)
  })
  return beginVoting(result, result.hostId, 4000)
}

describe('Doppelwort word library', () => {
  it('contains at least 100 pairs in both languages and filters by category', () => {
    expect(WORD_PAIRS.de.length).toBeGreaterThanOrEqual(100)
    expect(WORD_PAIRS.en.length).toBeGreaterThanOrEqual(100)
    expect(getWordPairs('de', 'animals')).toHaveLength(20)
    expect(getWordPairs('en', 'food').every((pair) => pair.category === 'food')).toBe(true)
  })
})

describe('Doppelwort room and round engine', () => {
  it('creates a room with safe defaults and unique players', () => {
    let room = roomWithPlayers(3)
    expect(room.code).toHaveLength(5)
    expect(room.options.imposterCount).toBe(1)
    expect(room.players).toHaveLength(3)
    expect(() => addPlayer(room, 'ada')).toThrow('bereits')
  })

  it('assigns the configured role count and exposes only the requesting secret', () => {
    const room = roomWithPlayers(6, { imposterCount: 2 })
    const started = startGame(room, room.hostId, { rng: () => 0.31, now: 2000 })
    expect(Object.values(started.game.assignments).filter((role) => role === 'imposter')).toHaveLength(2)

    const playerId = started.players[0].id
    const view = getPrivatePlayerView(started, playerId)
    expect(view.secret.word).toBeTruthy()
    expect(view.game.assignments).toBeUndefined()
    expect(view.game.crewWord).toBeUndefined()
    expect(view.password).toBeUndefined()
  })

  it('moves through reveal, speaking, meeting and voting', () => {
    let room = startGame(roomWithPlayers(), 'player-1', { rng: () => 0.2, now: 2000 })
    room = revealAll(room)
    expect(room.game.phase).toBe('speaking')
    room.game.speakingOrder.forEach((playerId, index) => {
      room = finishSpeakingTurn(room, playerId, 3000 + index)
    })
    expect(room.game.phase).toBe('meeting')
    room = beginVoting(room, room.hostId, 4000)
    expect(room.game.phase).toBe('voting')
  })

  it('lets the crew win only when every imposter has an absolute majority and no crew does', () => {
    let room = startGame(roomWithPlayers(5, { imposterCount: 2 }), 'player-1', { rng: () => 0, now: 2000 })
    room = reachVoting(room)
    const [firstImposter, secondImposter] = room.game.imposterIds

    room.game.playerIds.forEach((voterId, index) => {
      const candidates = [firstImposter, secondImposter].filter((id) => id !== voterId)
      room = submitVote(room, voterId, candidates, 5000 + index)
    })

    expect(room.game.phase).toBe('result')
    expect(room.game.result.winner).toBe('crew')
    expect(room.game.result.detectedImposterIds).toHaveLength(2)
  })

  it('gives imposters the round when a crew member also crosses the majority threshold', () => {
    let room = startGame(roomWithPlayers(5, { imposterCount: 2 }), 'player-1', { rng: () => 0, now: 2000 })
    room = reachVoting(room)
    const imposters = room.game.imposterIds
    const crewId = room.game.playerIds.find((id) => !imposters.includes(id))

    room.game.playerIds.forEach((voterId, index) => {
      const targets = [imposters[0], voterId === crewId ? imposters[1] : crewId].filter((id) => id !== voterId)
      room = submitVote(room, voterId, targets, 5000 + index)
    })

    expect(room.game.result.winner).toBe('imposters')
  })

  it('finishes missing votes as abstentions when the timer expires', () => {
    let room = startGame(roomWithPlayers(), 'player-1', { rng: () => 0, now: 2000 })
    room = reachVoting(room)
    const expiredAt = Date.parse(room.game.phaseEndsAt) + 1
    room = advanceExpiredPhase(room, expiredAt)
    expect(room.game.phase).toBe('result')
    expect(Object.keys(room.game.votes)).toHaveLength(4)
  })

  it('keeps a meeting without a timer open until the host starts voting', () => {
    let room = startGame(roomWithPlayers(3, { meetingSeconds: 0 }), 'player-1', { rng: () => 0, now: 2000 })
    room = revealAll(room)
    room.game.speakingOrder.forEach((playerId, index) => {
      room = finishSpeakingTurn(room, playerId, 3000 + index)
    })

    expect(room.game.phase).toBe('meeting')
    expect(room.game.phaseEndsAt).toBeNull()
    expect(advanceExpiredPhase(room, 999_999)).toBe(room)
  })

  it('does not award points when the room disables the overall score', () => {
    let room = startGame(roomWithPlayers(3, { pointsEnabled: false }), 'player-1', { rng: () => 0, now: 2000 })
    room = reachVoting(room)
    room.game.playerIds.forEach((voterId, index) => {
      room = submitVote(room, voterId, [], 5000 + index)
    })

    expect(room.game.phase).toBe('result')
    expect(room.players.every((player) => player.score === 0)).toBe(true)
  })

  it('awards points, advances rounds and transfers the host safely', () => {
    let room = startGame(roomWithPlayers(3, { roundCount: 2 }), 'player-1', { rng: () => 0, now: 2000 })
    room = reachVoting(room)
    const imposterId = room.game.imposterIds[0]
    room.game.playerIds.forEach((voterId, index) => {
      room = submitVote(room, voterId, voterId === imposterId ? [] : [imposterId], 5000 + index)
    })
    expect(room.players.filter((player) => player.id !== imposterId).every((player) => player.score === 2)).toBe(true)

    room = nextRound(room, room.hostId, { rng: () => 0.4, now: 6000 })
    expect(room.game.roundNumber).toBe(2)
    expect(room.usedPairIds).toHaveLength(2)

    const oldHost = room.hostId
    room = removePlayer(room, oldHost, { actorId: oldHost, rng: () => 0, now: 7000 })
    expect(room.hostId).not.toBe(oldHost)
    expect(room.players.find((player) => player.id === room.hostId)?.isHost).toBe(true)
  })
})
