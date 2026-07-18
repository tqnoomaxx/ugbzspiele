'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import { ArrowRightIcon, CheckIcon, CloseIcon, PlusIcon, TrophyIcon, UndoIcon, UserIcon } from '../components/Icons.jsx'
import {
  addKniffelPlayer,
  getDigitalScoreOptions,
  getKniffelRanking,
  getPlayerTotals,
  KNIFFEL_CATEGORIES,
  LOWER_CATEGORIES,
  recordManualScore,
  removeKniffelPlayer,
  scoreDigitalCategory,
  startKniffelGame,
  toggleHeldDie,
  undoLastKniffelTurn,
  UPPER_CATEGORIES,
} from '../games/kniffel/gameEngine.js'
import { kniffelRoomRepository } from '../games/kniffel/roomRepository.js'

const PIP_POSITIONS = {
  1: ['mc'], 2: ['tl', 'br'], 3: ['tl', 'mc', 'br'],
  4: ['tl', 'tr', 'bl', 'br'], 5: ['tl', 'tr', 'mc', 'bl', 'br'],
  6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br'],
}

const CELEBRATION_PARTICLES = Array.from({ length: 30 }, (_, index) => ({
  id: index,
  style: {
    '--kf-particle-delay': `${(index % 6) * 35}ms`,
    '--kf-particle-drift': `${-46 + ((index * 37) % 92)}vw`,
    '--kf-particle-lift': `${-20 - ((index * 19) % 34)}vh`,
    '--kf-particle-rotate': `${180 + ((index * 83) % 540)}deg`,
  },
}))

function haptic(pattern) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(pattern)
}

function Dice({ held, index, onToggle, rolling, value }) {
  const disabled = value == null
  return (
    <button aria-label={disabled ? `Würfel ${index + 1}` : `Würfel ${index + 1}: ${value}${held ? ', gehalten' : ''}`} aria-pressed={held} className={`kf-die ${held ? 'is-held' : ''} ${disabled ? 'is-empty' : ''} ${rolling && !held ? 'is-rolling' : ''}`} disabled={disabled || rolling} onClick={onToggle} style={{ '--kf-die-index': index, '--kf-die-drift-out': `${(2 - index) * 5}px`, '--kf-die-drift-back': `${(index - 2) * 4}px` }} type="button">
      <span className="kf-die__face">{(PIP_POSITIONS[value] ?? []).map((position) => <i className={`pip pip--${position}`} key={position} />)}</span>
      <small>{held ? 'Gehalten' : disabled ? 'Bereit' : 'Antippen zum Halten'}</small>
    </button>
  )
}

function Celebration({ event }) {
  if (!event) return null
  const particleCount = event.tone === 'special' ? CELEBRATION_PARTICLES.length : event.tone === 'zero' ? 8 : 18
  return (
    <div aria-live="polite" className={`kf-celebration kf-celebration--${event.tone}`} role="status">
      <div aria-hidden="true" className="kf-celebration__shockwave" />
      <div aria-hidden="true" className="kf-celebration__particles">
        {CELEBRATION_PARTICLES.slice(0, particleCount).map((particle) => <i key={particle.id} style={particle.style} />)}
      </div>
      <div className="kf-celebration__score" key={event.id}>
        <span>{event.label}</span>
        <strong>{event.score}</strong>
      </div>
    </div>
  )
}

function SyncBadge({ state }) {
  const labels = { saved: 'Gespeichert', syncing: 'Wird synchronisiert', local: 'Nur lokal gesichert' }
  return <span className={`kf-sync kf-sync--${state}`}><i /> {labels[state] ?? labels.saved}</span>
}

function PlayerRail({ activeId, onSelect, room, selectedId }) {
  const rankings = room.game ? getKniffelRanking(room) : room.players
  return (
    <aside className="kf-player-rail">
      <div className="kf-panel-title"><span>Spielrunde</span><h2>Am Tisch</h2></div>
      <div className="kf-player-list">
        {rankings.map((player, index) => (
          <button className={`${player.id === activeId ? 'is-active' : ''} ${player.id === selectedId ? 'is-selected' : ''}`} key={player.id} onClick={() => onSelect(player.id)} type="button">
            <b>{room.game ? (player.rank ?? index + 1) : index + 1}</b>
            <span><strong>{player.name}</strong><small>{player.id === activeId ? 'Jetzt am Zug' : room.game ? `${player.total} Punkte` : player.isHost ? 'Spielleitung' : player.isDemo ? 'Lokaler Gast' : 'Verbunden'}</small></span>
            {player.isHost ? <em>Leitung</em> : null}
          </button>
        ))}
      </div>
    </aside>
  )
}

