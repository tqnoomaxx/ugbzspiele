const STORAGE_KEY = 'ugbz:card-game:v1'
const LEGACY_KEY = 'gameData2'
const VALID_DECK_SIZES = new Set([32, 52, 54])
const VALID_MODES = new Set(['both', 'one'])
const VALID_PHASES = new Set(['bid', 'result', 'complete'])

function isIntegerArray(value, length, { allowNegative = false, maximum = Infinity } = {}) {
  return Array.isArray(value)
    && value.length === length
    && value.every((entry) => Number.isInteger(entry) && (allowNegative || entry >= 0) && entry <= maximum)
}

function isValidHistoryEntry(entry, playerCount, roundCount) {
  return Boolean(
    entry
      && Number.isInteger(entry.roundIndex)
      && entry.roundIndex >= 0
      && entry.roundIndex < roundCount
      && Number.isInteger(entry.cards)
      && entry.cards > 0
      && Number.isInteger(entry.starterIndex)
      && entry.starterIndex >= 0
      && entry.starterIndex < playerCount
      && isIntegerArray(entry.bids, playerCount)
      && isIntegerArray(entry.results, playerCount)
      && isIntegerArray(entry.deltas, playerCount, { allowNegative: true })
      && isIntegerArray(entry.totals, playerCount, { allowNegative: true }),
  )
}

function isValidGame(value) {
  if (!value || value.schemaVersion !== 1) return false
  if (!Array.isArray(value.players) || value.players.length < 1 || value.players.length > 7) return false
  if (value.players.some((player) => !player || typeof player.id !== 'string' || !player.id || typeof player.name !== 'string' || !player.name.trim())) return false
  if (new Set(value.players.map((player) => player.id)).size !== value.players.length) return false
  if (!VALID_DECK_SIZES.has(value.deckSize) || !VALID_MODES.has(value.mode) || !VALID_PHASES.has(value.phase)) return false
  if (!Array.isArray(value.rounds) || value.rounds.length < 1 || value.rounds.some((round) => !Number.isInteger(round) || round < 1 || round > value.deckSize)) return false
  if (!Number.isInteger(value.roundIndex) || value.roundIndex < 0 || value.roundIndex > value.rounds.length) return false
  if (value.phase === 'complete' ? value.roundIndex !== value.rounds.length : value.roundIndex >= value.rounds.length) return false
  const playerCount = value.players.length
  const maximumCards = Math.max(...value.rounds)
  if (!isIntegerArray(value.bids, playerCount, { maximum: maximumCards })) return false
  if (!isIntegerArray(value.results, playerCount, { maximum: maximumCards })) return false
  if (!isIntegerArray(value.scores, playerCount, { allowNegative: true })) return false
  if (!Array.isArray(value.history) || value.history.length !== value.roundIndex) return false
  if (value.history.some((entry) => !isValidHistoryEntry(entry, playerCount, value.rounds.length))) return false
  return true
}

function migrateLegacyGame(value) {
  if (!value || !Array.isArray(value.p) || value.p.length === 0 || !Array.isArray(value.r)) {
    return null
  }

  const players = value.p.map((name, index) => ({ id: `legacy-${index}`, name }))
  const empty = () => Array(players.length).fill(0)
  const history = (value.history ?? []).map((entry, index) => {
    const bids = entry.rawSoll ?? empty()
    const results = entry.rawIst ?? empty()
    const totals = entry.scoresAtStep?.map((score) => score.total) ?? empty()
    const priorTotals = index > 0
      ? value.history[index - 1].scoresAtStep?.map((score) => score.total) ?? empty()
      : empty()
    const deltas = totals.map((total, playerIndex) => total - priorTotals[playerIndex])

    return {
      roundIndex: index,
      cards: entry.rNum ?? value.r[index],
      starterIndex: index % players.length,
      bids,
      results,
      deltas,
      totals,
    }
  })

  return {
    schemaVersion: 1,
    players,
    deckSize: value.selectedDeck ?? 32,
    mode: value.gameMode ?? 'both',
    rounds: value.r,
    roundIndex: value.c ?? 0,
    phase: (value.c ?? 0) >= value.r.length ? 'complete' : value.phase === 'IST' ? 'result' : 'bid',
    bids: value.currentSoll ?? empty(),
    results: value.currentIst ?? empty(),
    scores: value.s ?? empty(),
    history,
    updatedAt: new Date().toISOString(),
  }
}

export const gameRepository = {
  inspect() {
    if (typeof window === 'undefined') return { game: null, issue: null, raw: null }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const game = JSON.parse(stored)
        return isValidGame(game)
          ? { game, issue: null, raw: null }
          : { game: null, issue: 'corrupt', raw: stored }
      }

      const legacyStored = window.localStorage.getItem(LEGACY_KEY)
      if (!legacyStored) return { game: null, issue: null, raw: null }

      const migrated = migrateLegacyGame(JSON.parse(legacyStored))
      if (migrated && isValidGame(migrated)) {
        this.save(migrated)
        return { game: migrated, issue: null, raw: null }
      }
      return { game: null, issue: 'corrupt', raw: legacyStored }
    } catch {
      return {
        game: null,
        issue: 'corrupt',
        raw: window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY),
      }
    }
  },

  load() {
    return this.inspect().game
  },

  save(game) {
    if (typeof window === 'undefined') return false
    try {
      const storedGame = { ...game, updatedAt: new Date().toISOString() }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedGame))
      return true
    } catch {
      return false
    }
  },

  clear() {
    if (typeof window === 'undefined') return false
    try {
      window.localStorage.removeItem(STORAGE_KEY)
      window.localStorage.removeItem(LEGACY_KEY)
      return true
    } catch {
      return false
    }
  },
}
