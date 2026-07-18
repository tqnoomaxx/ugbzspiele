'use client'

import { useEffect, useMemo, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import {
  CardsIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
  StarIcon,
  TrophyIcon,
  UndoIcon,
} from '../components/Icons.jsx'
import {
  buildRanking,
  changeEntry,
  confirmBids,
  confirmResults,
  describeScore,
  setEntry,
  undo,
} from '../games/card-game/gameEngine.js'
import { gameRepository } from '../games/card-game/gameRepository.js'

function scrollToTop() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
}

function PlayerCounter({ game, index, onChange, onSet }) {
  const player = game.players[index]
  const currentValue = game.phase === 'bid' ? game.bids[index] : game.results[index]
  const maximum = game.rounds[game.roundIndex]
  const isStarter = index === game.roundIndex % game.players.length

  return (
    <div className={`counter-row ${isStarter ? 'counter-row--starter' : ''}`}>
      <div className="counter-row__player">
        {isStarter ? (
          <span className="starter-mark"><StarIcon size={16} /> Gibt zuerst</span>
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
        <label className="sr-only" htmlFor={`counter-${player.id}`}>
          {player.name}: {game.phase === 'bid' ? 'Ansage' : 'Ergebnis'}
        </label>
        <input
          aria-label={`${player.name}: ${game.phase === 'bid' ? 'Ansage' : 'Ergebnis'}`}
          className="counter-control__value"
          id={`counter-${player.id}`}
          inputMode="numeric"
          max={maximum}
          min="0"
          onChange={(event) => onSet(index, event.target.value)}
          onFocus={(event) => event.target.select()}
          pattern="[0-9]*"
          type="number"
          value={currentValue}
        />
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

function ScoreRows({ game, withHeader = true }) {
  const lastRound = game.history.at(-1)
  const ranking = buildRanking(game.players, game.scores)

  return (
    <div className="score-table" role="table" aria-label="Aktueller Spielstand">
      {withHeader ? (
        <div className="score-table__row score-table__header" role="row">
          <span role="columnheader">Platz · Spieler</span>
          <span role="columnheader">Punkte</span>
          <span role="columnheader">Letzte Runde</span>
        </div>
      ) : null}
      {ranking.map((player) => {
        const delta = lastRound?.deltas[player.playerIndex]
        return (
          <div className="score-table__row" key={player.id} role="row">
            <strong role="cell"><span className="score-rank">{player.rank}.</span> {player.name}</strong>
            <span role="cell">{player.score}</span>
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
  )
}

function leaderLabel(ranking) {
  const winners = ranking.filter((player) => player.isWinner)
  if (winners.length === ranking.length) return `Alle gleichauf · ${winners[0]?.score ?? 0} Punkte`
  if (winners.length > 2) return `${winners.length} führen · ${winners[0].score} Punkte`
  return `${winners.map((player) => player.name).join(' & ')} ${winners.length > 1 ? 'führen' : 'führt'} · ${winners[0].score} Punkte`
}

function MobileScoreSummary({ game }) {
  const ranking = buildRanking(game.players, game.scores)

  return (
    <details className="score-peek">
      <summary>
        <span>Zwischenstand</span>
        <strong>{leaderLabel(ranking)}</strong>
      </summary>
      <ScoreRows game={game} withHeader={false} />
    </details>
  )
}

function RoundHistory({ game }) {
  if (!game.history.length) return null

  return (
    <details className="round-history">
      <summary>Rundenverlauf <span>{game.history.length}</span></summary>
      <div className="round-history__scroll">
        {[...game.history].reverse().map((round) => (
          <details className="history-round" key={round.roundIndex}>
            <summary>
              <span>Runde {round.roundIndex + 1}</span>
              <strong>{round.cards} {round.cards === 1 ? 'Karte' : 'Karten'}</strong>
            </summary>
            <div className="history-round__table" role="table" aria-label={`Details zu Runde ${round.roundIndex + 1}`}>
              <div className="history-round__row history-round__header" role="row">
                <span role="columnheader">Spieler</span>
                <span role="columnheader">Ansage</span>
                <span role="columnheader">Stiche</span>
                <span role="columnheader">Runde</span>
                <span role="columnheader">Gesamt</span>
              </div>
              {game.players.map((player, index) => {
                const score = describeScore(round.bids[index], round.results[index])
                return (
                  <div className="history-round__row" key={player.id} role="row">
                    <strong role="cell">{player.name}</strong>
                    <span role="cell">{round.bids[index]}</span>
                    <span role="cell">{round.results[index]}</span>
                    <span className={score.delta >= 0 ? 'score-delta--plus' : 'score-delta--minus'} role="cell">
                      {score.delta >= 0 ? '+' : ''}{score.delta}
                      <small>{score.calculation}</small>
                    </span>
                    <span role="cell">{round.totals[index]}</span>
                  </div>
                )
              })}
            </div>
          </details>
        ))}
      </div>
    </details>
  )
}

function LastRoundBreakdown({ game }) {
  const round = game.history.at(-1)
  if (!round) return null

  return (
    <details className="score-breakdown">
      <summary>Letzte Runde erklärt</summary>
      <div className="score-breakdown__list">
        {game.players.map((player, index) => {
          const explanation = describeScore(round.bids[index], round.results[index])
          return (
            <div key={player.id}>
              <strong>{player.name}</strong>
              <span>{explanation.label}</span>
              <b className={explanation.delta >= 0 ? 'score-delta--plus' : 'score-delta--minus'}>
                {explanation.calculation}
              </b>
            </div>
          )
        })}
      </div>
    </details>
  )
}

function Scoreboard({ game }) {
  return (
    <aside className="score-panel" aria-labelledby="score-title">
      <h2 id="score-title">Spielstand</h2>
      <ScoreRows game={game} />
      <LastRoundBreakdown game={game} />
      <RoundHistory game={game} />
    </aside>
  )
}

function ScoringGuide() {
  return (
    <details className="scoring-guide scoring-guide--game">
      <summary>So wird gewertet</summary>
      <p><strong>Ansage getroffen:</strong> 5 Punkte plus gewonnene Stiche.</p>
      <p><strong>Ansage verfehlt:</strong> −5 Punkte minus Abweichung.</p>
    </details>
  )
}

function FinalScore({ game, onCorrect, onNewGame, onHome }) {
  const ranking = useMemo(() => buildRanking(game.players, game.scores), [game.players, game.scores])
  const winners = ranking.filter((player) => player.isWinner)
  const sharedWin = winners.length > 1

  return (
    <main className="final-shell">
      <section className="final-card" aria-labelledby="final-title">
        <TrophyIcon className="final-card__trophy" size={54} />
        <p className="final-card__eyebrow">Spiel beendet</p>
        <h1 id="final-title">{sharedWin ? 'Gemeinsamer Sieg' : 'Endergebnis'}</h1>
        <p className="final-card__winner">
          {sharedWin
            ? `${winners.map((player) => player.name).join(', ')} teilen sich Platz 1.`
            : `${winners[0].name} gewinnt mit ${winners[0].score} Punkten.`}
        </p>
        <div className="final-ranking">
          {ranking.map((player) => (
            <div className={`final-row ${player.isWinner ? 'final-row--winner' : ''}`} key={player.id}>
              <span className="final-row__rank">{player.rank}</span>
              <strong>{player.name}</strong>
              <span>{player.score} Punkte</span>
            </div>
          ))}
        </div>
        <Button className="final-correct" onClick={onCorrect} type="button" variant="outline">
          <UndoIcon size={21} />
          Letzte Runde korrigieren
        </Button>
        <div className="final-actions">
          <Button onClick={onNewGame} type="button">Neues Spiel</Button>
          <Button onClick={onHome} type="button" variant="outline">Zur Startseite</Button>
        </div>
      </section>
    </main>
  )
}

export default function CardGamePage() {
  const [game, setGame] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const [saveStatus, setSaveStatus] = useState('saved')

  useEffect(() => {
    setGame(gameRepository.load())
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded || !game) return
    setSaveStatus(gameRepository.save(game) ? 'saved' : 'error')
  }, [game, loaded])

  useEffect(() => {
    if (loaded && !game) window.location.replace(appPath('/kartenspiel'))
  }, [game, loaded])

  if (!loaded || !game) {
    return (
      <main className="route-loader" aria-live="polite">
        <span className="route-loader__mark">UGBZ</span>
      </main>
    )
  }

  function startNewGame() {
    gameRepository.clear()
    window.location.assign(appPath('/kartenspiel'))
  }

  function correctFinalRound() {
    setGame((current) => undo(current))
    setError('')
    scrollToTop()
  }

  if (game.phase === 'complete') {
    return (
      <div className="page page--game">
        <AppHeader home />
        <FinalScore
          game={game}
          onCorrect={correctFinalRound}
          onHome={() => window.location.assign('/')}
          onNewGame={startNewGame}
        />
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

  function handleDirectEntry(index, value) {
    setGame((current) => setEntry(current, index, value))
    setError('')
  }

  function handleConfirm() {
    if (game.phase === 'bid') {
      setGame((current) => confirmBids(current))
      setError('')
      scrollToTop()
      return
    }

    const outcome = confirmResults(game)
    if (outcome.error) {
      setError(outcome.error)
      return
    }

    setGame(outcome.game)
    setError('')
    scrollToTop()
  }

  function handleUndo() {
    setGame((current) => undo(current))
    setError('')
    scrollToTop()
  }

  const canUndo = game.phase === 'result' || game.history.length > 0
  const undoLabel = game.phase === 'result'
    ? 'Ansagen ändern'
    : `Runde ${game.roundIndex} bearbeiten`

  return (
    <div className="page page--game">
      <AppHeader home />
      <main className="game-layout">
        <section className="round-panel" aria-labelledby="phase-title">
          <header className="round-header">
            <div className="round-header__topline">
              <h1>Kartenspiel</h1>
              <span className={`save-status save-status--${saveStatus}`} role="status">
                {saveStatus === 'saved' ? <CheckIcon size={16} /> : null}
                {saveStatus === 'saved' ? 'Automatisch gespeichert' : 'Speichern fehlgeschlagen'}
              </span>
            </div>
            <div className="round-meta">
              <span><CardsIcon size={23} /> Runde {roundNumber} von {game.rounds.length}</span>
              <span className="round-meta__divider" aria-hidden="true" />
              <span><strong>{cards}</strong> {cards === 1 ? 'Karte' : 'Karten'}</span>
            </div>
            <div className="round-progress" aria-label={`Rundenfortschritt ${Math.round(progress)} Prozent`}>
              <span style={{ width: `${progress}%` }} />
            </div>
          </header>

          <MobileScoreSummary game={game} />

          <div className="phase-heading">
            <h2 id="phase-title">{game.phase === 'bid' ? 'Stiche ansagen' : 'Ergebnisse eintragen'}</h2>
            <p>
              {game.phase === 'bid'
                ? `Insgesamt angesagt: ${entryTotal}`
                : `Verteilt: ${entryTotal} von ${cards} ${cards === 1 ? 'Stich' : 'Stichen'}`}
            </p>
          </div>

          <ScoringGuide />

          <div className="counter-list">
            {game.players.map((player, index) => (
              <PlayerCounter
                game={game}
                index={index}
                key={player.id}
                onChange={handleEntryChange}
                onSet={handleDirectEntry}
              />
            ))}
          </div>

          <div className="round-actions">
            <p className="game-error" role="alert">{error}</p>
            <Button className="round-confirm" onClick={handleConfirm} type="button">
              {game.phase === 'bid' ? 'Ansagen bestätigen' : 'Runde auswerten'}
            </Button>
            {canUndo ? (
              <Button
                className="round-undo"
                onClick={handleUndo}
                type="button"
                variant="outline"
              >
                <UndoIcon size={21} />
                {undoLabel}
              </Button>
            ) : null}
          </div>
        </section>

        <Scoreboard game={game} />
      </main>
    </div>
  )
}
