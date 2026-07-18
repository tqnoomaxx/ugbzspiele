'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import { ArrowRightIcon, CheckIcon, CloseIcon, DoorIcon, EnvelopeIcon, PlusIcon, TrophyIcon, UserIcon } from '../components/Icons.jsx'
import {
  addPlayer,
  advanceExpiredPhase,
  beginVoting,
  finishSpeakingTurn,
  getCurrentRevealPlayerId,
  getCurrentSpeakerId,
  getPrivatePlayerView,
  markPlayerRevealed,
  nextRound,
  removePlayer,
  returnToLobby,
  startGame,
  submitVote,
} from '../games/doppelwort/gameEngine.js'
import { doppelwortRoomRepository } from '../games/doppelwort/roomRepository.js'

const PHASE_LABELS = {
  reveal: 'Geheime Wörter',
  speaking: 'Hinweisrunde',
  meeting: 'Beratung',
  voting: 'Abstimmung',
  result: 'Auflösung',
  complete: 'Gesamtwertung',
}

function playerById(room, playerId) {
  return room.players.find((player) => player.id === playerId)
}

function formatTime(milliseconds) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function Timer({ endsAt, now, label }) {
  if (!endsAt) return <span className="dw-timer dw-timer--open">Ohne Zeitdruck</span>
  const remaining = Date.parse(endsAt) - now
  return (
    <div className={`dw-timer ${remaining <= 10000 ? 'dw-timer--urgent' : ''}`} aria-label={`${label}: ${formatTime(remaining)}`}>
      <small>{label}</small>
      <strong>{formatTime(remaining)}</strong>
    </div>
  )
}

function RoomTopbar({ room, now, onCopy, copied }) {
  return (
    <div className="dw-room-topbar">
      <div>
        <span className="dw-room-topbar__label">Raum</span>
        <strong>{room.name}</strong>
      </div>
      <button className="dw-room-code" onClick={onCopy} type="button">
        <span>{copied ? 'Link kopiert' : 'Code kopieren'}</span>
        <strong>{room.code}</strong>
      </button>
      {room.game ? <Timer endsAt={room.game.phaseEndsAt} label={PHASE_LABELS[room.game.phase]} now={now} /> : <span className="dw-room-state"><i /> Lobby</span>}
    </div>
  )
}

function PlayerPill({ active = false, detail, player }) {
  return (
    <div className={`dw-player-pill ${active ? 'is-active' : ''} ${!player.connected && !player.isDemo ? 'is-offline' : ''}`}>
      <span><UserIcon size={19} /></span>
      <div><strong>{player.name}</strong>{detail ? <small>{detail}</small> : null}</div>
      {player.isHost ? <em>Leitung</em> : player.isDemo ? <em>Lokal</em> : <i aria-label={player.connected ? 'Verbunden' : 'Offline'} />}
    </div>
  )
}

