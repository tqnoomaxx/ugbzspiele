'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import {
  BOARD_SIZE,
  FLEET,
  confirmBattleshipFleet,
  fireBattleshipShot,
  getBattleshipCellState,
  isValidBattleshipGame,
  placeBattleship,
  randomizeBattleshipFleet,
  startOnlineBattleshipGame,
} from '../games/battleship/gameEngine.js'
import { battleshipRepository } from '../games/battleship/gameRepository.js'
import { battleshipRoomRepository } from '../games/battleship/roomRepository.js'

const COLUMNS = Array.from({ length: BOARD_SIZE }, (_, index) => String.fromCharCode(65 + index))
const ROWS = Array.from({ length: BOARD_SIZE }, (_, index) => index)

function coordinate(row, column) { return `${COLUMNS[column]}${row + 1}` }

function activePlayer(game) {
  if (game.phase === 'placement') return game.players[game.placementIndex]
  if (game.phase === 'battle') return game.players[game.turnIndex]
  return null
}

function shipAt(board, row, column) {
  const key = `${row}:${column}`
  return board.ships.find((ship) => ship.cells.includes(key)) ?? null
}

function CellMark({ state }) {
  if (state.shot === 'hit') return <span aria-hidden="true" className="bs-mark bs-mark--hit">×</span>
  if (state.shot === 'miss') return <span aria-hidden="true" className="bs-mark bs-mark--miss">•</span>
  if (state.ship) return <span aria-hidden="true" className="bs-mark bs-mark--ship">■</span>
  return null
}