function ScoreRow({ category, onScore, option, score }) {
  const available = score === null && option?.selectable
  return (
    <tr className={option?.forced ? 'is-forced' : ''}>
      <th scope="row"><span>{category.label}</span>{category.fixedScore ? <small>{category.fixedScore} Punkte</small> : null}</th>
      <td>
        {score !== null ? <strong className="kf-score-stamped" key={score}>{score}</strong> : available ? (
          <button aria-label={`${category.label} mit ${option.score} Punkten werten`} onClick={onScore} type="button">
            <span>{option.score}</span><small>{option.forced ? 'Pflichtfeld' : 'Eintragen'}</small>
          </button>
        ) : <span className="kf-score-empty">—</span>}
      </td>
    </tr>
  )
}

function ScoreSheet({ canScore, onScore, player, room }) {
  const sheet = room.game.sheets[player.id]
  const totals = getPlayerTotals(room, player.id)
  const options = canScore && room.options.playMode === 'digital' ? getDigitalScoreOptions(room) : {}
  const rows = (categories) => categories.map((category) => (
    <ScoreRow category={category} key={category.id} onScore={() => onScore(category.id)} option={options[category.id]} score={sheet.scores[category.id]} />
  ))
  return (
    <aside className="kf-score-sheet">
      <div className="kf-score-sheet__head"><div><span>Punkteblock</span><h2>{player.name}</h2></div><b key={totals.total}>{totals.total}</b></div>
      <div className="kf-score-scroll">
        <table><tbody>{rows(UPPER_CATEGORIES)}
          <tr className="kf-subtotal"><th>Oben + Bonus</th><td>{totals.upperSum} + {totals.upperBonus}</td></tr>
          {rows(LOWER_CATEGORIES)}
          <tr className="kf-subtotal"><th>Kniffel-Bonus</th><td>{totals.kniffelBonus}</td></tr>
        </tbody></table>
      </div>
      <div className="kf-score-total"><span>Gesamt</span><strong key={totals.total}>{totals.total}</strong></div>
      {canScore && room.options.playMode === 'digital' && room.game.rollCount > 0 ? <p>Tippe auf einen Vorschlag, um den Zug verbindlich einzutragen.</p> : null}
    </aside>
  )
}

function Lobby({ actorId, onAction, room }) {
  const [name, setName] = useState('')
  const host = actorId === room.hostId
  const shared = room.options.deviceMode === 'shared'
  const addLocal = (event) => {
    event.preventDefault()
    onAction((current) => addKniffelPlayer(current, name || `Gast ${current.players.length + 1}`, { isDemo: true }))
    setName('')
  }
  return (
    <section className="kf-waiting-room">
      <div className="kf-waiting-copy"><span className="kf-kicker">Der Tisch ist bereit</span><h1>{shared ? 'Wer spielt mit?' : 'Wartet auf eure Runde.'}</h1><p>{shared ? 'Trage alle Namen ein. Auch eine Solo-Partie kann direkt beginnen.' : 'Teile den Raumcode. Sobald alle beigetreten sind, startet die Spielleitung.'}</p></div>
      <div className="kf-waiting-card">
        <div className="kf-waiting-players">{room.players.map((player) => (
          <div key={player.id}><span><UserIcon size={20} /></span><strong>{player.name}</strong><small>{player.isHost ? 'Spielleitung' : player.isDemo ? 'Lokal' : 'Online'}</small>{host && player.id !== room.hostId ? <button aria-label={`${player.name} entfernen`} onClick={() => onAction((current) => removeKniffelPlayer(current, player.id, actorId))} type="button"><CloseIcon size={17} /></button> : null}</div>
        ))}</div>
        {host && shared ? <form className="kf-add-player" onSubmit={addLocal}><input maxLength={28} onChange={(event) => setName(event.target.value)} placeholder="Nächster Name" value={name} /><Button variant="outline" type="submit"><PlusIcon size={18} /> Hinzufügen</Button></form> : null}
        {host ? <Button className="kf-start" onClick={() => onAction((current) => startKniffelGame(current, actorId))}>Partie starten <ArrowRightIcon size={20} /></Button> : <p className="kf-host-wait">Die Spielleitung startet gleich.</p>}
      </div>
    </section>
  )
}