function LobbyPhase({ actorId, onAction, room }) {
  const [demoName, setDemoName] = useState('')
  const isHost = actorId === room.hostId
  const canStart = room.players.length >= 3 && room.options.imposterCount < room.players.length

  const addDemo = (event) => {
    event.preventDefault()
    const fallbackName = `Gast ${room.players.length + 1}`
    onAction((current) => addPlayer(current, demoName || fallbackName, { isDemo: true }))
    setDemoName('')
  }

  return (
    <section className="dw-phase dw-phase--lobby">
      <div className="dw-phase-heading">
        <span className="dw-kicker">Der Salon füllt sich</span>
        <h1>Wartet auf eure Runde</h1>
        <p>Teile den Code. Für den Test auf einem Gerät kannst du lokale Gäste ergänzen.</p>
      </div>

      <div className="dw-lobby-room-grid">
        <div className="dw-player-panel">
          <div className="dw-panel-heading"><h2>Am Tisch</h2><span>{room.players.length}/{room.options.maxPlayers}</span></div>
          <div className="dw-player-list">
            {room.players.map((player) => (
              <div className="dw-player-manage" key={player.id}>
                <PlayerPill player={player} />
                {isHost && player.id !== room.hostId ? (
                  <button aria-label={`${player.name} entfernen`} onClick={() => onAction((current) => removePlayer(current, player.id, { actorId }))} type="button"><CloseIcon size={18} /></button>
                ) : null}
              </div>
            ))}
          </div>

          {isHost && room.players.length < room.options.maxPlayers ? (
            <form className="dw-demo-add" onSubmit={addDemo}>
              <input maxLength={28} onChange={(event) => setDemoName(event.target.value)} placeholder="Lokalen Gast hinzufügen" value={demoName} />
              <button aria-label="Gast hinzufügen" type="submit"><PlusIcon size={20} /></button>
            </form>
          ) : null}
        </div>

        <aside className="dw-rule-card">
          <span className="dw-kicker">Diese Partie</span>
          <h2>{room.options.roundCount} {room.options.roundCount === 1 ? 'Runde' : 'Runden'}</h2>
          <dl>
            <div><dt>Imposter</dt><dd>{room.options.imposterCount}</dd></div>
            <div><dt>Sprache</dt><dd>{room.options.language === 'en' ? 'English' : 'Deutsch'}</dd></div>
            <div><dt>Redezeit</dt><dd>{room.options.speakingSeconds} Sek.</dd></div>
            <div><dt>Abstimmung</dt><dd>{room.options.votingSeconds} Sek.</dd></div>
            <div><dt>Überspringen</dt><dd>{room.options.skipAllowed ? 'Ja' : 'Nein'}</dd></div>
            <div><dt>Punkte</dt><dd>{room.options.pointsEnabled ? 'Aktiv' : 'Aus'}</dd></div>
          </dl>
          <p>Die Crew kennt ein gemeinsames Wort. {room.options.imposterCount === 1 ? 'Der Imposter kennt' : 'Die Imposter kennen'} ein ähnliches, aber anderes Wort.</p>
        </aside>
      </div>

      {isHost ? (
        <div className="dw-sticky-action">
          <div>{canStart ? <><strong>Alles bereit</strong><span>Wörter und Rollen werden zufällig verteilt.</span></> : <><strong>Noch {Math.max(0, 3 - room.players.length)} Plätze nötig</strong><span>Mindestens drei Personen spielen mit.</span></>}</div>
          <Button disabled={!canStart} onClick={() => onAction((current) => startGame(current, actorId))}>Rollen verteilen <ArrowRightIcon size={21} /></Button>
        </div>
      ) : <div className="dw-waiting-note"><i /><span>Die Spielleitung startet, sobald alle bereit sind.</span></div>}
    </section>
  )
}

function SealedEnvelope({ name, onOpen, opening }) {
  return (
    <div className="dw-envelope-stage">
      <button
        aria-busy={opening}
        aria-label={`${name}s versiegelten Umschlag öffnen`}
        className={`dw-envelope ${opening ? 'is-opening' : ''}`}
        onClick={onOpen}
        type="button"
      >
        <span aria-hidden="true" className="dw-envelope__paper">
          <span className="dw-envelope__back" />
          <span className="dw-envelope__letter" />
          <span className="dw-envelope__flap" />
          <span className="dw-envelope__recipient">Nur für {name}</span>
          <span className="dw-envelope__pocket" />
          <span className="dw-envelope__seal">DW</span>
        </span>
        <span className="dw-envelope__action"><EnvelopeIcon size={19} /> {opening ? 'Wird geöffnet …' : 'Umschlag öffnen'}</span>
      </button>
    </div>
  )
}

