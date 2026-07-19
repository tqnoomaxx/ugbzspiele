'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import {
  createMemoryGame,
  describeMemoryStatus,
  flipMemoryCard,
  getMemoryRanking,
  MEMORY_PHASES,
  resolveMemoryTurn,
  startOnlineMemoryGame,
} from '../games/memory/gameEngine.js'
import { isStableMemoryState, isValidMemoryGame, memoryGameRepository } from '../games/memory/gameRepository.js'
import { getMemoryAssets, getMemorySet, memoryManifest } from '../games/memory/manifest.js'
import { preloadMemoryAssets } from '../games/memory/preload.js'
import { memoryRoomRepository } from '../games/memory/roomRepository.js'

function columnsForGame(pairCount) {
  const mobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 650px)').matches
  if (mobile) return pairCount <= 8 ? 4 : 5
  if (pairCount <= 8) return 4
  if (pairCount <= 10) return 5
  return 6
}

function OnlineRoomBar({ copied, game, onCopy }) {
  return (
    <div className="memory-room-bar">
      <span><small>Onlineraum</small><strong>{game.name}</strong></span>
      <button onClick={onCopy} type="button"><small>{copied ? 'Link kopiert' : 'Raumcode'}</small><b>{game.code}</b></button>
      <span className="memory-room-bar__sync"><i /> Live synchronisiert</span>
    </div>
  )
}

function OnlineLobby({ actorId, game, onLeave, onStart }) {
  const isHost = actorId === game.hostId
  return (
    <main className="memory-online-lobby">
      <section>
        <span>Memory-Raum {game.code}</span>
        <h1>{game.players.length >= 2 ? 'Die Runde kann starten.' : 'Warte auf weitere Mitspieler.'}</h1>
        <p>{isHost ? 'Teile den Code oder Einladungslink. Ab zwei Personen kannst du die zufälligen Motive mischen und starten.' : 'Die Raumleitung startet die Partie, sobald alle Geräte beigetreten sind.'}</p>
        <div className="memory-lobby-settings"><strong>{game.setLabel}</strong><span>{game.pairCount} zufällige Paare</span></div>
        <div className="memory-online-players">{game.players.map((player) => <div key={player.id}><span>{player.name.slice(0, 1).toLocaleUpperCase('de-DE')}</span><strong>{player.name}</strong><small>{player.id === game.hostId ? 'Raumleitung' : 'Bereit'}</small></div>)}</div>
        {isHost ? <Button disabled={game.players.length < 2} onClick={onStart} type="button">Partie starten</Button> : <button className="memory-leave-room" onClick={onLeave} type="button">Raum verlassen</button>}
      </section>
    </main>
  )
}

