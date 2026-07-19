export const MEMORY_SCHEMA_VERSION = 1
export const MEMORY_PHASES = Object.freeze({
  PLAYING: 'playing',
  RESOLVING: 'resolving',
  COMPLETE: 'complete',
})

const ALLOWED_PAIR_COUNTS = new Set([6, 8, 10, 12])

function cleanName(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 28)
}

export function validateMemoryPlayers(names) {
  if (!Array.isArray(names) || names.length < 1 || names.length > 6) {
    return { valid: false, message: 'Memory kann mit 1 bis 6 Personen gespielt werden.' }
  }
  const cleaned = names.map(cleanName)
  if (cleaned.some((name) => !name)) return { valid: false, message: 'Bitte gib jeder Person einen Namen.' }
  if (new Set(cleaned.map((name) => name.toLocaleLowerCase('de-DE'))).size !== cleaned.length) {
    return { valid: false, message: 'Bitte verwende unterschiedliche Namen.' }
  }
  return { valid: true, names: cleaned, message: '' }
}

function browserRandom() {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const value = new Uint32Array(1)
    crypto.getRandomValues(value)
    return value[0] / 0x1_0000_0000
  }
  return Math.random()
}

export function shuffleMemoryItems(items, rng = browserRandom) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const random = Number(rng())
    const normalized = Number.isFinite(random) ? Math.max(0, Math.min(0.999999999999, random)) : 0
    const target = Math.floor(normalized * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function validateAssets(assets, pairCount) {
  if (!ALLOWED_PAIR_COUNTS.has(pairCount)) throw new Error('Diese Paarzahl ist nicht verfügbar.')
  if (!Array.isArray(assets) || assets.length < pairCount) throw new Error('Für diese Partie fehlen Memory-Motive.')
  if (assets.some((asset) => !asset || typeof asset.id !== 'string' || !asset.id)) throw new Error('Die Memory-Motive sind ungültig.')
  if (new Set(assets.map((asset) => asset.id)).size !== assets.length) throw new Error('Jedes Memory-Motiv muss eindeutig sein.')
}

export function createMemoryGame(
  { names, pairCount, assets, manifestFingerprint },
  { rng = browserRandom } = {},
) {
  const players = validateMemoryPlayers(names)
  if (!players.valid) throw new Error(players.message)
  validateAssets(assets, pairCount)
  if (typeof manifestFingerprint !== 'string' || manifestFingerprint.length !== 64) {
    throw new Error('Das Memory-Manifest ist ungültig.')
  }

  const selectedAssets = shuffleMemoryItems(assets, rng).slice(0, pairCount)
  const deck = shuffleMemoryItems(selectedAssets.flatMap((asset) => [
    { id: `${asset.id}-a`, pairId: asset.id, assetId: asset.id, status: 'hidden' },
    { id: `${asset.id}-b`, pairId: asset.id, assetId: asset.id, status: 'hidden' },
  ]), rng)

  return {
    schemaVersion: MEMORY_SCHEMA_VERSION,
    manifestFingerprint,
    players: players.names.map((name, index) => ({ id: `player-${index + 1}`, name, score: 0 })),
    pairCount,
    deck,
    activePlayerIndex: 0,
    flippedCardIds: [],
    matchedPairs: 0,
    turns: 0,
    phase: MEMORY_PHASES.PLAYING,
    pendingMatch: null,
    lastEvent: { type: 'started', playerIndex: 0 },
  }
}

export function flipMemoryCard(game, cardId) {
  if (game.phase !== MEMORY_PHASES.PLAYING || game.flippedCardIds.length >= 2) return game
  const cardIndex = game.deck.findIndex((card) => card.id === cardId)
  if (cardIndex < 0 || game.deck[cardIndex].status !== 'hidden') return game

  const deck = game.deck.map((card, index) => index === cardIndex ? { ...card, status: 'revealed' } : card)
  const flippedCardIds = [...game.flippedCardIds, cardId]
  if (flippedCardIds.length === 1) {
    return { ...game, deck, flippedCardIds, lastEvent: { type: 'first-card', playerIndex: game.activePlayerIndex } }
  }

  const [firstId, secondId] = flippedCardIds
  const first = deck.find((card) => card.id === firstId)
  const second = deck.find((card) => card.id === secondId)
  return {
    ...game,
    deck,
    flippedCardIds,
    phase: MEMORY_PHASES.RESOLVING,
    pendingMatch: first.pairId === second.pairId,
    lastEvent: { type: 'cards-revealed', playerIndex: game.activePlayerIndex },
  }
}

export function resolveMemoryTurn(game) {
  if (game.phase !== MEMORY_PHASES.RESOLVING || game.flippedCardIds.length !== 2) return game
  const selected = new Set(game.flippedCardIds)
  const isMatch = game.pendingMatch === true
  const deck = game.deck.map((card) => selected.has(card.id)
    ? { ...card, status: isMatch ? 'matched' : 'hidden' }
    : card)
  const players = game.players.map((player, index) => index === game.activePlayerIndex && isMatch
    ? { ...player, score: player.score + 1 }
    : player)
  const matchedPairs = game.matchedPairs + (isMatch ? 1 : 0)
  const complete = matchedPairs === game.pairCount
  const activePlayerIndex = isMatch || complete
    ? game.activePlayerIndex
    : (game.activePlayerIndex + 1) % game.players.length

  return {
    ...game,
    deck,
    players,
    activePlayerIndex,
    flippedCardIds: [],
    matchedPairs,
    turns: game.turns + 1,
    phase: complete ? MEMORY_PHASES.COMPLETE : MEMORY_PHASES.PLAYING,
    pendingMatch: null,
    lastEvent: complete
      ? { type: 'complete', playerIndex: game.activePlayerIndex, match: isMatch }
      : { type: isMatch ? 'match' : 'miss', playerIndex: activePlayerIndex, previousPlayerIndex: game.activePlayerIndex },
  }
}

export function getMemoryRanking(game) {
  const sorted = game.players
    .map((player, index) => ({ ...player, playerIndex: index }))
    .sort((first, second) => second.score - first.score || first.playerIndex - second.playerIndex)
  let priorScore = null
  let priorRank = 0
  return sorted.map((player, index) => {
    const rank = player.score === priorScore ? priorRank : index + 1
    priorScore = player.score
    priorRank = rank
    return { ...player, rank, isWinner: rank === 1 }
  })
}

export function describeMemoryStatus(game) {
  const activeName = game.players[game.activePlayerIndex]?.name ?? ''
  if (game.phase === MEMORY_PHASES.COMPLETE) {
    const winners = getMemoryRanking(game).filter((player) => player.isWinner).map((player) => player.name)
    return winners.length > 1 ? `Unentschieden: ${winners.join(' und ')}` : `${winners[0]} gewinnt.`
  }
  if (game.phase === MEMORY_PHASES.RESOLVING) return game.pendingMatch ? 'Paar gefunden.' : 'Kein Paar.'
  if (game.lastEvent?.type === 'match') return `Paar gefunden. ${activeName} ist noch einmal dran.`
  if (game.lastEvent?.type === 'miss') return `Kein Paar. ${activeName} ist dran.`
  return `${activeName} ist dran.`
}
