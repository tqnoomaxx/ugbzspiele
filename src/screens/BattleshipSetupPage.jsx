'use client'

import { useEffect, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import { createBattleshipGame } from '../games/battleship/gameEngine.js'
import { battleshipRepository } from '../games/battleship/gameRepository.js'

function gameStatus(game) {
  if (game.phase === 'complete') return 'Das Ergebnis ist bereit.'
  if (game.phase === 'battle') {
    const player = game.players[game.turnIndex]
    return `${player.name} ist am Zug · ${game.history.length} Schüsse gespielt`
  }
  const player = game.players[game.placementIndex]
  return `${player.name} stellt gerade die Flotte auf.`
}

export default function BattleshipSetupPage() {
  const [names, setNames] = useState(['', ''])
  const [savedGame, setSavedGame] = useState(null)
  const [corruptSave, setCorruptSave] = useState(false)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const inspection = battleshipRepository.inspect()
    setSavedGame(inspection.state)
    setCorruptSave(inspection.issue === 'corrupt')
    setReady(true)
  }, [])

  function updateName(index, value) {
    setNames((current) => current.map((name, nameIndex) => (nameIndex === index ? value : name)))
    setConfirmOverwrite(false)
    setError('')
  }

  function startGame(overwrite = false) {
    if (savedGame && !overwrite) {
      setConfirmOverwrite(true)
      return
    }

    try {
      const game = createBattleshipGame({ firstName: names[0], secondName: names[1] })
      if (!battleshipRepository.save(game)) throw new Error('Das Spiel konnte nicht im Browser gespeichert werden.')
      window.location.assign(appPath('/schiffe-versenken/spiel'))
    } catch (startError) {
      setError(startError.message || 'Das Spiel konnte nicht gestartet werden.')
    }
  }

  function resumeGame() {
    if (!battleshipRepository.load()) {
      setError('Der gespeicherte Spielstand konnte nicht geladen werden.')
      return
    }
    window.location.assign(appPath('/schiffe-versenken/spiel'))
  }

  function discardCorruptSave() {
    battleshipRepository.clear()
    setCorruptSave(false)
    setError('Der beschädigte Spielstand wurde entfernt. Du kannst neu beginnen.')
  }

  return (
    <div className="bs-page bs-page--setup">
      <AppHeader backLabel="Zurück" backTo="/" />
      <main className="bs-setup-shell">
        <section className="bs-setup-hero" aria-labelledby="bs-setup-title">
          <div className="bs-setup-hero__art" aria-hidden="true">
            <img alt="" src={appPath('/assets/battleship-table.svg')} />
          </div>
          <div className="bs-setup-hero__copy">
            <span className="bs-kicker">Lokal · Pass &amp; Play</span>
            <h1 id="bs-setup-title">Schiffe versenken</h1>
            <p>Zwei Flotten. Ein Gerät. Eure Aufstellungen bleiben beim Weitergeben vollständig verdeckt.</p>
            <div className="bs-offline-note" role="note">
              <span aria-hidden="true">⌁</span>
              <div><strong>Bewusst nur lokal</strong><small>Kein Online-Raum und keine Cloud-Synchronisierung.</small></div>
            </div>
          </div>
        </section>

        {corruptSave ? (
          <section className="bs-alert bs-alert--danger" role="alert">
            <div><strong>Der gespeicherte Spielstand ist beschädigt.</strong><p>Entferne ihn, bevor du eine neue Partie beginnst.</p></div>
            <button onClick={discardCorruptSave} type="button">Defekten Stand entfernen</button>
          </section>
        ) : null}

        {savedGame ? (
          <section className="bs-save-card" aria-labelledby="bs-save-title">
            <div>
              <span>Aktive lokale Partie</span>
              <h2 id="bs-save-title">{savedGame.players.map((player) => player.name).join(' gegen ')}</h2>
              <p>{gameStatus(savedGame)}</p>
            </div>
            <Button disabled={!ready} onClick={resumeGame} type="button">Spiel fortsetzen <span aria-hidden="true">→</span></Button>
          </section>
        ) : null}

        <section className="bs-setup-card" aria-labelledby="bs-names-title">
          <div className="bs-setup-card__intro">
            <span className="bs-step">01</span>
            <div><h2 id="bs-names-title">Wer führt die Flotten?</h2><p>Die erste Person stellt zuerst auf. Nach jedem Zug wird das Spielfeld wieder gesperrt.</p></div>
          </div>
          <div className="bs-name-grid">
            {names.map((name, index) => (
              <label className="bs-name-field" key={index}>
                <span>{index === 0 ? 'Erste Person' : 'Zweite Person'}</span>
                <input
                  autoComplete="off"
                  disabled={!ready}
                  maxLength={24}
                  onChange={(event) => updateName(index, event.target.value)}
                  placeholder={index === 0 ? 'Zum Beispiel Ada' : 'Zum Beispiel Ben'}
                  value={name}
                />
              </label>
            ))}
          </div>

          <div className="bs-rules-strip" aria-label="Spielregeln">
            <div><strong>10 × 10</strong><span>Spielfeld</span></div>
            <div><strong>5 Schiffe</strong><span>Längen 5 · 4 · 3 · 3 · 2</span></div>
            <div><strong>Berühren erlaubt</strong><span>Überlappen verboten</span></div>
            <div><strong>1 Schuss</strong><span>Dann wechselt der Zug</span></div>
          </div>

          {error ? <p className="bs-form-error" role="alert">{error}</p> : null}

          {confirmOverwrite ? (
            <div className="bs-overwrite" role="alert">
              <div><strong>Aktive Partie überschreiben?</strong><span>Der bisherige lokale Spielstand geht verloren.</span></div>
              <div>
                <button onClick={() => setConfirmOverwrite(false)} type="button">Abbrechen</button>
                <button className="is-danger" onClick={() => startGame(true)} type="button">Trotzdem neu beginnen</button>
              </div>
            </div>
          ) : (
            <Button className="bs-start-button" disabled={!ready || corruptSave} onClick={() => startGame(false)} type="button">
              Neue Partie starten <span aria-hidden="true">→</span>
            </Button>
          )}
        </section>
      </main>
    </div>
  )
}
