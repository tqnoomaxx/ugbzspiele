import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import { CloseIcon, PlusIcon, UndoIcon, UserIcon } from '../components/Icons.jsx'
import { createGame, MAX_PLAYERS, validatePlayerNames } from '../games/card-game/gameEngine.js'
import { gameRepository } from '../games/card-game/gameRepository.js'

let playerId = 0

function newPlayer() {
  playerId += 1
  return { id: `setup-player-${playerId}`, name: '' }
}

export default function CardGameSetupPage() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState(() => [newPlayer(), newPlayer()])
  const [deckSize, setDeckSize] = useState(32)
  const [mode, setMode] = useState('both')
  const [error, setError] = useState('')
  const [hasSavedGame] = useState(() => Boolean(gameRepository.load()))

  function updatePlayer(id, name) {
    setPlayers((current) => current.map((player) => (
      player.id === id ? { ...player, name } : player
    )))
    setError('')
  }

  function addPlayer() {
    setPlayers((current) => (
      current.length < MAX_PLAYERS ? [...current, newPlayer()] : current
    ))
  }

  function removePlayer(id) {
    setPlayers((current) => (
      current.length > 1 ? current.filter((player) => player.id !== id) : current
    ))
  }

  function startGame() {
    const validation = validatePlayerNames(players.map((player) => player.name))
    if (!validation.valid) {
      setError(validation.message)
      return
    }

    const game = createGame({ names: validation.names, deckSize, mode })
    gameRepository.save(game)
    navigate('/kartenspiel/spielen')
  }

  function resumeGame() {
    if (gameRepository.load()) navigate('/kartenspiel/spielen')
  }

  return (
    <div className="page page--setup">
      <AppHeader backLabel="Zurück" backTo="/" variant="dark" />
      <main className="setup-shell">
        <header className="screen-title">
          <h1>Kartenspiel</h1>
          <div className="title-rule" aria-hidden="true"><span /></div>
          <h2>Neue Runde</h2>
        </header>

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

            <p className="form-error" role="alert">{error}</p>

            <Button className="setup-start" onClick={startGame} type="button">
              Spiel starten
            </Button>

            {hasSavedGame ? (
              <Button className="setup-resume" onClick={resumeGame} type="button" variant="outline">
                <UndoIcon size={22} />
                Letztes Spiel fortsetzen
              </Button>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  )
}
