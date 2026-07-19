'use client'

import { useEffect, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import { ArrowRightIcon } from '../components/Icons.jsx'
import { games } from '../games/registry.js'
import { gameRepository } from '../games/card-game/gameRepository.js'

function GameFeature({ game, index, saved }) {
  const isCardGame = game.id === 'card-game'
  const href = saved ? game.resumePath : game.path
  let resumeTitle = ''
  let resumeDetail = ''

  if (saved && isCardGame) {
    const savedRound = Math.min(saved.roundIndex + 1, saved.rounds.length)
    resumeTitle = saved.phase === 'complete' ? 'Endergebnis ist bereit' : `Runde ${savedRound} von ${saved.rounds.length}`
    resumeDetail = saved.players.map((player) => player.name).join(' · ')
  } else if (saved && ['doppelwort', 'kniffel'].includes(game.id)) {
    resumeTitle = saved.game
      ? `${saved.game.phase === 'complete' ? 'Gesamtwertung' : `Runde ${saved.game.roundNumber}`} · ${saved.name}`
      : `Lobby · ${saved.name}`
    resumeDetail = `${saved.players.length} am Tisch · Code ${saved.code}`
  } else if (saved && game.id === 'battleship') {
    const current = saved.players?.[saved.turnIndex]
    resumeTitle = saved.phase === 'lobby'
      ? `Lobby · ${saved.name}`
      : saved.phase === 'complete'
      ? `${saved.players.find((player) => player.id === saved.winnerId)?.name ?? 'Sieg'} gewinnt`
      : saved.phase === 'placement' ? 'Flotten werden aufgestellt' : `${current?.name ?? 'Nächster Zug'} ist dran`
    resumeDetail = saved.playMode === 'online'
      ? `${saved.players.length} von 2 Personen · Code ${saved.code}`
      : saved.players?.map((player) => player.name).join(' gegen ') ?? 'Lokale Partie'
  } else if (saved && game.id === 'werewolf') {
    resumeTitle = saved.phase === 'complete' ? 'Das Dorf hat entschieden' : saved.phaseLabel ?? 'Partie fortsetzen'
    resumeDetail = `${saved.players?.filter((player) => player.alive !== false).length ?? 0} leben noch · nur für die Spielleitung`
  } else if (saved && game.id === 'memory') {
    resumeTitle = saved.phase === 'complete' ? 'Alle Paare gefunden' : 'Memory fortsetzen'
    resumeDetail = `${saved.players?.length ?? 1} ${saved.players?.length === 1 ? 'Person' : 'Personen'} · ${saved.pairCount ?? saved.cards?.length / 2 ?? 0} Paare`
  }

  return (
    <section className={`game-feature ${game.theme ? `game-feature--${game.theme}` : ''}`}>
      <div className="game-feature__art" aria-hidden="true">
        <img
          alt=""
          decoding="async"
          fetchPriority={index === 0 ? 'high' : 'auto'}
          loading={index === 0 ? 'eager' : 'lazy'}
          src={game.artwork}
        />
      </div>
      <div className="game-feature__content">
        {saved ? <span className="game-feature__status">Aktives Spiel</span> : null}
        <h2>{game.title}</h2>
        <p>{game.description}</p>
        {saved ? (
          <div className="game-feature__resume">
            <strong>{resumeTitle}</strong>
            <span>{resumeDetail}</span>
          </div>
        ) : null}
        <div className="game-feature__actions">
          <a className="game-feature__action" href={href}>
            {saved ? 'Spiel fortsetzen' : 'Spiel öffnen'}
            <ArrowRightIcon size={23} />
          </a>
          {saved ? <a className="game-feature__new" href={game.path}>Zur Spielübersicht</a> : null}
        </div>
      </div>
    </section>
  )
}

export default function HomePage() {
  const [savedGames, setSavedGames] = useState({})
  const [memoryReady, setMemoryReady] = useState(false)

  useEffect(() => {
    let active = true
    const cardGame = gameRepository.load()
    setSavedGames({ 'card-game': cardGame })

    fetch(appPath('/assets/memory/manifest.json'), { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((manifest) => {
        const ids = Array.isArray(manifest?.cards) ? manifest.cards.map((card) => card?.id) : []
        const valid = manifest?.schemaVersion === 1
          && manifest?.minPairs === 6
          && manifest?.ready === true
          && ids.length >= 6
          && ids.every((id) => typeof id === 'string' && id)
          && new Set(ids).size === ids.length
          && typeof manifest?.fingerprint === 'string'
          && manifest.fingerprint.length === 64
        if (active) setMemoryReady(valid)
      })
      .catch(() => { if (active) setMemoryReady(false) })

    import('../games/doppelwort/roomRepository.js').then(async ({ doppelwortRoomRepository }) => {
      if (!active) return
      const roomSession = doppelwortRoomRepository.loadSession()
      const doppelwortRoom = roomSession
        ? await doppelwortRoomRepository.load(roomSession.roomCode).catch(() => null)
        : null
      setSavedGames((current) => ({ ...current, doppelwort: doppelwortRoom }))
    })

    import('../games/kniffel/roomRepository.js').then(async ({ kniffelRoomRepository }) => {
      if (!active) return
      const session = kniffelRoomRepository.loadSession()
      const room = session ? await kniffelRoomRepository.load(session.roomCode).catch(() => null) : null
      setSavedGames((current) => ({ ...current, kniffel: room }))
    })

    Promise.all([
      import('../games/battleship/gameRepository.js'),
      import('../games/battleship/roomRepository.js'),
    ]).then(async ([{ battleshipRepository }, { battleshipRoomRepository }]) => {
      if (!active) return
      const session = battleshipRoomRepository.loadSession()
      const room = session ? await battleshipRoomRepository.load(session.roomCode).catch(() => null) : null
      if (active) setSavedGames((current) => ({ ...current, battleship: room ?? battleshipRepository.load() }))
    }).catch(() => {})

    import('../games/werewolf/gameRepository.js').then(({ werewolfRepository }) => {
      if (active) setSavedGames((current) => ({ ...current, werewolf: werewolfRepository.load() }))
    }).catch(() => {})

    Promise.all([
      import('../games/memory/gameRepository.js'),
      import('../games/memory/manifest.js'),
    ]).then(([{ memoryGameRepository }, { memoryManifest }]) => {
      if (active) setSavedGames((current) => ({ ...current, memory: memoryGameRepository.load(memoryManifest) }))
    }).catch(() => {})

    return () => { active = false }
  }, [])

  return (
    <div className="page page--home">
      <AppHeader />
      <main className="home-shell">
        <section className="home-intro" aria-labelledby="home-title">
          <h1 id="home-title">Was wird gespielt?</h1>
          <p>Wähle ein Spiel und leg direkt los.</p>
        </section>

        <div className="games-list">
          {games
            .filter((game) => game.available && (!game.requiresMemoryAssets || memoryReady))
            .map((game, index) => <GameFeature game={game} index={index} key={game.id} saved={savedGames[game.id]} />)}
        </div>
      </main>
    </div>
  )
}
