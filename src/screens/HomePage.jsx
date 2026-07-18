'use client'

import { useEffect, useState } from 'react'
import AppHeader from '../components/AppHeader.jsx'
import { ArrowRightIcon } from '../components/Icons.jsx'
import { games } from '../games/registry.js'
import { gameRepository } from '../games/card-game/gameRepository.js'
import { appPath } from '../basePath.js'

function GameFeature({ game, saved }) {
  const isCardGame = game.id === 'card-game'
  const href = saved
    ? appPath(isCardGame ? '/kartenspiel/spielen' : '/doppelwort/raum')
    : game.path
  let resumeTitle = ''
  let resumeDetail = ''

  if (saved && isCardGame) {
    const savedRound = Math.min(saved.roundIndex + 1, saved.rounds.length)
    resumeTitle = saved.phase === 'complete' ? 'Endergebnis ist bereit' : `Runde ${savedRound} von ${saved.rounds.length}`
    resumeDetail = saved.players.map((player) => player.name).join(' · ')
  } else if (saved) {
    resumeTitle = saved.game
      ? `${saved.game.phase === 'complete' ? 'Gesamtwertung' : `Runde ${saved.game.roundNumber}`} · ${saved.name}`
      : `Lobby · ${saved.name}`
    resumeDetail = `${saved.players.length}/${saved.options.maxPlayers} am Tisch · Code ${saved.code}`
  }

  return (
    <section className={`game-feature ${game.theme === 'night' ? 'game-feature--night' : ''}`}>
      <div className="game-feature__art" aria-hidden="true">
        <img src={game.artwork} alt="" />
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

  useEffect(() => {
    let active = true
    const cardGame = gameRepository.load()
    setSavedGames({ 'card-game': cardGame })

    import('../games/doppelwort/roomRepository.js').then(({ doppelwortRoomRepository }) => {
      if (!active) return
      const roomSession = doppelwortRoomRepository.loadSession()
      const doppelwortRoom = roomSession
        ? doppelwortRoomRepository.load(roomSession.roomCode)
        : null
      setSavedGames((current) => ({ ...current, doppelwort: doppelwortRoom }))
    })

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
          {games.map((game) => <GameFeature game={game} key={game.id} saved={savedGames[game.id]} />)}
        </div>
      </main>
    </div>
  )
}
