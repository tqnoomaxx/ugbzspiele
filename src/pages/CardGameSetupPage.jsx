'use client'

import { useEffect, useMemo, useState } from 'react'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import { CloseIcon, PlusIcon, UserIcon } from '../components/Icons.jsx'
import {
  createGame,
  getGamePlan,
  MAX_PLAYERS,
  validatePlayerNames,
} from '../games/card-game/gameEngine.js'
import { gameRepository } from '../games/card-game/gameRepository.js'

let playerId = 0

function newPlayer() {
  playerId += 1
  return { id: `setup-player-${playerId}`, name: '' }
}

export default function CardGameSetupPage() {
  const [players, setPlayers] = useState(() => [newPlayer(), newPlayer()])
  const [deckSize, setDeckSize] = useState(32)
  const [mode, setMode] = useState('both')
  const [error, setError] = useState('')
  const [savedGame, setSavedGame] = useState(null)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const plan = useMemo(
    () => getGamePlan(deckSize, players.length, mode),
    [deckSize, mode, players.length],
  )

  useEffect(() => {
    setSavedGame(gameRepository.load())
  }, [])

  function updatePlayer(id, name) {
    setPlayers((current) => current.map((player) => (
      player.id === id ? { ...player, name } : player
    )))
    setError('')
    setConfirmOverwrite(false)
  }

  function addPlayer() {
    setPlayers((current) => (
      current.length < MAX_PLAYERS ? [...current, newPlayer()] : current
    ))
    setConfirmOverwrite(false)
  }

  function removePlayer(id) {
    if (players.length === 2) setMode('one')
    setPlayers((current) => (
      current.length > 1 ? current.filter((player) => player.id !== id) : current
    ))
    setConfirmOverwrite(false)
  }

  function startGame(overwrite = false) {
    const validation = validatePlayerNames(players.map((player) => player.name))
    if (!validation.valid) {
      setError(validation.message)
      return
    }

    if (savedGame && !overwrite) {
      setConfirmOverwrite(true)
      return
    }

    const game = createGame({ names: validation.names, deckSize, mode })
    if (!gameRepository.save(game)) {
      setError('Das Spiel konnte nicht gespeichert werden. Prüfe die Browser-Einstellungen.')
      return
    }

    setSavedGame(null)
    window.location.assign('/kartenspiel/spielen')
  }

  function resumeGame() {
    if (gameRepository.load()) window.location.assign('/kartenspiel/spielen')
  }

  const savedRound = savedGame
    ? Math.min(savedGame.roundIndex + 1, savedGame.rounds.length)
    : 0

  return (
    <div className="page page--setup">
      <AppHeader backLabel="Zurück" backTo="/" variant="dark" />
      <main className="setup-shell">
        <header className="screen-title">
          <h1>Kartenspiel</h1>
          <div className="title-rule" aria-hidden="true"><span /></div>
          <h2>Neue Runde</h2>
        </header>

        {savedGame ? (
          <section className="active-game-banner" aria-labelledby="active-game-title">
            <div>
              <span className="active-game-banner__eyebrow">Aktives Spiel</span>
              <h2 id="active-game-title">
                {savedGame.phase === 'complete'
                  ? 'Endergebnis ansehen'
                  : `Runde ${savedRound} von ${savedGame.rounds.length}`}
              </h2>
              <p>{savedGame.players.map((player) => player.name).join(' · ')}</p>
            </div>
            <Button onClick={resumeGame} type="button">
              {savedGame.phase === 'complete' ? 'Ergebnis öffnen' : 'Spiel fortsetzen'}
            </Button>
          </section>
        ) : null}

        <section className="setup-panel" aria-labelledby="setup-heading">
          <h2 className="sr-only" id="setup-heading">Spiel einrichten</h2>
          <div className="setup-column setup-column--players">
            <h3>Wer spielt mit?</h3>
            <div className="player-inputs">
              {players.map((player, index) => (
                <div className="player-input" key={player.id}>
                  <span className="player-input__icon"><UserIcon size={23} /></span>
                  <label className="sr-only" htmlFor={player.id}>Spieler {index + 1}</label>
                  <input
                    autoComplete="off"
                    id={player.id}
                    maxLength={24}
                    onChange={(event) => updatePlayer(player.id, event.target.value)}
                    placeholder={`Spieler ${index + 1}`}
                    type="text"
                    value={player.name}
                  />
                  <button
                    aria-label={`Spieler ${index + 1} entfernen`}
                    className="icon-button icon-button--plain"
                    disabled={players.length === 1}
                    onClick={() => removePlayer(player.id)}
                    type="button"
                  >
                    <CloseIcon size={19} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="add-player"
              disabled={players.length >= MAX_PLAYERS}
              onClick={addPlayer}
              type="button"
            >
              <PlusIcon size={22} />
              Spieler hinzufügen
            </button>
          </div>

          <div className="setup-column setup-column--options">
            <fieldset className="choice-group">
              <legend>Kartendeck</legend>
              <div className="segmented-control">
                {[32, 54].map((size) => (
                  <button
                    aria-pressed={deckSize === size}
                    className={deckSize === size ? 'is-selected' : ''}
                    key={size}
                    onClick={() => setDeckSize(size)}
                    type="button"
                  >
                    {size} Karten
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset className="choice-group">
              <legend>Spielmodus</legend>
              <div className="segmented-control">
                <button
                  aria-pressed={mode === 'both'}
                  className={mode === 'both' ? 'is-selected' : ''}
                  onClick={() => setMode('both')}
                  type="button"
                >
                  Hin &amp; Zurück
                </button>
                <button
                  aria-pressed={mode === 'one'}
                  className={mode === 'one' ? 'is-selected' : ''}
                  onClick={() => setMode('one')}
                  type="button"
                >
                  Nur Hin
                </button>
              </div>
            </fieldset>

            <section className="game-plan" aria-live="polite">
              <span>So lang spielt ihr</span>
              <strong>{plan.roundCount} Runden · {plan.durationLabel}</strong>
              <p>{plan.sequenceLabel}</p>
              {players.length === 1 && mode === 'one' ? (
                <small>Solo-Kurzvariante ist ausgewählt.</small>
              ) : null}
              {players.length === 1 && mode === 'both' ? (
                <small>Solo dauert in dieser Variante besonders lange.</small>
              ) : null}
            </section>

            <details className="scoring-guide setup-rules">
              <summary>So funktioniert das Spiel</summary>
              <ol>
                <li>Vor jeder Runde sagt jede Person ihre erwarteten Stiche an.</li>
                <li>Nach dem Ausspielen trägt die Spielleitung die gewonnenen Stiche ein.</li>
                <li>Wer genau richtig liegt, erhält 5 plus Stiche. Sonst gibt es −5 minus Abweichung.</li>
              </ol>
              <p><strong>„Gibt zuerst“</strong> markiert die Person, die mit der Ansage beginnt.</p>
            </details>

            <p className="form-error" role="alert">{error}</p>

            <Button className="setup-start" onClick={() => startGame(false)} type="button">
              Spiel starten
            </Button>

            {confirmOverwrite ? (
              <div className="overwrite-warning" role="alert">
                <strong>Laufendes Spiel ersetzen?</strong>
                <p>Der bisherige Spielstand wird dadurch gelöscht.</p>
                <div>
                  <button onClick={() => setConfirmOverwrite(false)} type="button">Behalten</button>
                  <button onClick={() => startGame(true)} type="button">Trotzdem neu starten</button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  )
}