function RevealPhase({ onAction, room }) {
  const [secretShown, setSecretShown] = useState(false)
  const [envelopeOpening, setEnvelopeOpening] = useState(false)
  const revealPlayerId = getCurrentRevealPlayerId(room)
  const player = playerById(room, revealPlayerId)
  const privateView = getPrivatePlayerView(room, revealPlayerId)
  const progress = room.game.revealedPlayerIds.length + 1

  useEffect(() => {
    setSecretShown(false)
    setEnvelopeOpening(false)
  }, [revealPlayerId])

  const openEnvelope = () => {
    if (envelopeOpening) return
    setEnvelopeOpening(true)
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    window.setTimeout(() => setSecretShown(true), reducedMotion ? 0 : 440)
  }

  return (
    <section className="dw-phase dw-phase--reveal">
      <div className="dw-reveal-progress" aria-label={`Person ${progress} von ${room.game.revealOrder.length}`}>
        {room.game.revealOrder.map((id, index) => (
          <span aria-hidden="true" className={index < progress - 1 ? 'is-done' : index === progress - 1 ? 'is-current' : ''} key={id}>
            <EnvelopeIcon size={16} />
          </span>
        ))}
      </div>

      {!secretShown ? (
        <div className="dw-pass-card dw-pass-card--envelope">
          <span className="dw-kicker">Versiegelte Nachricht</span>
          <h1>{player.name}, dein Umschlag.</h1>
          <p>Gib das Gerät weiter. Erst wenn {player.name} allein auf den Bildschirm schaut, darf der Umschlag geöffnet werden.</p>
          <SealedEnvelope name={player.name} onOpen={openEnvelope} opening={envelopeOpening} />
        </div>
      ) : (
        <div className={`dw-secret-card dw-secret-card--${privateView.secret.role}`}>
          <span className="dw-secret-card__opened"><EnvelopeIcon size={18} /> Umschlag geöffnet</span>
          <span className="dw-secret-card__eyebrow">{privateView.secret.role === 'crew' ? 'Du gehörst zur Crew' : 'Du bist Imposter'}</span>
          <p>In deinem Umschlag steht</p>
          <h1>{privateView.secret.word}</h1>
          {privateView.secret.hint ? <span className="dw-secret-card__hint">Kategorie · {privateView.secret.hint}</span> : null}
          <div className="dw-secret-card__rule" />
          <p className="dw-secret-card__help">Merke es dir gut. Nenne später einen Hinweis, der passt – aber verrate das Wort nicht.</p>
          <Button onClick={() => onAction((current) => markPlayerRevealed(current, revealPlayerId))}>Wort gemerkt · Umschlag schließen <CheckIcon size={20} /></Button>
        </div>
      )}
    </section>
  )
}

function SpeakingPhase({ actorId, now, onAction, room }) {
  const speakerId = getCurrentSpeakerId(room)
  const speaker = playerById(room, speakerId)
  const canAdvance = actorId === room.hostId || actorId === speakerId

  return (
    <section className="dw-phase dw-phase--speaking">
      <div className="dw-speak-stage">
        <span className="dw-kicker">Hinweis {room.game.currentSpeakerIndex + 1} von {room.game.speakingOrder.length}</span>
        <h1>{speaker.name} spricht.</h1>
        <p>Gib genau einen Hinweis. Nicht zu eindeutig, nicht zu verdächtig.</p>
        <Timer endsAt={room.game.phaseEndsAt} label="Verbleibend" now={now} />
        <Button disabled={!canAdvance} onClick={() => onAction((current) => finishSpeakingTurn(current, actorId))}>Hinweis beendet <ArrowRightIcon size={20} /></Button>
      </div>

      <aside className="dw-order-panel">
        <span className="dw-kicker">Reihenfolge</span>
        <h2>Wer als Nächstes spricht</h2>
        <div>
          {room.game.speakingOrder.map((playerId, index) => (
            <PlayerPill
              active={index === room.game.currentSpeakerIndex}
              detail={index < room.game.currentSpeakerIndex ? 'Hinweis gegeben' : index === room.game.currentSpeakerIndex ? 'Jetzt dran' : `Position ${index + 1}`}
              key={playerId}
              player={playerById(room, playerId)}
            />
          ))}
        </div>
      </aside>
    </section>
  )
}

function MeetingPhase({ actorId, now, onAction, room }) {
  const isHost = actorId === room.hostId
  return (
    <section className="dw-phase dw-phase--meeting">
      <div className="dw-meeting-emblem"><DoorIcon size={39} /></div>
      <span className="dw-kicker">Alle Hinweise sind gefallen</span>
      <h1>Wer hatte das andere Wort?</h1>
      <p>Vergleicht eure Hinweise. Verteidigt euch, fragt nach – und trefft dann eine Entscheidung.</p>
      <Timer endsAt={room.game.phaseEndsAt} label="Beratungszeit" now={now} />
      <div className="dw-meeting-names">{room.players.map((player) => <span key={player.id}>{player.name}</span>)}</div>
      {isHost ? <Button onClick={() => onAction((current) => beginVoting(current, actorId))}>Geheim abstimmen <ArrowRightIcon size={20} /></Button> : <span className="dw-host-hint">Die Spielleitung eröffnet gleich die Abstimmung.</span>}
    </section>
  )
}

