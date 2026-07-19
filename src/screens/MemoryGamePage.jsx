'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
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
} from '../games/memory/gameEngine.js'
import { isStableMemoryState, memoryGameRepository } from '../games/memory/gameRepository.js'
import { getMemoryAssets, getMemorySet, memoryManifest } from '../games/memory/manifest.js'
import { preloadMemoryAssets } from '../games/memory/preload.js'

function columnsForGame(pairCount) {
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 650px)').matches) return pairCount === 6 ? 3 : 4
  if (pairCount <= 8) return 4
  return pairCount === 10 ? 5 : 6
}

export default function MemoryGamePage() {
  const [game, setGame] = useState(null)
  const assets = useMemo(() => game ? getMemoryAssets(game.setId) : [], [game?.setId])
  const assetsById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets])
  const [loadError, setLoadError] = useState('')
  const [focusCardId, setFocusCardId] = useState(null)
  const [columnCount, setColumnCount] = useState(4)
  const boardRef = useRef(null)

  useEffect(() => {
    const stored = memoryGameRepository.load(memoryManifest)
    if (!stored) { window.location.replace(appPath('/memory')); return }
    const storedAssets = getMemoryAssets(stored.setId)
    const selectedIds = new Set(stored.deck.map((card) => card.assetId))
    preloadMemoryAssets(storedAssets.filter((asset) => selectedIds.has(asset.id)))
      .then(() => { setGame(stored); setFocusCardId(stored.deck.find((card) => card.status === 'hidden')?.id ?? stored.deck[0]?.id) })
      .catch(() => setLoadError('Mindestens ein Motiv konnte nicht geladen werden. Bitte prüfe die Bilddateien.'))
  }, [])

  useEffect(() => {
    if (!game) return undefined
    const updateColumns = () => setColumnCount(columnsForGame(game.pairCount))
    updateColumns()
    window.addEventListener('resize', updateColumns)
    return () => window.removeEventListener('resize', updateColumns)
  }, [game?.pairCount])

  useEffect(() => {
    if (!game || !isStableMemoryState(game)) return
    if (!memoryGameRepository.save(game, memoryManifest)) setLoadError('Der aktuelle Zug konnte nicht gespeichert werden. Prüfe den freien Browserspeicher.')
  }, [game])

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
    const timer = window.setTimeout(() => setGame((current) => resolveMemoryTurn(current)), delay)
    return () => window.clearTimeout(timer)
  }, [game?.phase, game?.pendingMatch, game?.flippedCardIds])

  if (loadError) {
    return <div className="memory-page"><AppHeader variant="dark" home /><main className="memory-loading"><h1>Memory kann nicht starten</h1><p>{loadError}</p><a href={appPath('/memory')}>Zurück zur Einrichtung</a></main></div>
  }
  if (!game) return <div className="memory-page"><AppHeader variant="dark" home /><main className="memory-loading" aria-live="polite">Motive werden geladen …</main></div>

  const status = describeMemoryStatus(game)
  const ranking = game.phase === MEMORY_PHASES.COMPLETE ? getMemoryRanking(game) : []
  const boardLocked = game.phase !== MEMORY_PHASES.PLAYING

  const selectCard = (cardId) => {
    if (boardLocked) return
    setGame((current) => flipMemoryCard(current, cardId))
  }

  const handleCardKeyDown = (event, index) => {
    const columns = columnCount
    const rowCount = Math.ceil(game.deck.length / columns)
    const row = Math.floor(index / columns)
    const column = index % columns
    let nextIndex = null
    if (event.key === 'ArrowRight') nextIndex = row * columns + ((column + 1) % columns)
    if (event.key === 'ArrowLeft') nextIndex = row * columns + ((column - 1 + columns) % columns)
    if (event.key === 'ArrowDown') nextIndex = ((row + 1) % rowCount) * columns + column
    if (event.key === 'ArrowUp') nextIndex = ((row - 1 + rowCount) % rowCount) * columns + column
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
      const next = createMemoryGame({
        names: game.players.map((player) => player.name),
        pairCount: game.pairCount,
        assets,
        setId: set.id,
        setLabel: set.label,
        setFingerprint: set.fingerprint,
      })
      const selectedIds = new Set(next.deck.map((card) => card.assetId))
      await preloadMemoryAssets(assets.filter((asset) => selectedIds.has(asset.id)))
      if (!memoryGameRepository.save(next, memoryManifest)) throw new Error('Die neue Partie konnte nicht gespeichert werden.')
      setGame(next)
      setFocusCardId(next.deck[0].id)
    } catch (replayError) { setLoadError(replayError.message || 'Die neue Partie konnte nicht gestartet werden.') }
  }

  const newSetup = () => {
    memoryGameRepository.clear()
    window.location.assign(appPath('/memory'))
  }

  return (
    <div className="memory-page memory-page--game page--game">
      <AppHeader variant="dark" home />
      <main className="memory-game-shell">
        <header className="memory-game-head">
          <div><span>Memory · {game.setLabel}</span><h1>{game.phase === MEMORY_PHASES.COMPLETE ? 'Partie beendet' : `${game.players[game.activePlayerIndex].name} ist dran`}</h1></div>
          <div className="memory-progress"><strong>{game.matchedPairs}/{game.pairCount}</strong><span>Paare gefunden</span></div>
        </header>

        <div className="memory-score-strip" aria-label={`Punktestand: ${game.players.map((entry) => `${entry.name} ${entry.score}`).join(', ')}`} role="region" tabIndex="0">
          {game.players.map((player, index) => <div className={index === game.activePlayerIndex && game.phase !== MEMORY_PHASES.COMPLETE ? 'is-active' : ''} key={player.id}><span>{player.name}</span><strong>{player.score}</strong></div>)}
        </div>

        <p aria-atomic="true" aria-live="polite" className="memory-live-status">{status}</p>

        {game.phase === MEMORY_PHASES.COMPLETE ? (
          <section className="memory-result" aria-labelledby="memory-result-title">
            <span>Geschafft in {game.turns} Zügen</span>
            <h2 id="memory-result-title">{status}</h2>
            <ol>{ranking.map((player) => <li key={player.id}><span>{player.rank}. {player.name}</span><strong>{player.score} {player.score === 1 ? 'Paar' : 'Paare'}</strong></li>)}</ol>
            <div><Button onClick={replay} type="button">Nochmal spielen</Button><Button onClick={newSetup} type="button" variant="outline">Neue Spieler</Button></div>
          </section>
        ) : (
          <><p className="sr-only">Mit den Pfeiltasten wechselst du zwischen den Karten. Enter oder Leertaste deckt die fokussierte Karte auf.</p><div
            aria-busy={boardLocked}
            aria-label={`Memory-Brett mit ${game.pairCount} Paaren`}
            className={`memory-board memory-board--${game.pairCount}`}
            ref={boardRef}
            role="group"
          >
            {game.deck.map((card, index) => {
              const asset = assetsById.get(card.assetId)
              const revealed = card.status !== 'hidden'
              const row = Math.floor(index / columnCount) + 1
              const column = (index % columnCount) + 1
              const label = card.status === 'hidden'
                ? `Verdeckte Karte, Reihe ${row}, Spalte ${column}`
                : `${asset?.label ?? 'Motiv'}, ${card.status === 'matched' ? 'Paar gefunden' : 'aufgedeckt'}`
              return (
                <button
                  aria-disabled={boardLocked || card.status !== 'hidden'}
                  aria-label={label}
                  className={`memory-card is-${card.status}`}
                  data-card-id={card.id}
                  key={card.id}
                  onClick={() => selectCard(card.id)}
                  onFocus={() => setFocusCardId(card.id)}
                  onKeyDown={(event) => handleCardKeyDown(event, index)}
                  tabIndex={focusCardId === card.id ? 0 : -1}
                  type="button"
                >
                  <span className="memory-card__back" aria-hidden="true"><i>UGBZ</i></span>
                  <span className="memory-card__face" aria-hidden="true"><img alt="" draggable="false" height={asset?.height} src={asset?.src} width={asset?.width} /></span>
                </button>
              )
            })}
          </div></>
        )}
      </main>
    </div>
  )
}
