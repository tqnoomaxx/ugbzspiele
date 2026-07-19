import { MEMORY_PHASES, MEMORY_SCHEMA_VERSION } from './gameEngine.js'
import { getMemorySet } from './manifest.js'

export const MEMORY_STORAGE_KEY = 'ugbz:memory:v1'
const CARD_STATUSES = new Set(['hidden', 'revealed', 'matched'])

export function isStableMemoryState(game) {
  return game?.phase === MEMORY_PHASES.COMPLETE
    || (game?.phase === MEMORY_PHASES.PLAYING && Array.isArray(game.flippedCardIds) && game.flippedCardIds.length === 0)
    || (game?.phase === MEMORY_PHASES.RESOLVING && Array.isArray(game.flippedCardIds) && game.flippedCardIds.length === 2)
}

export function isValidMemoryGame(game, manifest) {
  const set = getMemorySet(game?.setId, manifest)
  if (!game || game.schemaVersion !== MEMORY_SCHEMA_VERSION || !set || game.setFingerprint !== set.fingerprint || game.setLabel !== set.label) return false
  if (!Array.isArray(game.players) || game.players.length < 1 || game.players.length > 6) return false
  if (game.players.some((player) => !player || typeof player.id !== 'string' || !player.id || typeof player.name !== 'string' || !player.name.trim() || !Number.isInteger(player.score) || player.score < 0)) return false
  if (new Set(game.players.map((player) => player.id)).size !== game.players.length) return false
  if (![6, 8, 10, 12].includes(game.pairCount) || game.pairCount > set.cards.length) return false
  if (!Array.isArray(game.deck) || game.deck.length !== game.pairCount * 2) return false
  if (new Set(game.deck.map((card) => card.id)).size !== game.deck.length) return false
  const assetIds = new Set(set.cards.map((card) => card.id))
  const pairCounts = new Map()
  for (const card of game.deck) {
    if (!card || typeof card.id !== 'string' || typeof card.pairId !== 'string' || card.assetId !== card.pairId || !assetIds.has(card.assetId) || !CARD_STATUSES.has(card.status)) return false
    pairCounts.set(card.pairId, (pairCounts.get(card.pairId) ?? 0) + 1)
  }
  if (pairCounts.size !== game.pairCount || [...pairCounts.values()].some((count) => count !== 2)) return false
  if (!Number.isInteger(game.activePlayerIndex) || game.activePlayerIndex < 0 || game.activePlayerIndex >= game.players.length) return false
  if (!Number.isInteger(game.matchedPairs) || game.matchedPairs < 0 || game.matchedPairs > game.pairCount) return false
  if (!Number.isInteger(game.turns) || game.turns < 0) return false
  if (!Array.isArray(game.flippedCardIds) || new Set(game.flippedCardIds).size !== game.flippedCardIds.length) return false
  if (game.flippedCardIds.some((id) => !game.deck.some((card) => card.id === id && card.status === 'revealed'))) return false
  const revealedCardIds = game.deck.filter((card) => card.status === 'revealed').map((card) => card.id)
  if (revealedCardIds.length !== game.flippedCardIds.length || revealedCardIds.some((id) => !game.flippedCardIds.includes(id))) return false
  if (!Object.values(MEMORY_PHASES).includes(game.phase)) return false
  if (game.phase === MEMORY_PHASES.PLAYING && game.flippedCardIds.length > 1) return false
  if (game.phase === MEMORY_PHASES.PLAYING && game.pendingMatch !== null) return false
  if (game.phase === MEMORY_PHASES.RESOLVING && (game.flippedCardIds.length !== 2 || typeof game.pendingMatch !== 'boolean')) return false
  if (game.phase === MEMORY_PHASES.COMPLETE && (game.matchedPairs !== game.pairCount || game.flippedCardIds.length !== 0)) return false
  const actualMatchedPairs = [...pairCounts.keys()].filter((pairId) => game.deck.filter((card) => card.pairId === pairId).every((card) => card.status === 'matched')).length
  if (actualMatchedPairs !== game.matchedPairs) return false
  if (game.players.reduce((sum, player) => sum + player.score, 0) !== game.matchedPairs) return false
  return true
}

export const memoryGameRepository = {
  inspect(manifest) {
    if (typeof window === 'undefined' || !window.localStorage) return { game: null, issue: null }
    try {
      const raw = window.localStorage.getItem(MEMORY_STORAGE_KEY)
      if (!raw) return { game: null, issue: null }
      const game = JSON.parse(raw)
      if (!isValidMemoryGame(game, manifest) || !isStableMemoryState(game)) {
        window.localStorage.removeItem(MEMORY_STORAGE_KEY)
        const set = getMemorySet(game?.setId, manifest)
        return { game: null, issue: !set || game?.setFingerprint !== set.fingerprint ? 'assets-changed' : 'corrupt' }
      }
      return { game, issue: null }
    } catch {
      try { window.localStorage.removeItem(MEMORY_STORAGE_KEY) } catch { /* Storage may be unavailable. */ }
      return { game: null, issue: 'corrupt' }
    }
  },

  load(manifest) {
    return this.inspect(manifest).game
  },

  save(game, manifest) {
    if (typeof window === 'undefined' || !window.localStorage || !isStableMemoryState(game) || !isValidMemoryGame(game, manifest)) return false
    try {
      window.localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(game))
      return true
    } catch {
      return false
    }
  },

  clear() {
    if (typeof window === 'undefined' || !window.localStorage) return false
    try { window.localStorage.removeItem(MEMORY_STORAGE_KEY); return true } catch { return false }
  },
}
