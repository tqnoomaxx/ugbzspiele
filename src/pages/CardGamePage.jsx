import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import {
  CardsIcon,
  MinusIcon,
  PlusIcon,
  StarIcon,
  TrophyIcon,
  UndoIcon,
} from '../components/Icons.jsx'
import {
  changeEntry,
  confirmBids,
  confirmResults,
  undo,
} from '../games/card-game/gameEngine.js'
import { gameRepository } from '../games/card-game/gameRepository.js'

function PlayerCounter({ game, index, onChange }) {
  const player = game.players[index]
  const currentValue = game.phase === 'bid' ? game.bids[index] : game.results[index]
  const maximum = game.rounds[game.roundIndex]
  const isStarter = index === game.roundIndex % game.players.length

  return (
    <div className={`counter-row ${isStarter ? 'counter-row--starter' : ''}`}>
      <div className="counter-row__player">
        {isStarter ? (
          <span className="starter-mark"><StarIcon size={16} /> Start</span>
        ) : null}
        <strong>{player.name}</strong>
        {game.phase === 'result' ? <small>Angesagt: {game.bids[index]}</small> : null}
      </div>
      <div className="counter-control">
        <button
          aria-label={`${player.name}: Wert verringern`}
          disabled={currentValue === 0}
          onClick={() => onChange(index, -1)}
          type="button"
        >
          <MinusIcon size={22} />
        </button>
        <output aria-live="polite" aria-label={`${player.name}: ${currentValue}`}>{currentValue}</output>
        <button
          aria-label={`${player.name}: Wert erhöhen`}
          className="counter-control__plus"
          disabled={currentValue === maximum}
          onClick={() => onChange(index, 1)}
          type="button"
        >
          <PlusIcon size={22} />
        </button>
      </div>
    </div>
  )
}

