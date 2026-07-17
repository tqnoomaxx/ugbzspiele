'use client'

import { useEffect, useState } from 'react'
import AppHeader from '../components/AppHeader.jsx'
import { ArrowRightIcon, DoorIcon } from '../components/Icons.jsx'
import { games, roomFeature } from '../games/registry.js'
import { gameRepository } from '../games/card-game/gameRepository.js'

export default function HomePage() {
  const game = games[0]
  const [savedGame, setSavedGame] = useState(null)

  useEffect(() => {
    setSavedGame(gameRepository.load())
  }, [])

  const savedRound = savedGame
    ? Math.min(savedGame.roundIndex + 1, savedGame.rounds.length)
    : 0

  return (
    <div className="page page--home">
      <AppHeader />
      <main className="home-shell">
        <section className="home-intro" aria-labelledby="home-title">
          <h1 id="home-title">Was wird gespielt?</h1>
          <p>Wähle ein Spiel und leg direkt los.</p>
        </section>

        <section className="game-feature">
          <div className="game-feature__art" aria-hidden="true">
            <img src={game.artwork} alt="" />
          </div>
          <div className="game-feature__content">
            {savedGame ? <span className="game-feature__status">Aktives Spiel</span> : null}
            <h2>{game.title}</h2>
            <p>{game.description}</p>
            {savedGame ? (
              <div className="game-feature__resume">
                <strong>
                  {savedGame.phase === 'complete'
                    ? 'Endergebnis ist bereit'
                    : `Runde ${savedRound} von ${savedGame.rounds.length}`}
                </strong>
                <span>{savedGame.players.map((player) => player.name).join(' · ')}</span>
              </div>
            ) : null}
            <div className="game-feature__actions">
              <a className="game-feature__action" href={savedGame ? '/kartenspiel/spielen' : game.path}>
                {savedGame
                  ? savedGame.phase === 'complete' ? 'Ergebnis ansehen' : 'Spiel fortsetzen'
                  : 'Spiel öffnen'}
                <ArrowRightIcon size={23} />
              </a>
              {savedGame ? (
                <a className="game-feature__new" href={game.path}>Neue Runde einrichten</a>
              ) : null}
            </div>
          </div>
        </section>

        <section className="room-preview" aria-disabled="true">
          <span className="room-preview__icon"><DoorIcon size={34} /></span>
          <div>
            <h2>{roomFeature.title}</h2>
            <p>{roomFeature.description}</p>
          </div>
        </section>
      </main>
    </div>
  )
}