function DigitalTurn({ actorId, canAct, onAction, onRoll, room }) {
  const [rolling, setRolling] = useState(false)
  const active = room.players.find((player) => player.id === room.game.activePlayerId)
  useEffect(() => {
    if (canAct || room.game.rollCount === 0) return undefined
    setRolling(true)
    const timeout = window.setTimeout(() => setRolling(false), 920)
    return () => window.clearTimeout(timeout)
  }, [canAct, room.game.rollCount])
  const roll = async () => {
    if (rolling) return
    setRolling(true)
    haptic([18, 28, 16])
    const startedAt = Date.now()
    await onRoll()
    const remaining = Math.max(0, 920 - (Date.now() - startedAt))
    window.setTimeout(() => setRolling(false), remaining)
  }
  return (
    <section className={`kf-turn-stage ${rolling ? 'is-rolling' : ''}`}>
      <div className="kf-turn-heading"><span className="kf-kicker">Runde {room.game.roundNumber} von 13</span><h1>{active.name} würfelt.</h1><p>{canAct ? 'Bis zu dreimal würfeln. Tippe Würfel an, die du behalten möchtest.' : 'Der aktuelle Wurf erscheint bei dir automatisch.'}</p></div>
      <div className={`kf-dice-tray ${rolling ? 'is-rolling' : ''}`}>{room.game.dice.map((die, index) => <Dice held={room.game.held[index]} index={index} key={index} onToggle={() => { haptic(18); onAction((current) => toggleHeldDie(current, actorId, index)) }} rolling={rolling} value={die} />)}</div>
      <div className="kf-roll-controls"><div><span>Würfe</span><b>{[1, 2, 3].map((rollNumber) => <i className={rollNumber <= room.game.rollCount ? 'is-used' : ''} key={rollNumber}>{rollNumber}</i>)}</b></div><Button className="kf-roll-button" disabled={!canAct || room.game.rollCount >= 3 || rolling} onClick={roll}>{rolling ? 'Würfel fliegen …' : room.game.rollCount ? 'Noch einmal würfeln' : 'Würfeln'} <span aria-hidden="true" className="kf-roll-cube">⚄</span></Button></div>
      {room.game.rollCount >= 3 && canAct ? <p className="kf-turn-hint">Drei Würfe sind gespielt. Wähle jetzt rechts ein Punktefeld.</p> : null}
    </section>
  )
}

