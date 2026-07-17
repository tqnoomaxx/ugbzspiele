export const MAX_PLAYERS = 7

export function buildRounds(deckSize, playerCount, mode) {
  const maximumCards = Math.floor(deckSize / playerCount)
  const ascending = Array.from({ length: maximumCards }, (_, index) => index + 1)

  if (mode === 'one') return ascending

  return [...ascending, ...ascending.slice(0, -1).reverse()]
}

export function calculateDelta(bid, result) {
  if (bid === result) return 5 + result
  return -5 - Math.abs(bid - result)
}

export function validatePlayerNames(names) {
  const cleanNames = names.map((name) => name.trim()).filter(Boolean)

  if (cleanNames.length === 0) {
    return { valid: false, message: 'Trage mindestens einen Namen ein.' }
  }

  const normalized = cleanNames.map((name) => name.toLocaleLowerCase('de-DE'))
  if (new Set(normalized).size !== normalized.length) {
    return { valid: false, message: 'Jeder Spieler braucht einen eindeutigen Namen.' }
  }

  if (cleanNames.length > MAX_PLAYERS) {
    return { valid: false, message: `Es sind höchstens ${MAX_PLAYERS} Spieler möglich.` }
  }

  return { valid: true, names: cleanNames }
}

export function createGame({ names, deckSize, mode }) {
  const validation = validatePlayerNames(names)
  if (!validation.valid) throw new Error(validation.message)

  const players = validation.names.map((name, index) => ({
    id: `player-${Date.now()}-${index}`,
    name,
  }))
  const rounds = buildRounds(deckSize, players.length, mode)

  return {
    schemaVersion: 1,
    players,
    deckSize,
    mode,
    rounds,
    roundIndex: 0,
    phase: 'bid',
    bids: Array(players.length).fill(0),
    results: Array(players.length).fill(0),
    scores: Array(players.length).fill(0),
    history: [],
    updatedAt: new Date().toISOString(),
  }
}

export function changeEntry(game, playerIndex, amount) {
  if (game.phase !== 'bid' && game.phase !== 'result') return game

  const field = game.phase === 'bid' ? 'bids' : 'results'
  const cards = game.rounds[game.roundIndex]
  const nextValues = [...game[field]]
  nextValues[playerIndex] = Math.min(cards, Math.max(0, nextValues[playerIndex] + amount))

  return { ...game, [field]: nextValues }
}

export function confirmBids(game) {
  if (game.phase !== 'bid') return game
  return { ...game, phase: 'result', results: Array(game.players.length).fill(0) }
}

export function confirmResults(game) {
  if (game.phase !== 'result') return { game, error: null }

  const cards = game.rounds[game.roundIndex]
  const resultTotal = game.results.reduce((total, value) => total + value, 0)
  if (resultTotal !== cards) {
    return {
      game,
      error: `Die Ergebnisse müssen zusammen genau ${cards} ${cards === 1 ? 'Stich' : 'Stiche'} ergeben.`,
    }
  }

  const deltas = game.bids.map((bid, index) => calculateDelta(bid, game.results[index]))
  const totals = game.scores.map((score, index) => score + deltas[index])
  const historyEntry = {
    roundIndex: game.roundIndex,
    cards,
    starterIndex: game.roundIndex % game.players.length,
    bids: [...game.bids],
    results: [...game.results],
    deltas,
    totals,
  }
  const nextRoundIndex = game.roundIndex + 1
  const complete = nextRoundIndex >= game.rounds.length

  return {
    error: null,
    game: {
      ...game,
      roundIndex: nextRoundIndex,
      phase: complete ? 'complete' : 'bid',
      bids: Array(game.players.length).fill(0),
      results: Array(game.players.length).fill(0),
      scores: totals,
      history: [...game.history, historyEntry],
    },
  }
}

export function undo(game) {
  if (game.phase === 'result') {
    return {
      ...game,
      phase: 'bid',
      results: Array(game.players.length).fill(0),
    }
  }

  if (game.history.length === 0) return game

  const history = game.history.slice(0, -1)
  const previousRound = game.history.at(-1)
  const previousTotals = history.length
    ? history.at(-1).totals
    : Array(game.players.length).fill(0)

  return {
    ...game,
    roundIndex: previousRound.roundIndex,
    phase: 'result',
    bids: [...previousRound.bids],
    results: [...previousRound.results],
    scores: [...previousTotals],
    history,
  }
}