function VotingPhase({ onAction, room }) {
  const nextVoterId = room.game.playerIds.find((playerId) => !(playerId in room.game.votes))
  const voter = playerById(room, nextVoterId)
  const [ready, setReady] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    setReady(false)
    setSelectedIds([])
  }, [nextVoterId])

  const toggleTarget = (playerId) => {
    setSelectedIds((current) => {
      if (current.includes(playerId)) return current.filter((id) => id !== playerId)
      if (current.length >= room.options.imposterCount) return current
      return [...current, playerId]
    })
  }

  const confirmVote = () => {
    onAction((current) => submitVote(current, nextVoterId, selectedIds))
  }

  if (!voter) return null

  return (
    <section className="dw-phase dw-phase--voting">
      {!ready ? (
        <div className="dw-pass-card dw-pass-card--vote">
          <span className="dw-kicker">Geheime Abstimmung</span>
          <h1>{voter.name}, übernimm.</h1>
          <p>Gib das Gerät weiter. Deine Auswahl wird nach dem Bestätigen verborgen.</p>
          <span className="dw-vote-progress">{Object.keys(room.game.votes).length} von {room.game.playerIds.length} Stimmen abgegeben</span>
          <Button onClick={() => setReady(true)}>Stimmzettel öffnen</Button>
        </div>
      ) : (
        <div className="dw-ballot">
          <div className="dw-phase-heading">
            <span className="dw-kicker">{voter.name}s Stimmzettel</span>
            <h1>Wem traust du nicht?</h1>
            <p>Wähle bis zu {room.options.imposterCount} {room.options.imposterCount === 1 ? 'Person' : 'Personen'}. Absolute Mehrheit entscheidet.</p>
          </div>

          <div className="dw-ballot-grid">
            {room.game.playerIds.filter((playerId) => playerId !== nextVoterId).map((playerId) => {
              const player = playerById(room, playerId)
              const selected = selectedIds.includes(playerId)
              return (
                <button aria-pressed={selected} className={selected ? 'is-selected' : ''} key={playerId} onClick={() => toggleTarget(playerId)} type="button">
                  <span><UserIcon size={24} /></span>
                  <strong>{player.name}</strong>
                  <i>{selected ? <CheckIcon size={18} /> : null}</i>
                </button>
              )
            })}
          </div>

          <div className="dw-sticky-action dw-sticky-action--ballot">
            <div><strong>{selectedIds.length}/{room.options.imposterCount} gewählt</strong><span>Nach dem Bestätigen ist keine Änderung möglich.</span></div>
            {selectedIds.length === 0 && room.options.skipAllowed ? (
              <Button onClick={confirmVote} variant="outline">Überspringen</Button>
            ) : (
              <Button disabled={selectedIds.length === 0} onClick={confirmVote}>Stimme bestätigen <CheckIcon size={19} /></Button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function ScoreTable({ room }) {
  const ranking = [...room.players].sort((first, second) => second.score - first.score || first.joinedAt.localeCompare(second.joinedAt))
  return (
    <div className="dw-score-list">
      {ranking.map((player, index) => (
        <div key={player.id}>
          <span>{index + 1}</span>
          <strong>{player.name}</strong>
          <em>{player.score} {player.score === 1 ? 'Punkt' : 'Punkte'}</em>
        </div>
      ))}
    </div>
  )
}

function ResultPhase({ actorId, onAction, room }) {
  const result = room.game.result
  const isHost = actorId === room.hostId
  const crewWon = result.winner === 'crew'

  return (
    <section className={`dw-phase dw-phase--result dw-phase--result-${crewWon ? 'crew' : 'imposters'}`}>
      <div className="dw-result-header">
        <span className="dw-result-icon">{crewWon ? <CheckIcon size={34} /> : <UserIcon size={34} />}</span>
        <span className="dw-kicker">Runde {room.game.roundNumber} aufgelöst</span>
        <h1>{crewWon ? 'Die Crew hat sie enttarnt.' : 'Die Imposter bleiben im Spiel.'}</h1>
        <p>{crewWon ? 'Alle Imposter hatten die nötige Mehrheit – ohne falsche Beschuldigung.' : 'Mindestens ein Imposter blieb unter der Mehrheit oder eine Crew-Person wurde fälschlich erkannt.'}</p>
      </div>

      <div className="dw-word-reveal">
        <div><span>Crew-Wort</span><strong>{room.game.crewWord}</strong></div>
        <i>≠</i>
        <div><span>Imposter-Wort</span><strong>{room.game.imposterWord}</strong></div>
      </div>

      <div className="dw-result-grid">
        <div className="dw-result-roles">
          <div className="dw-panel-heading"><h2>Rollen & Stimmen</h2><span>Mehrheit ab {result.majorityRequired}</span></div>
          {room.game.playerIds.map((playerId) => {
            const player = playerById(room, playerId)
            const role = room.game.assignments[playerId]
            return (
              <div className={role === 'imposter' ? 'is-imposter' : ''} key={playerId}>
                <span><UserIcon size={20} /></span>
                <strong>{player.name}</strong>
                <small>{role === 'imposter' ? 'Imposter' : 'Crew'}</small>
                <em>{result.voteCounts[playerId]} {result.voteCounts[playerId] === 1 ? 'Stimme' : 'Stimmen'}</em>
              </div>
            )
          })}
        </div>
        {room.options.pointsEnabled ? (
          <div className="dw-result-score">
            <div className="dw-panel-heading"><h2>Gesamtstand</h2><span>nach Runde {room.game.roundNumber}</span></div>
            <ScoreTable room={room} />
          </div>
        ) : (
          <div className="dw-result-score dw-result-score--disabled">
            <div className="dw-panel-heading"><h2>Ohne Punkte</h2><span>reines Deduktionsspiel</span></div>
            <p>Diese Partie wird ohne Gesamtwertung gespielt. Entscheidend ist nur, welches Team die Runde gewinnt.</p>
          </div>
        )}
      </div>

      {isHost ? (
        <div className="dw-sticky-action">
          <div><strong>{result.lastRound ? 'Partie abgeschlossen' : 'Nächstes Wortpaar wartet'}</strong><span>{result.lastRound ? 'Öffne jetzt die Gesamtwertung.' : `Noch ${room.options.roundCount - room.game.roundNumber} Runden.`}</span></div>
          <Button onClick={() => onAction((current) => nextRound(current, actorId))}>{result.lastRound ? 'Zur Gesamtwertung' : 'Nächste Runde'} <ArrowRightIcon size={20} /></Button>
        </div>
      ) : null}
    </section>
  )
}

function CompletePhase({ actorId, onAction, room }) {
  const isHost = actorId === room.hostId
  const highScore = Math.max(...room.players.map((player) => player.score))
  const winners = room.players.filter((player) => player.score === highScore).map((player) => player.name)
  const winnerLabel = `${winners.join(' & ')} ${winners.length === 1 ? 'gewinnt' : 'gewinnen'}.`
  return (
    <section className="dw-phase dw-phase--complete">
      <TrophyIcon className="dw-complete-trophy" size={62} />
      <span className="dw-kicker">Der Salon schließt</span>
      <h1>{room.options.pointsEnabled ? winnerLabel : 'Partie beendet.'}</h1>
      <p>{room.options.roundCount} {room.options.roundCount === 1 ? 'Runde' : 'Runden'}, zwei Wörter und eine Menge verdächtiger Hinweise.</p>
      {room.options.pointsEnabled ? <ScoreTable room={room} /> : <p className="dw-complete-no-score">Ihr habt bewusst ohne Gesamtwertung gespielt.</p>}
      <div className="dw-complete-actions">
        {isHost ? <Button onClick={() => onAction((current) => returnToLobby(current, actorId))}>Neue Partie im Raum</Button> : null}
        <a className="button button--outline" href="/">Alle Spiele</a>
      </div>
    </section>
  )
}

export default function DoppelwortRoomPage() {
  const [session, setSession] = useState(null)
  const [room, setRoom] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const refresh = useCallback(() => {
    const currentSession = doppelwortRoomRepository.loadSession()
    setSession(currentSession)
    setRoom(currentSession ? doppelwortRoomRepository.load(currentSession.roomCode) : null)
  }, [])

  useEffect(() => {
    refresh()
    return doppelwortRoomRepository.subscribe((event) => {
      const currentSession = doppelwortRoomRepository.loadSession()
      if (!event.code || event.code === currentSession?.roomCode) refresh()
    })
  }, [refresh])

  useEffect(() => {
    if (!session?.roomCode) return undefined
    const interval = window.setInterval(() => {
      const currentNow = Date.now()
      setNow(currentNow)
      try {
        const current = doppelwortRoomRepository.load(session.roomCode)
        const advanced = current ? advanceExpiredPhase(current, currentNow) : current
        if (advanced && advanced !== current) doppelwortRoomRepository.save(advanced)
      } catch {
        // A second local tab may win the transition race; the subscription refreshes this view.
      }
    }, 1000)
    return () => window.clearInterval(interval)
  }, [session?.roomCode])

  const applyAction = useCallback((mutation) => {
    if (!session?.roomCode) return
    setError('')
    try {
      const nextRoom = doppelwortRoomRepository.mutate(session.roomCode, mutation)
      setRoom(nextRoom)
      setNow(Date.now())
    } catch (actionError) {
      setError(actionError.message)
      refresh()
    }
  }, [refresh, session?.roomCode])

  const invitationUrl = useMemo(() => (
    typeof window === 'undefined' || !room ? '' : `${window.location.origin}/doppelwort?code=${room.code}`
  ), [room])

  const copyInvitation = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError(`Einladungslink: ${invitationUrl}`)
    }
  }

  const leaveRoom = () => {
    if (room?.status !== 'lobby') {
      window.location.assign('/')
      return
    }

    if (session?.playerId) {
      try {
        const nextRoom = removePlayer(room, session.playerId, { actorId: session.playerId })
        if (nextRoom.status === 'closed') doppelwortRoomRepository.remove(room.code)
        else doppelwortRoomRepository.save(nextRoom)
      } catch {
        // Clearing the local session still gives the user a deterministic exit.
      }
    }
    doppelwortRoomRepository.clearSession()
    window.location.assign('/doppelwort')
  }

  if (!session || !room || !playerById(room, session.playerId)) {
    return (
      <div className="dw-page">
        <AppHeader variant="dark" backTo="/doppelwort" backLabel="Zur Raumliste" />
        <main className="dw-missing-room">
          <span><DoorIcon size={46} /></span>
          <h1>Keine aktive Raumsitzung</h1>
          <p>Öffne eine Einladung oder erstelle einen neuen Raum.</p>
          <a className="button button--primary" href="/doppelwort">Zur Raumliste</a>
        </main>
      </div>
    )
  }

  const phase = room.game?.phase

  return (
    <div className={`dw-page dw-page--room ${phase ? `dw-page--${phase}` : ''}`}>
      <AppHeader variant="dark" home />
      <main className="dw-game-shell">
        <RoomTopbar copied={copied} now={now} onCopy={copyInvitation} room={room} />
        {error ? <div className="dw-inline-error" role="alert">{error}<button aria-label="Meldung schließen" onClick={() => setError('')} type="button"><CloseIcon size={17} /></button></div> : null}

        {!phase ? <LobbyPhase actorId={session.playerId} onAction={applyAction} room={room} /> : null}
        {phase === 'reveal' ? <RevealPhase onAction={applyAction} room={room} /> : null}
        {phase === 'speaking' ? <SpeakingPhase actorId={session.playerId} now={now} onAction={applyAction} room={room} /> : null}
        {phase === 'meeting' ? <MeetingPhase actorId={session.playerId} now={now} onAction={applyAction} room={room} /> : null}
        {phase === 'voting' ? <VotingPhase onAction={applyAction} room={room} /> : null}
        {phase === 'result' ? <ResultPhase actorId={session.playerId} onAction={applyAction} room={room} /> : null}
        {phase === 'complete' ? <CompletePhase actorId={session.playerId} onAction={applyAction} room={room} /> : null}

        <button className="dw-leave-room" onClick={leaveRoom} type="button">{room.status === 'lobby' ? 'Raum verlassen' : 'Später weiterspielen'}</button>
      </main>
    </div>
  )
}