function Board({ game, interactive = false, label, onCell, ownerId, revealShips, selected }) {
  const owner = game.players.find((player) => player.id === ownerId)
  const board = game.boards[ownerId]
  const [focusCell, setFocusCell] = useState(() => {
    const index = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, cellIndex) => cellIndex)
      .find((cellIndex) => !board.shots[`${Math.floor(cellIndex / BOARD_SIZE)}:${cellIndex % BOARD_SIZE}`]) ?? 0
    return { row: Math.floor(index / BOARD_SIZE), column: index % BOARD_SIZE }
  })

  function moveFocus(event, row, column) {
    const directions = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }
    const direction = directions[event.key]
    if (!interactive || !direction) return
    event.preventDefault()
    let nextRow = row
    let nextColumn = column
    for (let attempt = 0; attempt < BOARD_SIZE * BOARD_SIZE; attempt += 1) {
      nextRow = (nextRow + direction[0] + BOARD_SIZE) % BOARD_SIZE
      nextColumn = (nextColumn + direction[1] + BOARD_SIZE) % BOARD_SIZE
      if (!game.boards[ownerId].shots[`${nextRow}:${nextColumn}`]) break
    }
    setFocusCell({ row: nextRow, column: nextColumn })
    event.currentTarget.closest('.bs-board')?.querySelector(`[data-bs-cell="${nextRow}:${nextColumn}"]`)?.focus()
  }
  return (
    <section className="bs-board-card" aria-label={label}>
      <div className="bs-board-card__head"><span>{label}</span><strong>{owner.name}</strong></div>
      <div className="bs-board-wrap">
        <div className="bs-board" role="grid" aria-label={`${label} von ${owner.name}`}>
          <span aria-hidden="true" className="bs-axis bs-axis--corner" />
          {COLUMNS.map((column) => <span aria-hidden="true" className="bs-axis" key={column}>{column}</span>)}
          {ROWS.map((row) => (
            <div className="bs-board-row" role="row" key={row}>
              <span aria-hidden="true" className="bs-axis">{row + 1}</span>
              {COLUMNS.map((_, column) => {
                const state = getBattleshipCellState(game, ownerId, row, column, { revealShips })
                const isSelected = selected?.row === row && selected?.column === column
                const unavailable = interactive && Boolean(state.shot)
                const parts = [coordinate(row, column)]
                if (state.shot === 'hit') parts.push(state.sunk ? 'Treffer, Schiff versenkt' : 'Treffer')
                else if (state.shot === 'miss') parts.push('Fehlschuss')
                else if (state.ship) parts.push('eigenes Schiff')
                else parts.push('Wasser')
                if (isSelected) parts.push('ausgewählt')
                return (
                  <button
                    aria-label={parts.join(', ')}
                    aria-pressed={interactive ? isSelected : undefined}
                    className={`bs-cell ${state.ship ? 'has-ship' : ''} ${state.shot ? `is-${state.shot}` : ''} ${state.sunk ? 'is-sunk' : ''} ${isSelected ? 'is-selected' : ''}`}
                    disabled={!interactive || unavailable}
                    data-bs-cell={`${row}:${column}`}
                    key={state.key}
                    onClick={() => { setFocusCell({ row, column }); onCell?.(row, column) }}
                    onKeyDown={(event) => moveFocus(event, row, column)}
                    role="gridcell"
                    tabIndex={interactive && focusCell.row === row && focusCell.column === column ? 0 : -1}
                    type="button"
                  >
                    <CellMark state={state} />
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HandoffScreen({ game, onUnlock }) {
  const player = activePlayer(game)
  if (!player) return null
  const label = game.phase === 'placement' ? 'Flotte aufstellen' : 'Bereit zum Feuern'
  const lastShot = game.history.at(-1)
  return (
    <div className="bs-handoff" role="dialog" aria-labelledby="bs-handoff-title" aria-modal="true">
      <div className="bs-handoff__radar" aria-hidden="true"><i /><span>⌖</span></div>
      <span className="bs-kicker">Privater Übergabeschirm</span>
      <h1 id="bs-handoff-title">Gerät an {player.name} weitergeben.</h1>
      <p>Das Spielfeld ist vollständig verdeckt. Erst {player.name} darf es wieder entsperren.</p>
      {lastShot ? <p className="bs-handoff__last">Letzter Schuss: {coordinate(lastShot.row, lastShot.column)} · {lastShot.result === 'hit' ? (lastShot.sunkShip ? 'Schiff versenkt' : 'Treffer') : 'Fehlschuss'}</p> : null}
      <Button autoFocus onClick={onUnlock} type="button">Ich bin {player.name} · {label}</Button>
      <small>Beim Wechseln der App oder des Browserfensters wird automatisch wieder gesperrt.</small>
    </div>
  )
}

function PlacementScreen({ game, onAction, online, player }) {
  const board = game.boards[player.id]
  const [shipId, setShipId] = useState(() => FLEET.find((ship) => !board.ships.some((entry) => entry.id === ship.id))?.id ?? FLEET[0].id)
  const [orientation, setOrientation] = useState('horizontal')
  const complete = board.ships.length === FLEET.length

  async function place(row, column) {
    const next = await onAction((current) => placeBattleship(current, player.id, shipId, row, column, orientation))
    if (!next) return
    const nextShip = FLEET.find((ship) => !next.boards[player.id].ships.some((entry) => entry.id === ship.id))
    if (nextShip) setShipId(nextShip.id)
  }

  return (
    <main className="bs-game-shell">
      <header className="bs-game-heading">
        <div><span className="bs-kicker">Flottenaufstellung · {game.placementIndex + 1} von 2</span><h1>{player.name}, positioniere deine Flotte.</h1><p>Schiffe dürfen sich berühren, aber niemals überlappen. Du kannst jedes Schiff bis zur Bestätigung neu setzen.</p></div>
        <div className="bs-local-badge"><i /> {online ? 'Online synchronisiert' : 'Nur auf diesem Gerät'}</div>
      </header>

      <div className="bs-placement-layout">
        <Board game={game} interactive label="Deine Gewässer" onCell={place} ownerId={player.id} revealShips />
        <aside className="bs-fleet-panel">
          <div><span className="bs-step">01</span><h2>Schiff wählen</h2></div>
          <div className="bs-fleet-list">
            {FLEET.map((ship) => {
              const placed = board.ships.some((entry) => entry.id === ship.id)
              return (
                <button aria-pressed={shipId === ship.id} className={shipId === ship.id ? 'is-selected' : ''} key={ship.id} onClick={() => setShipId(ship.id)} type="button">
                  <span className="bs-ship-shape" aria-hidden="true">{Array.from({ length: ship.length }, (_, index) => <i key={index} />)}</span>
                  <span><strong>{ship.name}</strong><small>{ship.length} Felder</small></span>
                  <b aria-label={placed ? 'Platziert' : 'Noch offen'}>{placed ? '✓' : '○'}</b>
                </button>
              )
            })}
          </div>

          <fieldset className="bs-orientation">
            <legend>Ausrichtung</legend>
            <div>
              <button aria-pressed={orientation === 'horizontal'} className={orientation === 'horizontal' ? 'is-selected' : ''} onClick={() => setOrientation('horizontal')} type="button">↔ Waagerecht</button>
              <button aria-pressed={orientation === 'vertical'} className={orientation === 'vertical' ? 'is-selected' : ''} onClick={() => setOrientation('vertical')} type="button">↕ Senkrecht</button>
            </div>
          </fieldset>

          <button className="bs-randomize" onClick={() => onAction((current) => randomizeBattleshipFleet(current, player.id))} type="button"><span aria-hidden="true">⤨</span> Flotte zufällig aufstellen</button>
          <div className="bs-fleet-progress"><span>{board.ships.length} von {FLEET.length} Schiffen platziert</span><div><i style={{ width: `${board.ships.length / FLEET.length * 100}%` }} /></div></div>
          <Button className="bs-confirm-fleet" disabled={!complete} onClick={() => onAction((current) => confirmBattleshipFleet(current, player.id), { relock: true })} type="button">Flotte bestätigen &amp; verdecken</Button>
        </aside>
      </div>
    </main>
  )
}

function ShotResult({ complete, entry, onContinue, online }) {
  const label = entry.result === 'hit' ? (entry.sunkShip ? 'Schiff versenkt!' : 'Treffer!') : 'Daneben.'
  return (
    <div className={`bs-shot-result bs-shot-result--${entry.result}`} role="dialog" aria-labelledby="bs-shot-title" aria-modal="true">
      <div className="bs-shot-result__mark" aria-hidden="true">{entry.result === 'hit' ? '×' : '•'}</div>
      <span className="bs-kicker">Schuss auf {coordinate(entry.row, entry.column)}</span>
      <h2 id="bs-shot-title">{label}</h2>
      <p>{complete ? 'Die letzte Flotte ist versenkt. Die Partie ist entschieden.' : online ? 'Der Zug ist beendet. Das andere Gerät wurde automatisch aktualisiert.' : 'Der Zug ist beendet. Verdecke jetzt das Feld und gib das Gerät weiter.'}</p>
      <Button autoFocus onClick={onContinue} type="button">{complete ? 'Endergebnis ansehen' : online ? 'Ergebnis schließen' : 'Brett verdecken & weitergeben'}</Button>
    </div>
  )
}

function BattleScreen({ game, onAction, player, onShotResult }) {
  const opponent = game.players.find((entry) => entry.id !== player.id)
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('target')
  const ownHits = Object.values(game.boards[player.id].shots).filter((value) => value === 'hit').length
  const targetHits = Object.values(game.boards[opponent.id].shots).filter((value) => value === 'hit').length

  function selectTarget(row, column) {
    setSelected({ row, column })
  }

  async function fire() {
    if (!selected) return
    const next = await onAction((current) => fireBattleshipShot(current, player.id, selected.row, selected.column))
    if (!next) return
    onShotResult(next.history.at(-1))
    setSelected(null)
  }

  function switchBoardTab(event, currentTab) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    const nextTab = event.key === 'Home' ? 'target' : event.key === 'End' ? 'own' : currentTab === 'target' ? 'own' : 'target'
    setTab(nextTab)
    const index = nextTab === 'target' ? 0 : 1
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[index]?.focus()
  }

  return (
    <main className="bs-game-shell">
      <header className="bs-turn-header">
        <div><span className="bs-kicker">Zug {game.history.length + 1}</span><h1>{player.name} ist am Zug.</h1><p>Wähle zuerst ein Feld. Der Schuss fällt erst nach deiner Bestätigung.</p></div>
        <div className="bs-battle-score" aria-label="Trefferstand"><span><small>Deine Treffer</small><strong>{targetHits} / 17</strong></span><span><small>Gegentreffer</small><strong>{ownHits} / 17</strong></span></div>
      </header>

      <div className="bs-board-tabs" role="tablist" aria-label="Spielfelder">
        <button aria-controls="bs-target-panel" aria-selected={tab === 'target'} className={tab === 'target' ? 'is-selected' : ''} id="bs-target-tab" onClick={() => setTab('target')} onKeyDown={(event) => switchBoardTab(event, 'target')} role="tab" tabIndex={tab === 'target' ? 0 : -1} type="button">Zielraster</button>
        <button aria-controls="bs-own-panel" aria-selected={tab === 'own'} className={tab === 'own' ? 'is-selected' : ''} id="bs-own-tab" onClick={() => setTab('own')} onKeyDown={(event) => switchBoardTab(event, 'own')} role="tab" tabIndex={tab === 'own' ? 0 : -1} type="button">Eigene Flotte</button>
      </div>

      <div className={`bs-battle-layout bs-battle-layout--${tab}`}>
        <div aria-labelledby="bs-target-tab" className="bs-battle-target" id="bs-target-panel" role="tabpanel">
          <Board game={game} interactive label="Zielraster" onCell={selectTarget} ownerId={opponent.id} revealShips={false} selected={selected} />
          <div className="bs-fire-panel" aria-live="polite">
            <div><span>Ausgewähltes Ziel</span><strong>{selected ? coordinate(selected.row, selected.column) : 'Noch kein Feld'}</strong><small>{selected ? 'Bereit zur Bestätigung' : 'Tippe ein freies Feld im Zielraster an.'}</small></div>
            <Button disabled={!selected} onClick={fire} type="button"><span aria-hidden="true">⌖</span> {selected ? `Auf ${coordinate(selected.row, selected.column)} feuern` : 'Ziel auswählen'}</Button>
          </div>
        </div>
        <div aria-labelledby="bs-own-tab" className="bs-battle-own" id="bs-own-panel" role="tabpanel"><Board game={game} label="Eigene Flotte" ownerId={player.id} revealShips /></div>
      </div>

      <div className="bs-legend" aria-label="Legende"><span><i className="is-ship">■</i> Schiff</span><span><i className="is-hit">×</i> Treffer</span><span><i className="is-miss">•</i> Fehlschuss</span></div>
    </main>
  )
}

function OnlineRoomBar({ copied, game, onCopy }) {
  return (
    <div className="bs-room-bar">
      <span><small>Onlineraum</small><strong>{game.name}</strong></span>
      <button onClick={onCopy} type="button"><small>{copied ? 'Link kopiert' : 'Raumcode'}</small><b>{game.code}</b></button>
      <span className="bs-room-bar__sync"><i /> Live synchronisiert</span>
    </div>
  )
}

function OnlineLobby({ actorId, game, onLeave, onStart }) {
  const isHost = actorId === game.hostId
  return (
    <main className="bs-online-lobby">
      <section>
        <span className="bs-kicker">Flottenraum {game.code}</span>
        <h1>{game.players.length === 2 ? 'Beide Kapitäne sind an Bord.' : 'Warte auf die zweite Flotte.'}</h1>
        <p>{isHost ? 'Teile den Raumcode oder den Einladungslink. Sobald ihr zu zweit seid, kannst du die Partie starten.' : 'Die Raumleitung startet, sobald beide Geräte verbunden sind.'}</p>
        <div className="bs-online-players">{game.players.map((player) => <div key={player.id}><span>{player.name.slice(0, 1).toLocaleUpperCase('de-DE')}</span><strong>{player.name}</strong><small>{player.id === game.hostId ? 'Raumleitung' : 'Beigetreten'}</small></div>)}</div>
        {isHost ? <Button disabled={game.players.length !== 2} onClick={onStart} type="button">Partie starten</Button> : <button className="bs-leave-room" onClick={onLeave} type="button">Raum verlassen</button>}
      </section>
    </main>
  )
}

function OnlineWaiting({ actorId, game }) {
  const actor = game.players.find((player) => player.id === actorId)
  const active = activePlayer(game)
  const placement = game.phase === 'placement'
  return (
    <main className="bs-online-waiting">
      <section>
        <div className="bs-handoff__radar" aria-hidden="true"><i /><span>{placement ? '✓' : '⌖'}</span></div>
        <span className="bs-kicker">{placement ? 'Flotte sicher gespeichert' : 'Gegnerischer Zug'}</span>
        <h1>{placement ? 'Warte auf die andere Flotte.' : `${active?.name} ist am Zug.`}</h1>
        <p>{placement ? 'Sobald beide Aufstellungen bestätigt sind, wechselt der Raum automatisch zum ersten Schuss.' : 'Dein Bildschirm aktualisiert sich automatisch, sobald der Schuss gefallen ist.'}</p>
        {!placement && actor ? <Board game={game} label="Deine Flotte" ownerId={actor.id} revealShips /> : null}
      </section>
    </main>
  )
}

function CompleteScreen({ game, onNewGame }) {
  const winner = game.players.find((player) => player.id === game.winnerId)
  const loser = game.players.find((player) => player.id !== game.winnerId)
  const hits = game.history.filter((entry) => entry.playerId === winner.id && entry.result === 'hit').length
  const shots = game.history.filter((entry) => entry.playerId === winner.id).length
  return (
    <main className="bs-result-shell">
      <section className="bs-result-card">
        <div className="bs-result-radar" aria-hidden="true">⌖</div>
        <span className="bs-kicker">Partie beendet</span>
        <h1>{winner.name} gewinnt.</h1>
        <p>Alle fünf Schiffe von {loser.name} sind versenkt.</p>
        <div className="bs-result-stats"><div><strong>{shots}</strong><span>Schüsse</span></div><div><strong>{hits}</strong><span>Treffer</span></div><div><strong>{Math.round(hits / shots * 100)} %</strong><span>Trefferquote</span></div></div>
        <div className="bs-result-actions"><Button onClick={onNewGame} type="button">Neue Partie</Button><a href={appPath('/')}>Zur Startseite</a></div>
      </section>
      <section className="bs-reveal" aria-labelledby="bs-reveal-title">
        <div><span className="bs-step">Logbuch</span><h2 id="bs-reveal-title">Flotten nach Spielende</h2><p>Zur gemeinsamen Kontrolle sind jetzt beide Aufstellungen sichtbar.</p></div>
        <div className="bs-reveal-boards">{game.players.map((player) => <Board game={game} key={player.id} label="Aufgedeckte Flotte" ownerId={player.id} revealShips />)}</div>
      </section>
    </main>
  )
}

export default function BattleshipGamePage() {
  const [game, setGame] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [onlineMode, setOnlineMode] = useState(false)
  const [session, setSession] = useState(null)
  const [locked, setLocked] = useState(true)
  const [viewerId, setViewerId] = useState(null)
  const [shotResult, setShotResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const loadOnlineRoom = useCallback(async () => {
    const activeSession = battleshipRoomRepository.loadSession()
    if (!activeSession) return null
    setSession(activeSession)
    const room = await battleshipRoomRepository.load(activeSession.roomCode)
    if (room && !isValidBattleshipGame(room)) throw new Error('Der Onlineraum enthält keinen gültigen Spielstand.')
    setGame((current) => !current || !room || room.revision >= current.revision ? room : current)
    return room
  }, [])

  useEffect(() => {
    const activeSession = battleshipRoomRepository.isOnline ? battleshipRoomRepository.loadSession() : null
    if (!activeSession) {
      setGame(battleshipRepository.load())
      setLoaded(true)
      return undefined
    }

    setOnlineMode(true)
    loadOnlineRoom().catch((loadError) => setError(loadError.message)).finally(() => setLoaded(true))
    const unsubscribe = battleshipRoomRepository.subscribe((event) => {
      if (!event.code || event.code === battleshipRoomRepository.loadSession()?.roomCode) {
        loadOnlineRoom().catch((loadError) => setError(loadError.message))
      }
    })
    return unsubscribe
  }, [loadOnlineRoom])

  const relock = useCallback(() => {
    setLocked(true)
    setViewerId(null)
    setShotResult(null)
  }, [])

  useEffect(() => {
    if (onlineMode) return undefined
    const handleVisibility = () => { if (document.visibilityState !== 'visible') relock() }
    window.addEventListener('blur', relock)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('blur', relock)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [onlineMode, relock])

  const currentPlayer = useMemo(() => {
    if (!game) return null
    if (onlineMode) return game.players.find((player) => player.id === session?.playerId) ?? null
    return activePlayer(game)
  }, [game, onlineMode, session?.playerId])

  function unlock() {
    if (!currentPlayer) return
    setViewerId(currentPlayer.id)
    setShotResult(null)
    setError('')
    setLocked(false)
  }

  async function runAction(action, { relock: shouldRelock = false } = {}) {
    try {
      const next = onlineMode
        ? await battleshipRoomRepository.mutate(game.code, action)
        : action(game)
      if (!onlineMode && !battleshipRepository.save(next)) throw new Error('Der neue Stand konnte nicht gespeichert werden.')
      if (shouldRelock && !onlineMode) relock()
      setGame(next)
      setError('')
      return next
    } catch (actionError) {
      setError(actionError.message || 'Diese Aktion konnte nicht ausgeführt werden.')
      return null
    }
  }

  function continueAfterShot() {
    setShotResult(null)
    if (game.phase === 'complete') {
      setLocked(false)
      setViewerId(null)
      return
    }
    if (!onlineMode) relock()
  }

  async function newGame() {
    try {
      if (onlineMode) {
        if (session?.playerId === game.hostId) await battleshipRoomRepository.remove(game.code)
        battleshipRoomRepository.clearSession()
      } else battleshipRepository.clear()
      window.location.assign(appPath('/schiffe-versenken'))
    } catch (closeError) { setError(closeError.message) }
  }

  async function leaveOnlineRoom() {
    try {
      if (game.status === 'lobby') await battleshipRoomRepository.leave(game.code, { ...game, revision: game.revision + 1 })
      battleshipRoomRepository.clearSession()
      window.location.assign(appPath('/schiffe-versenken'))
    } catch (leaveError) { setError(leaveError.message) }
  }

  async function copyInvite() {
    const link = `${window.location.origin}${appPath('/schiffe-versenken')}?code=${game.code}`
    await navigator.clipboard?.writeText(link)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  if (!loaded) return <div className="bs-loading" role="status">Spielstand wird geladen …</div>

  if (!game) {
    return (
      <div className="bs-page"><AppHeader backLabel="Zur Startseite" backTo="/" /><main className="bs-missing"><span aria-hidden="true">⌁</span><h1>Kein Spielstand gefunden.</h1><p>Die Partie wurde entfernt oder konnte nicht gelesen werden.</p><a href={appPath('/schiffe-versenken')}>Neue Partie einrichten</a></main></div>
    )
  }

  return (
    <div className="bs-page bs-page--game">
      {(onlineMode || (!locked && !shotResult)) ? <AppHeader backLabel="Spielübersicht" backTo="/schiffe-versenken" /> : null}
      {onlineMode ? <OnlineRoomBar copied={copied} game={game} onCopy={copyInvite} /> : null}
      {error ? <div className="bs-game-error" role="alert"><span>{error}</span><button onClick={() => setError('')} type="button">Schließen</button></div> : null}
      {onlineMode && game.phase === 'lobby' ? <OnlineLobby actorId={session.playerId} game={game} onLeave={leaveOnlineRoom} onStart={() => runAction((current) => startOnlineBattleshipGame(current, session.playerId))} /> : null}
      {!shotResult && game.phase === 'placement' && (onlineMode ? currentPlayer && !game.readyPlayerIds.includes(currentPlayer.id) : viewerId) ? <PlacementScreen game={game} onAction={runAction} online={onlineMode} player={onlineMode ? currentPlayer : game.players.find((player) => player.id === viewerId)} /> : null}
      {!shotResult && onlineMode && game.phase === 'placement' && currentPlayer && game.readyPlayerIds.includes(currentPlayer.id) ? <OnlineWaiting actorId={currentPlayer.id} game={game} /> : null}
      {!shotResult && game.phase === 'battle' && (onlineMode ? currentPlayer?.id === game.players[game.turnIndex].id : viewerId) ? <BattleScreen game={game} onAction={runAction} onShotResult={setShotResult} player={onlineMode ? currentPlayer : game.players.find((player) => player.id === viewerId)} /> : null}
      {!shotResult && onlineMode && game.phase === 'battle' && currentPlayer?.id !== game.players[game.turnIndex].id ? <OnlineWaiting actorId={currentPlayer?.id} game={game} /> : null}
      {game.phase === 'complete' && !shotResult ? <CompleteScreen game={game} onNewGame={newGame} /> : null}
      {shotResult ? <ShotResult complete={game.phase === 'complete'} entry={shotResult} onContinue={continueAfterShot} online={onlineMode} /> : null}
      {!onlineMode && locked && game.phase !== 'complete' ? <HandoffScreen game={game} onUnlock={unlock} /> : null}
    </div>
  )
}
