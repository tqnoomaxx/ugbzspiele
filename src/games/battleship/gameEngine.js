export const BATTLESHIP_SCHEMA_VERSION = 1
export const BOARD_SIZE = 10
export const FLEET = Object.freeze([
  { id: 'carrier', name: 'Flugzeugträger', length: 5 },
  { id: 'battleship', name: 'Schlachtschiff', length: 4 },
  { id: 'cruiser', name: 'Kreuzer', length: 3 },
  { id: 'submarine', name: 'U-Boot', length: 3 },
  { id: 'destroyer', name: 'Zerstörer', length: 2 },
])

const SHIP_BY_ID = new Map(FLEET.map((ship) => [ship.id, ship]))

function timestamp(now = Date.now()) { return new Date(now).toISOString() }
function cellKey(row, column) { return `${row}:${column}` }
function randomIndex(length, rng) { return Math.min(length - 1, Math.floor(rng() * length)) }
function cleanName(value) { return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 24) }

function touch(game, now = Date.now()) {
  return { ...game, revision: game.revision + 1, updatedAt: timestamp(now) }
}

function requirePlayer(game, playerId) {
  if (!game.players.some((player) => player.id === playerId)) throw new Error('Diese Person gehört nicht zur Partie.')
}

function emptyBoard() { return { ships: [], shots: {} } }

function requirePlacementTurn(game, playerId) {
  if (game.phase !== 'placement') throw new Error('Die Flottenaufstellung ist bereits beendet.')
  if (game.players[game.placementIndex]?.id !== playerId) throw new Error('Die andere Person stellt gerade ihre Flotte auf.')
}

function cellsForPlacement(row, column, orientation, length) {
  if (!Number.isInteger(row) || !Number.isInteger(column) || !['horizontal', 'vertical'].includes(orientation)) {
    throw new Error('Die Schiffsposition ist ungültig.')
  }
  const cells = Array.from({ length }, (_, index) => ({
    row: row + (orientation === 'vertical' ? index : 0),
    column: column + (orientation === 'horizontal' ? index : 0),
  }))
  if (cells.some((cell) => cell.row < 0 || cell.row >= BOARD_SIZE || cell.column < 0 || cell.column >= BOARD_SIZE)) {
    throw new Error('Das Schiff ragt über das Spielfeld hinaus.')
  }
  return cells.map((cell) => cellKey(cell.row, cell.column))
}

function allShipsPlaced(board) {
  return FLEET.every((fleetShip) => board.ships.some((ship) => ship.id === fleetShip.id && ship.cells.length === fleetShip.length))
}

export function createBattleshipGame({ firstName, secondName }, { idFactory, now = Date.now(), rng = Math.random } = {}) {
  const names = [cleanName(firstName), cleanName(secondName)]
  if (names.some((name) => !name)) throw new Error('Trage zwei Namen ein.')
  if (names[0].toLocaleLowerCase('de-DE') === names[1].toLocaleLowerCase('de-DE')) throw new Error('Beide Personen brauchen unterschiedliche Namen.')
  const makeId = idFactory ?? ((prefix) => `${prefix}-${crypto.randomUUID()}`)
  const players = names.map((name) => ({ id: makeId('player'), name }))
  const createdAt = timestamp(now)
  return {
    schemaVersion: BATTLESHIP_SCHEMA_VERSION,
    id: makeId('battleship'),
    phase: 'placement',
    players,
    boards: Object.fromEntries(players.map((player) => [player.id, emptyBoard()])),
    placementIndex: 0,
    turnIndex: randomIndex(2, rng),
    winnerId: null,
    history: [],
    revision: 1,
    createdAt,
    updatedAt: createdAt,
  }
}

export function placeBattleship(game, playerId, shipId, row, column, orientation = 'horizontal', now = Date.now()) {
  requirePlacementTurn(game, playerId)
  const fleetShip = SHIP_BY_ID.get(shipId)
  if (!fleetShip) throw new Error('Dieses Schiff gehört nicht zur Flotte.')
  const board = game.boards[playerId]
  const otherShips = board.ships.filter((ship) => ship.id !== shipId)
  const occupied = new Set(otherShips.flatMap((ship) => ship.cells))
  const cells = cellsForPlacement(row, column, orientation, fleetShip.length)
  if (cells.some((cell) => occupied.has(cell))) throw new Error('Schiffe dürfen sich nicht überlappen.')
  const nextShip = { id: fleetShip.id, name: fleetShip.name, length: fleetShip.length, cells, hits: [] }
  return touch({
    ...game,
    boards: { ...game.boards, [playerId]: { ...board, ships: [...otherShips, nextShip] } },
  }, now)
}

