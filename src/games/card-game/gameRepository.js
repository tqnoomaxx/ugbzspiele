const STORAGE_KEY = 'ugbz:card-game:v1'
const LEGACY_KEY = 'gameData2'

function isValidGame(value) {
  return Boolean(
    value
      && value.schemaVersion === 1
      && Array.isArray(value.players)
      && value.players.length > 0
      && Array.isArray(value.rounds)
      && Array.isArray(value.scores)
      && Array.isArray(value.history),
  )
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
  load() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const game = JSON.parse(stored)
        return isValidGame(game) ? game : null
      }

      const legacyStored = window.localStorage.getItem(LEGACY_KEY)
      if (!legacyStored) return null

      const migrated = migrateLegacyGame(JSON.parse(legacyStored))
      if (migrated) this.save(migrated)
      return migrated
    } catch {
      return null
    }
  },

  save(game) {
    try {
      const storedGame = { ...game, updatedAt: new Date().toISOString() }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(storedGame))
      return true
    } catch {
      return false
    }
  },

  clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
      window.localStorage.removeItem(LEGACY_KEY)
      return true
    } catch {
      return false
    }
  },
}