function Scoreboard({ game }) {
  const lastRound = game.history.at(-1)

  return (
    <aside className="score-panel" aria-labelledby="score-title">
      <h2 id="score-title">Spielstand</h2>
      <div className="score-table" role="table" aria-label="Aktueller Spielstand">
        <div className="score-table__row score-table__header" role="row">
          <span role="columnheader">Spieler</span>
          <span role="columnheader">Punkte</span>
          <span role="columnheader">Letzte Runde</span>
        </div>
        {game.players.map((player, index) => {
          const delta = lastRound?.deltas[index]
          return (
            <div className="score-table__row" key={player.id} role="row">
              <strong role="cell">{player.name}</strong>
              <span role="cell">{game.scores[index]}</span>
              <span
                className={delta == null ? 'score-delta' : delta >= 0 ? 'score-delta score-delta--plus' : 'score-delta score-delta--minus'}
                role="cell"
              >
                {delta == null ? '–' : `${delta >= 0 ? '+' : ''}${delta}`}
              </span>
            </div>
          )
        })}
      </div>

      {game.history.length ? (
        <details className="round-history">
          <summary>Rundenverlauf</summary>
          <div className="round-history__scroll">
            <table>
              <thead>
                <tr>
                  <th>Runde</th>
                  {game.players.map((player) => <th key={player.id}>{player.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {[...game.history].reverse().map((round) => (
                  <tr key={round.roundIndex}>
                    <th>{round.cards}</th>
                    {round.totals.map((total, index) => (
                      <td key={game.players[index].id}>{total}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </aside>
  )
}

function FinalScore({ game, onNewGame, onHome }) {
  const ranking = useMemo(() => (
    game.players
      .map((player, index) => ({ ...player, score: game.scores[index] }))
      .sort((first, second) => second.score - first.score)
  ), [game.players, game.scores])

  return (
    <main className="final-shell">
      <section className="final-card" aria-labelledby="final-title">
        <TrophyIcon className="final-card__trophy" size={54} />
        <h1 id="final-title">Endergebnis</h1>
        <div className="final-ranking">
          {ranking.map((player, index) => (
            <div className={`final-row ${index === 0 ? 'final-row--winner' : ''}`} key={player.id}>
              <span className="final-row__rank">{index + 1}</span>
              <strong>{player.name}</strong>
              <span>{player.score} Punkte</span>
            </div>
          ))}
        </div>
        <div className="final-actions">
          <Button onClick={onNewGame} type="button">Neues Spiel</Button>
          <Button onClick={onHome} type="button" variant="outline">Zur Startseite</Button>
        </div>
      </section>
    </main>
  )
}

export default function CardGamePage() {
  const router = useRouter()
  const [game, setGame] = useState(() => gameRepository.load())
  const [error, setError] = useState('')

  useEffect(() => {
    if (game) gameRepository.save(game)
  }, [game])

  useEffect(() => {
    if (!game) router.replace('/kartenspiel')
  }, [game, router])

  if (!game) {
    return (
      <main className="route-loader" aria-live="polite">
        <span className="route-loader__mark">UGBZ</span>
      </main>
    )
  }

  function startNewGame() {
    gameRepository.clear()
    router.push('/kartenspiel')
  }

  if (game.phase === 'complete') {
    return (
      <div className="page page--game">
        <AppHeader home />
        <FinalScore game={game} onHome={() => router.push('/')} onNewGame={startNewGame} />
      </div>
    )
  }

  const cards = game.rounds[game.roundIndex]
  const roundNumber = game.roundIndex + 1
  const progress = (roundNumber / game.rounds.length) * 100
  const entryTotal = (game.phase === 'bid' ? game.bids : game.results)
    .reduce((total, value) => total + value, 0)

  function handleEntryChange(index, amount) {
    setGame((current) => changeEntry(current, index, amount))
    setError('')
  }

  function handleConfirm() {
    if (game.phase === 'bid') {
      setGame((current) => confirmBids(current))
      setError('')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const outcome = confirmResults(game)
    if (outcome.error) {
      setError(outcome.error)
      return
    }

    setGame(outcome.game)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleUndo() {
    setGame((current) => undo(current))
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const canUndo = game.phase === 'result' || game.history.length > 0

  return (
    <div className="page page--game">
      <AppHeader home />
      <main className="game-layout">
        <section className="round-panel" aria-labelledby="phase-title">
          <header className="round-header">
            <h1>Kartenspiel</h1>
            <div className="round-meta">
              <span><CardsIcon size={23} /> Runde {roundNumber} von {game.rounds.length}</span>
              <span className="round-meta__divider" aria-hidden="true" />
              <span><strong>{cards}</strong> {cards === 1 ? 'Karte' : 'Karten'}</span>
            </div>
            <div className="round-progress" aria-label={`Rundenfortschritt ${Math.round(progress)} Prozent`}>
              <span style={{ width: `${progress}%` }} />
            </div>
          </header>

          <div className="phase-heading">
            <h2 id="phase-title">{game.phase === 'bid' ? 'Stiche ansagen' : 'Ergebnisse eintragen'}</h2>
            <p>
              {game.phase === 'bid'
                ? `Insgesamt angesagt: ${entryTotal}`
                : `Verteilt: ${entryTotal} von ${cards} ${cards === 1 ? 'Stich' : 'Stichen'}`}
            </p>
          </div>

          <div className="counter-list">
            {game.players.map((player, index) => (
              <PlayerCounter
                game={game}
                index={index}
                key={player.id}
                onChange={handleEntryChange}
              />
            ))}
          </div>

          <p className="game-error" role="alert">{error}</p>

          <Button className="round-confirm" onClick={handleConfirm} type="button">
            {game.phase === 'bid' ? 'Ansagen bestätigen' : 'Runde auswerten'}
          </Button>
          <Button
            className="round-undo"
            disabled={!canUndo}
            onClick={handleUndo}
            type="button"
            variant="outline"
          >
            <UndoIcon size={21} />
            Letzte Eingabe korrigieren
          </Button>
        </section>

        <Scoreboard game={game} />
      </main>
    </div>
  )
}