export function randomizeBattleshipFleet(game, playerId, rng = Math.random, now = Date.now()) {
  requirePlacementTurn(game, playerId)
  let ships = []
  for (const fleetShip of FLEET) {
    let placed = false
    for (let attempt = 0; attempt < 500 && !placed; attempt += 1) {
      const orientation = rng() < 0.5 ? 'horizontal' : 'vertical'
      const maxRow = orientation === 'vertical' ? BOARD_SIZE - fleetShip.length : BOARD_SIZE - 1
      const maxColumn = orientation === 'horizontal' ? BOARD_SIZE - fleetShip.length : BOARD_SIZE - 1
      const cells = cellsForPlacement(randomIndex(maxRow + 1, rng), randomIndex(maxColumn + 1, rng), orientation, fleetShip.length)
      const occupied = new Set(ships.flatMap((ship) => ship.cells))
      if (cells.some((cell) => occupied.has(cell))) continue
      ships = [...ships, { ...fleetShip, cells, hits: [] }]
      placed = true
    }
    if (!placed) throw new Error('Die Flotte konnte nicht automatisch aufgestellt werden.')
  }
  return touch({ ...game, boards: { ...game.boards, [playerId]: { ships, shots: {} } } }, now)
}

export function confirmBattleshipFleet(game, playerId, now = Date.now()) {
  requirePlacementTurn(game, playerId)
  if (!allShipsPlaced(game.boards[playerId])) throw new Error('Platziere zuerst alle fünf Schiffe.')
  if (game.placementIndex === 0) return touch({ ...game, placementIndex: 1 }, now)
  return touch({ ...game, phase: 'battle', placementIndex: 1 }, now)
}

export function fireBattleshipShot(game, playerId, row, column, now = Date.now()) {
  if (game.phase !== 'battle') throw new Error('Im Moment kann nicht geschossen werden.')
  requirePlayer(game, playerId)
  if (game.players[game.turnIndex]?.id !== playerId) throw new Error('Du bist noch nicht am Zug.')
  if (!Number.isInteger(row) || !Number.isInteger(column) || row < 0 || row >= BOARD_SIZE || column < 0 || column >= BOARD_SIZE) {
    throw new Error('Dieses Feld existiert nicht.')
  }
  const target = game.players[1 - game.turnIndex]
  const targetBoard = game.boards[target.id]
  const key = cellKey(row, column)
  if (targetBoard.shots[key]) throw new Error('Auf dieses Feld wurde bereits geschossen.')
  const struckShip = targetBoard.ships.find((ship) => ship.cells.includes(key))
  const result = struckShip ? 'hit' : 'miss'
  const ships = targetBoard.ships.map((ship) => (
    ship.id === struckShip?.id ? { ...ship, hits: [...ship.hits, key] } : ship
  ))
  const sunkShip = struckShip && ships.find((ship) => ship.id === struckShip.id).hits.length === struckShip.length
    ? struckShip.id
    : null
  const allSunk = ships.every((ship) => ship.hits.length === ship.length)
  const historyEntry = { playerId, targetId: target.id, cell: key, row, column, result, sunkShip, firedAt: timestamp(now) }
  return touch({
    ...game,
    phase: allSunk ? 'complete' : 'battle',
    turnIndex: allSunk ? game.turnIndex : 1 - game.turnIndex,
    winnerId: allSunk ? playerId : null,
    boards: { ...game.boards, [target.id]: { ...targetBoard, ships, shots: { ...targetBoard.shots, [key]: result } } },
    history: [...game.history, historyEntry],
  }, now)
}

export function getBattleshipCellState(game, ownerId, row, column, { revealShips = false } = {}) {
  const board = game.boards[ownerId]
  const key = cellKey(row, column)
  const shot = board.shots[key] ?? null
  const ship = board.ships.find((entry) => entry.cells.includes(key))
  return {
    key,
    shot,
    ship: revealShips || shot === 'hit' ? ship?.id ?? null : null,
    sunk: Boolean(ship && ship.hits.length === ship.length),
  }
}

function parseCell(value) {
  if (typeof value !== 'string' || !/^\d:\d$/.test(value)) return null
  const [row, column] = value.split(':').map(Number)
  return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE ? { row, column } : null
}

function isStraightContiguous(cells) {
  const parsed = cells.map(parseCell)
  if (parsed.some((cell) => !cell)) return false
  const rows = [...new Set(parsed.map((cell) => cell.row))]
  const columns = [...new Set(parsed.map((cell) => cell.column))]
  if (rows.length === 1) {
    const sorted = parsed.map((cell) => cell.column).sort((a, b) => a - b)
    return sorted.every((column, index) => index === 0 || column === sorted[index - 1] + 1)
  }
  if (columns.length === 1) {
    const sorted = parsed.map((cell) => cell.row).sort((a, b) => a - b)
    return sorted.every((row, index) => index === 0 || row === sorted[index - 1] + 1)
  }
  return false
}

function validTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

export function isValidBattleshipGame(game) {
  if (!game || game.schemaVersion !== BATTLESHIP_SCHEMA_VERSION || !['placement', 'battle', 'complete'].includes(game.phase)) return false
  if (!Array.isArray(game.players) || game.players.length !== 2 || new Set(game.players.map((player) => player.id)).size !== 2) return false
  if (game.players.some((player) => typeof player.id !== 'string' || !player.id || typeof player.name !== 'string' || !player.name.trim())) return false
  if (!Number.isInteger(game.revision) || game.revision < 1 || !Array.isArray(game.history) || !game.boards) return false
  if (!validTimestamp(game.createdAt) || !validTimestamp(game.updatedAt)) return false
  const playerIds = new Set(game.players.map((player) => player.id))
  for (const player of game.players) {
    const board = game.boards[player.id]
    if (!board || !Array.isArray(board.ships) || !board.shots || board.ships.length > FLEET.length) return false
    if (new Set(board.ships.map((ship) => ship.id)).size !== board.ships.length) return false
    const occupied = board.ships.flatMap((ship) => ship.cells)
    if (new Set(occupied).size !== occupied.length) return false
    if (board.ships.some((ship) => !SHIP_BY_ID.has(ship.id)
      || ship.length !== SHIP_BY_ID.get(ship.id).length
      || !Array.isArray(ship.cells)
      || ship.cells.length !== ship.length
      || !isStraightContiguous(ship.cells)
      || !Array.isArray(ship.hits)
      || new Set(ship.hits).size !== ship.hits.length
      || ship.hits.some((hit) => !ship.cells.includes(hit)))) return false
    const shotEntries = Object.entries(board.shots)
    if (shotEntries.some(([key, result]) => !parseCell(key) || !['hit', 'miss'].includes(result))) return false
    const occupiedSet = new Set(occupied)
    if (shotEntries.some(([key, result]) => (result === 'hit') !== occupiedSet.has(key))) return false
    if (board.ships.some((ship) => {
      const expectedHits = ship.cells.filter((key) => board.shots[key] === 'hit')
      return expectedHits.length !== ship.hits.length || expectedHits.some((key) => !ship.hits.includes(key))
    })) return false
  }
  if (game.phase !== 'placement' && game.players.some((player) => !allShipsPlaced(game.boards[player.id]))) return false
  if (!Number.isInteger(game.placementIndex) || game.placementIndex < 0 || game.placementIndex > 1
    || !Number.isInteger(game.turnIndex) || game.turnIndex < 0 || game.turnIndex > 1) return false

  const historyKeys = new Set()
  for (let index = 0; index < game.history.length; index += 1) {
    const entry = game.history[index]
    if (!entry || !playerIds.has(entry.playerId) || !playerIds.has(entry.targetId) || entry.playerId === entry.targetId) return false
    if (index > 0 && entry.playerId === game.history[index - 1].playerId) return false
    if (!Number.isInteger(entry.row) || !Number.isInteger(entry.column) || entry.cell !== cellKey(entry.row, entry.column) || !parseCell(entry.cell)) return false
    if (!['hit', 'miss'].includes(entry.result) || game.boards[entry.targetId].shots[entry.cell] !== entry.result || !validTimestamp(entry.firedAt)) return false
    if (entry.sunkShip !== null && (!SHIP_BY_ID.has(entry.sunkShip) || !game.boards[entry.targetId].ships.some((ship) => ship.id === entry.sunkShip && ship.hits.length === ship.length))) return false
    const historyKey = `${entry.targetId}|${entry.cell}`
    if (historyKeys.has(historyKey)) return false
    historyKeys.add(historyKey)
  }
  const shotCount = game.players.reduce((sum, player) => sum + Object.keys(game.boards[player.id].shots).length, 0)
  if (shotCount !== game.history.length) return false

  if (game.phase === 'placement') {
    if (game.winnerId !== null || game.history.length !== 0 || game.players.some((player) => Object.keys(game.boards[player.id].shots).length)) return false
    if (game.placementIndex === 0 && game.boards[game.players[1].id].ships.length !== 0) return false
    if (game.placementIndex === 1 && !allShipsPlaced(game.boards[game.players[0].id])) return false
  } else if (game.phase === 'battle') {
    if (game.winnerId !== null) return false
    const last = game.history.at(-1)
    if (last && game.players[game.turnIndex].id === last.playerId) return false
  } else {
    if (!playerIds.has(game.winnerId) || game.players[game.turnIndex].id !== game.winnerId) return false
    const loser = game.players.find((player) => player.id !== game.winnerId)
    if (!game.boards[loser.id].ships.every((ship) => ship.hits.length === ship.length)) return false
    if (game.history.at(-1)?.playerId !== game.winnerId) return false
  }
  return true
}