export default function MemoryGamePage() {
  const [game, setGame] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [assetsReady, setAssetsReady] = useState(false)
  const [onlineMode, setOnlineMode] = useState(false)
  const [session, setSession] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [focusCardId, setFocusCardId] = useState(null)
  const [columnCount, setColumnCount] = useState(4)
  const [actionBusy, setActionBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const boardRef = useRef(null)
  const assets = useMemo(() => game ? getMemoryAssets(game.setId) : [], [game?.setId])
  const assetsById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets])

  const loadOnlineRoom = useCallback(async () => {
    const activeSession = memoryRoomRepository.loadSession()
    if (!activeSession) return null
    setSession(activeSession)
    const room = await memoryRoomRepository.load(activeSession.roomCode)
    if (room && !isValidMemoryGame(room, memoryManifest)) throw new Error('Der Onlineraum enthält keinen gültigen Memory-Spielstand.')
    setGame((current) => !current || !room || room.revision >= (current.revision ?? 0) ? room : current)
    return room
  }, [])

  useEffect(() => {
    const activeSession = memoryRoomRepository.isOnline ? memoryRoomRepository.loadSession() : null
    if (!activeSession) {
      setGame(memoryGameRepository.load(memoryManifest))
      setLoaded(true)
      return undefined
    }
    setOnlineMode(true)
    loadOnlineRoom().catch((error) => setLoadError(error.message)).finally(() => setLoaded(true))
    const unsubscribe = memoryRoomRepository.subscribe((event) => {
      if (!event.code || event.code === memoryRoomRepository.loadSession()?.roomCode) loadOnlineRoom().catch((error) => setLoadError(error.message))
    })
    return unsubscribe
  }, [loadOnlineRoom])

  useEffect(() => {
    if (!game) return
    if (game.phase === MEMORY_PHASES.LOBBY) { setAssetsReady(true); return }
    setAssetsReady(false)
    const selectedIds = new Set(game.deck.map((card) => card.assetId))
    preloadMemoryAssets(assets.filter((asset) => selectedIds.has(asset.id)))
      .then(() => {
        setAssetsReady(true)
        setFocusCardId(game.deck.find((card) => card.status === 'hidden')?.id ?? game.deck[0]?.id)
      })
      .catch(() => setLoadError('Mindestens ein Motiv konnte nicht geladen werden. Bitte prüfe die Bilddateien.'))
  }, [assets, game?.phase === MEMORY_PHASES.LOBBY])

  useEffect(() => {
    if (!game) return undefined
    const updateColumns = () => setColumnCount(columnsForGame(game.pairCount))
    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [game?.pairCount])

  useEffect(() => {
    if (!game || onlineMode || !isStableMemoryState(game)) return
    if (!memoryGameRepository.save(game, memoryManifest)) setLoadError('Der aktuelle Zug konnte nicht gespeichert werden. Prüfe den freien Browserspeicher.')
  }, [game, onlineMode])

  useEffect(() => {
    if (game?.phase !== MEMORY_PHASES.PLAYING) return
    const focusedCard = game.deck.find((card) => card.id === focusCardId)
    if (!focusedCard || focusedCard.status === 'hidden') return
    const nextCard = game.deck.find((card) => card.status === 'hidden')
    if (!nextCard) return
    setFocusCardId(nextCard.id)
    window.requestAnimationFrame(() => boardRef.current?.querySelector(`[data-card-id="${nextCard.id}"]`)?.focus())
  }, [game, focusCardId])

  useEffect(() => {
    if (game?.phase !== MEMORY_PHASES.RESOLVING) return undefined
    const delay = game.pendingMatch ? 450 : 1200
    const timer = window.setTimeout(async () => {
      try {
        const next = onlineMode
          ? await memoryRoomRepository.mutate(game.code, (current) => resolveMemoryTurn(current))
          : resolveMemoryTurn(game)
        setGame(next)
      } catch (error) { setLoadError(error.message) }
    }, delay)
    return () => window.clearTimeout(timer)
  }, [game?.phase, game?.pendingMatch, game?.flippedCardIds, game?.code, onlineMode])

  const currentPlayer = onlineMode ? game?.players.find((player) => player.id === session?.playerId) : null
  const actorTurn = !onlineMode || currentPlayer?.id === game?.players[game?.activePlayerIndex]?.id
  const boardLocked = !game || game.phase !== MEMORY_PHASES.PLAYING || !actorTurn || actionBusy

  const selectCard = async (cardId) => {
    if (boardLocked) return
    setActionBusy(true)
    try {
      const next = onlineMode
        ? await memoryRoomRepository.mutate(game.code, (current) => flipMemoryCard(current, cardId, session.playerId))
        : flipMemoryCard(game, cardId)
      setGame(next)
      setLoadError('')
    } catch (error) { setLoadError(error.message) }
    finally { setActionBusy(false) }
  }

  const handleCardKeyDown = (event, index) => {
    const rowCount = Math.ceil(game.deck.length / columnCount)
    const row = Math.floor(index / columnCount)
    const column = index % columnCount
    let nextIndex = null
    if (event.key === 'ArrowRight') nextIndex = row * columnCount + ((column + 1) % columnCount)
    if (event.key === 'ArrowLeft') nextIndex = row * columnCount + ((column - 1 + columnCount) % columnCount)
    if (event.key === 'ArrowDown') nextIndex = ((row + 1) % rowCount) * columnCount + column
    if (event.key === 'ArrowUp') nextIndex = ((row - 1 + rowCount) % rowCount) * columnCount + column
    if (nextIndex === null) return
    event.preventDefault()
    nextIndex = Math.min(nextIndex, game.deck.length - 1)
    const nextCard = game.deck[nextIndex]
    setFocusCardId(nextCard.id)
    boardRef.current?.querySelector(`[data-card-id="${nextCard.id}"]`)?.focus()
  }

  const replay = async () => {
    try {
      const set = getMemorySet(game.setId)
      if (!set?.ready) throw new Error('Dieses Bilder-Set ist nicht mehr verfügbar.')
      const next = createMemoryGame({ names: game.players.map((player) => player.name), pairCount: game.pairCount, assets, setId: set.id, setLabel: set.label, setFingerprint: set.fingerprint })
      const selectedIds = new Set(next.deck.map((card) => card.assetId))
      await preloadMemoryAssets(assets.filter((asset) => selectedIds.has(asset.id)))
      if (!memoryGameRepository.save(next, memoryManifest)) throw new Error('Die neue Partie konnte nicht gespeichert werden.')
      setGame(next); setFocusCardId(next.deck[0].id)
    } catch (error) { setLoadError(error.message || 'Die neue Partie konnte nicht gestartet werden.') }
  }

  const newSetup = async () => {
    try {
      if (onlineMode) {
        if (session?.playerId === game.hostId) await memoryRoomRepository.remove(game.code)
        memoryRoomRepository.clearSession()
      } else memoryGameRepository.clear()
      window.location.assign(appPath('/memory'))
    } catch (error) { setLoadError(error.message) }
  }

  const leaveOnlineRoom = async () => {
    try {
      await memoryRoomRepository.leave(game.code, { ...game, revision: game.revision + 1 })
      memoryRoomRepository.clearSession()
      window.location.assign(appPath('/memory'))
    } catch (error) { setLoadError(error.message) }
  }

  const copyInvite = async () => {
    await navigator.clipboard?.writeText(`${window.location.origin}${appPath('/memory')}?code=${game.code}`)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const startOnline = async () => {
    setActionBusy(true)
    try {
      const next = await memoryRoomRepository.mutate(game.code, (current) => startOnlineMemoryGame(current, session.playerId, assets))
      setGame(next)
    } catch (error) { setLoadError(error.message) }
    finally { setActionBusy(false) }
  }

  if (!loaded) return <div className="memory-page"><AppHeader variant="dark" home /><main className="memory-loading" aria-live="polite">Spielstand wird geladen …</main></div>
  if (loadError && !game) return <div className="memory-page"><AppHeader variant="dark" home /><main className="memory-loading"><h1>Memory kann nicht starten</h1><p>{loadError}</p><a href={appPath('/memory')}>Zurück zur Einrichtung</a></main></div>
  if (!game) return <div className="memory-page"><AppHeader variant="dark" home /><main className="memory-loading"><h1>Kein Spielstand gefunden</h1><p>Die Partie wurde entfernt oder ist nicht mehr verfügbar.</p><a href={appPath('/memory')}>Neue Partie einrichten</a></main></div>
  if (!assetsReady && game.phase !== MEMORY_PHASES.LOBBY) return <div className="memory-page"><AppHeader variant="dark" home /><main className="memory-loading" aria-live="polite">Motive werden geladen …</main></div>

  if (onlineMode && game.phase === MEMORY_PHASES.LOBBY) {
    return <div className="memory-page memory-page--game"><AppHeader variant="dark" backLabel="Spielübersicht" backTo="/memory" /><OnlineRoomBar copied={copied} game={game} onCopy={copyInvite} />{loadError ? <div className="memory-game-error" role="alert">{loadError}</div> : null}<OnlineLobby actorId={session.playerId} game={game} onLeave={leaveOnlineRoom} onStart={startOnline} /></div>
  }

  const status = describeMemoryStatus(game)
  const ranking = game.phase === MEMORY_PHASES.COMPLETE ? getMemoryRanking(game) : []
  const rowCount = Math.ceil(game.deck.length / columnCount)
  const onlineHint = onlineMode && game.phase !== MEMORY_PHASES.COMPLETE && !actorTurn ? `${game.players[game.activePlayerIndex].name} deckt gerade auf.` : status

  return (
    <div className="memory-page memory-page--game page--game">
      <AppHeader variant="dark" backLabel="Spielübersicht" backTo="/memory" />
      {onlineMode ? <OnlineRoomBar copied={copied} game={game} onCopy={copyInvite} /> : null}
      {loadError ? <div className="memory-game-error" role="alert">{loadError}<button onClick={() => setLoadError('')} type="button">×</button></div> : null}
      <main className="memory-game-shell">
        <header className="memory-game-head"><div><span>Memory · {game.setLabel}{onlineMode ? ' · online' : ''}</span><h1>{game.phase === MEMORY_PHASES.COMPLETE ? 'Partie beendet' : `${game.players[game.activePlayerIndex].name} ist dran`}</h1></div><div className="memory-progress"><strong>{game.matchedPairs}/{game.pairCount}</strong><span>Paare gefunden</span></div></header>
        <div className="memory-score-strip" aria-label={`Punktestand: ${game.players.map((entry) => `${entry.name} ${entry.score}`).join(', ')}`} role="region" tabIndex="0">{game.players.map((player, index) => <div className={index === game.activePlayerIndex && game.phase !== MEMORY_PHASES.COMPLETE ? 'is-active' : ''} key={player.id}><span>{player.name}</span><strong>{player.score}</strong></div>)}</div>
        <p aria-atomic="true" aria-live="polite" className="memory-live-status">{onlineHint}</p>

        {game.phase === MEMORY_PHASES.COMPLETE ? <section className="memory-result" aria-labelledby="memory-result-title"><span>Geschafft in {game.turns} Zügen</span><h2 id="memory-result-title">{status}</h2><ol>{ranking.map((player) => <li key={player.id}><span>{player.rank}. {player.name}</span><strong>{player.score} {player.score === 1 ? 'Paar' : 'Paare'}</strong></li>)}</ol><div>{onlineMode ? <Button onClick={newSetup} type="button">Onlineraum verlassen</Button> : <><Button onClick={replay} type="button">Neu mischen</Button><Button onClick={newSetup} type="button" variant="outline">Neue Spieler</Button></>}</div></section> : <>
          <p className="sr-only">Mit den Pfeiltasten wechselst du zwischen den Karten. Enter oder Leertaste deckt die fokussierte Karte auf.</p>
          <div aria-busy={boardLocked} aria-label={`Memory-Brett mit ${game.pairCount} Paaren`} className="memory-board" ref={boardRef} role="group" style={{ '--memory-columns': columnCount, '--memory-rows': rowCount }}>
            {game.deck.map((card, index) => {
              const asset = assetsById.get(card.assetId)
              const row = Math.floor(index / columnCount) + 1
              const column = (index % columnCount) + 1
              const label = card.status === 'hidden' ? `Verdeckte Karte, Reihe ${row}, Spalte ${column}` : `${asset?.label ?? 'Motiv'}, ${card.status === 'matched' ? 'Paar gefunden' : 'aufgedeckt'}`
              return <button aria-disabled={boardLocked || card.status !== 'hidden'} aria-label={label} className={`memory-card is-${card.status}`} data-card-id={card.id} key={card.id} onClick={() => selectCard(card.id)} onFocus={() => setFocusCardId(card.id)} onKeyDown={(event) => handleCardKeyDown(event, index)} tabIndex={!boardLocked && focusCardId === card.id ? 0 : -1} type="button"><span className="memory-card__back" aria-hidden="true"><i>UGBZ</i></span><span className="memory-card__face" aria-hidden="true"><img alt="" draggable="false" height={asset?.height} src={asset?.src} width={asset?.width} /></span></button>
            })}
          </div>
        </>}
      </main>
    </div>
  )
}