function ManualTurn({ actorId, canAct, onAction, onCelebrate, room }) {
  const active = room.players.find((player) => player.id === room.game.activePlayerId)
  const open = KNIFFEL_CATEGORIES.filter((category) => room.game.sheets[active.id].scores[category.id] === null)
  const [categoryId, setCategoryId] = useState(open[0]?.id ?? '')
  const [score, setScore] = useState('')
  const [extraKniffel, setExtraKniffel] = useState(false)
  useEffect(() => { setCategoryId(open[0]?.id ?? ''); setScore(''); setExtraKniffel(false) }, [active.id, room.game.turnIndex])
  const submit = async (event) => {
    event.preventDefault()
    const next = await onAction((current) => recordManualScore(current, actorId, categoryId, score, { extraKniffel }))
    if (next) onCelebrate(categoryId, Number(score), extraKniffel ? 50 : 0)
  }
  return (
    <section className="kf-turn-stage kf-turn-stage--manual">
      <div className="kf-real-dice" aria-hidden="true"><span>⚄</span><span>⚂</span><span>⚅</span></div>
      <div className="kf-turn-heading"><span className="kf-kicker">Runde {room.game.roundNumber} von 13 · Echte Würfel</span><h1>{active.name} ist dran.</h1><p>Würfelt wie gewohnt am Tisch. Danach wird genau ein Feld eingetragen.</p></div>
      {canAct ? <form className="kf-manual-entry" onSubmit={submit}>
        <label><span>Kategorie</span><select onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>{open.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
        <label><span>Punkte</span><input inputMode="numeric" min="0" onChange={(event) => setScore(event.target.value)} placeholder="0" required type="number" value={score} /></label>
        <label className="kf-check"><input checked={extraKniffel} onChange={(event) => setExtraKniffel(event.target.checked)} type="checkbox" /><span>Zusätzlicher Kniffel (+50)</span></label>
        <Button type="submit"><CheckIcon size={20} /> Eintragen & weiter</Button>
      </form> : <p className="kf-host-wait">Die Spielleitung trägt das Ergebnis am gemeinsamen Punkteblock ein.</p>}
    </section>
  )
}

function CompleteGame({ actorId, onUndo, room }) {
  const ranking = getKniffelRanking(room)
  return (
    <section className="kf-finale">
      <TrophyIcon size={52} /><span className="kf-kicker">Partie beendet</span><h1>{ranking[0].name} gewinnt!</h1>
      <div className="kf-ranking">{ranking.map((player) => <div key={player.id}><b>{player.rank}</b><span><strong>{player.name}</strong><small>{player.filled} Felder · Bonus {player.upperBonus + player.kniffelBonus}</small></span><em>{player.total}</em></div>)}</div>
      {actorId === room.hostId ? <Button onClick={onUndo} variant="outline"><UndoIcon size={19} /> Letzten Eintrag zurücknehmen</Button> : null}
    </section>
  )
}

export default function KniffelGamePage() {
  const [room, setRoom] = useState(null)
  const [session, setSession] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [syncState, setSyncState] = useState(kniffelRoomRepository.getSyncState())
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [celebration, setCelebration] = useState(null)

  const loadRoom = useCallback(async () => {
    const currentSession = kniffelRoomRepository.loadSession()
    if (!currentSession) { setLoading(false); return }
    setSession(currentSession)
    const loaded = await kniffelRoomRepository.load(currentSession.roomCode)
    setRoom((current) => !current || !loaded || loaded.revision >= current.revision ? loaded : current)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadRoom().catch((loadError) => { setError(loadError.message); setLoading(false) })
    const stopRooms = kniffelRoomRepository.subscribe((event) => { if (!event.code || event.code === kniffelRoomRepository.loadSession()?.roomCode) loadRoom().catch(() => {}) })
    const stopSync = kniffelRoomRepository.subscribeSync(setSyncState)
    const retry = window.setInterval(() => { const current = kniffelRoomRepository.loadSession(); if (current) kniffelRoomRepository.flushPending(current.roomCode) }, 12000)
    return () => { stopRooms(); stopSync(); window.clearInterval(retry) }
  }, [loadRoom])

  useEffect(() => { if (room?.game?.activePlayerId) setSelectedId(room.game.activePlayerId) }, [room?.game?.activePlayerId])

  useEffect(() => {
    if (!celebration) return undefined
    const timeout = window.setTimeout(() => setCelebration(null), celebration.tone === 'special' ? 2200 : 1500)
    return () => window.clearTimeout(timeout)
  }, [celebration])

  const onAction = async (mutation) => {
    if (!room || !session) return
    setError('')
    try { const next = await kniffelRoomRepository.mutate(room.code, mutation); setRoom(next); return next }
    catch (actionError) { setError(actionError.message); await loadRoom().catch(() => {}); return null }
  }

  const onRoll = async () => {
    setError('')
    try { const next = await kniffelRoomRepository.rollDice(room.code, session.playerId); setRoom(next) }
    catch (rollError) { setError(/REVISION/.test(rollError.message) ? 'Der Tisch war schneller. Bitte würfle noch einmal.' : rollError.message); await loadRoom().catch(() => {}) }
  }

  const copyInvite = async () => {
    const link = `${window.location.origin}${appPath('/kniffel')}?code=${room.code}`
    await navigator.clipboard?.writeText(link)
    setCopied(true); window.setTimeout(() => setCopied(false), 1600)
  }

  const exportGame = () => {
    const blob = new Blob([JSON.stringify(room, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `kniffel-${room.code}.json`; anchor.click()
    URL.revokeObjectURL(url)
  }

  const celebrateScore = (categoryId, score, bonus = 0) => {
    const category = KNIFFEL_CATEGORIES.find((entry) => entry.id === categoryId)
    const special = (categoryId === 'kniffel' && score === 50) || bonus > 0 || ['largeStraight', 'fullHouse'].includes(categoryId) && score > 0
    const label = categoryId === 'kniffel' && score === 50
      ? 'KNIFFEL!'
      : bonus > 0
        ? 'BONUS-KNIFFEL!'
        : score === 0
          ? `${category?.label ?? 'Feld'} gestrichen`
          : category?.label ?? 'Punkte'
    const tone = score + bonus === 0 ? 'zero' : special ? 'special' : 'score'
    haptic(tone === 'special' ? [35, 45, 70, 45, 110] : tone === 'zero' ? 18 : [24, 35, 55])
    setCelebration({ id: Date.now(), label, score: score + bonus, tone })
  }

  const scoreCategory = async (categoryId) => {
    const option = getDigitalScoreOptions(room)[categoryId]
    const next = await onAction((current) => scoreDigitalCategory(current, actorId, categoryId))
    if (next && option) celebrateScore(categoryId, option.score, option.bonus)
  }

  if (loading) return <div className="kf-page kf-loading"><span>Kniffel</span><p>Der Spielstand wird geladen …</p></div>
  if (!room || !session) return <div className="kf-page"><AppHeader variant="dark" backTo="/kniffel" backLabel="Kniffel" /><main className="kf-missing"><span>Kein Spielstand gefunden</span><h1>Dieser Tisch ist nicht mehr im Browser gespeichert.</h1><a href={appPath('/kniffel')}>Neuen Tisch öffnen</a></main></div>

  const actorId = session.playerId
  const activeId = room.game?.activePlayerId
  const canAct = room.status === 'playing' && (room.options.deviceMode === 'shared' ? actorId === room.hostId : actorId === activeId)
  const viewedPlayer = room.players.find((player) => player.id === (selectedId || activeId)) ?? room.players[0]

  return (
    <div className="kf-page kf-page--game">
      <Celebration event={celebration} />
      <AppHeader variant="dark" home />
      <div className="kf-room-bar"><div><span>{room.options.deviceMode === 'separate' ? 'Online-Raum' : 'Gemeinsamer Tisch'}</span><strong>{room.name}</strong></div><button onClick={copyInvite} type="button"><small>{copied ? 'Link kopiert' : 'Raumcode'}</small><b>{room.code}</b></button><SyncBadge state={syncState} /><button className="kf-export" onClick={exportGame} type="button">Sicherung exportieren</button></div>
      {error ? <div aria-live="polite" className="kf-game-error">{error}<button onClick={() => setError('')} type="button"><CloseIcon size={17} /></button></div> : null}
      {room.status === 'lobby' ? <main className="kf-game-shell kf-game-shell--lobby"><PlayerRail activeId={null} onSelect={setSelectedId} room={room} selectedId={selectedId} /><Lobby actorId={actorId} onAction={onAction} room={room} /></main> : null}
      {room.status === 'playing' ? <main className="kf-game-shell"><PlayerRail activeId={activeId} onSelect={setSelectedId} room={room} selectedId={viewedPlayer.id} />{room.options.playMode === 'digital' ? <DigitalTurn actorId={actorId} canAct={canAct} key={`digital-${room.game.turnIndex}`} onAction={onAction} onRoll={onRoll} room={room} /> : <ManualTurn actorId={actorId} canAct={canAct} key={`manual-${room.game.turnIndex}`} onAction={onAction} onCelebrate={celebrateScore} room={room} />}<ScoreSheet canScore={canAct && viewedPlayer.id === activeId} onScore={scoreCategory} player={viewedPlayer} room={room} />{actorId === room.hostId && room.game.history.length ? <button className="kf-undo" onClick={() => onAction((current) => undoLastKniffelTurn(current, actorId))} type="button"><UndoIcon size={17} /> Letzten Zug rückgängig</button> : null}</main> : null}
      {room.status === 'complete' ? <main className="kf-game-shell kf-game-shell--complete"><PlayerRail activeId={null} onSelect={setSelectedId} room={room} selectedId={viewedPlayer.id} /><CompleteGame actorId={actorId} onUndo={() => onAction((current) => undoLastKniffelTurn(current, actorId))} room={room} /><ScoreSheet canScore={false} onScore={() => {}} player={viewedPlayer} room={room} /></main> : null}
    </div>
  )
}
