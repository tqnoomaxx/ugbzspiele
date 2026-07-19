'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import {
  WEREWOLF_PHASES,
  WEREWOLF_ROLES,
  beginDayVote,
  confirmWerewolfRole,
  continueAfterExecution,
  continueToDay,
  getAlivePlayers,
  getCurrentHunterId,
  getCurrentRoleRevealPlayerId,
  getCurrentVoterId,
  inspectWithSeer,
  selectWolfVictim,
  submitDayVote,
  submitHunterShot,
  submitWitchAction,
} from '../games/werewolf/gameEngine.js'
import { werewolfRepository } from '../games/werewolf/gameRepository.js'

const ROLES = {
  wolf: { name: 'Werwolf', mark: '☾', goal: 'Bringe das Dorf so weit, dass mindestens genauso viele Werwölfe wie andere Personen leben.', action: 'Wählt nachts gemeinsam eine lebende Person außerhalb des Rudels.' },
  seer: { name: 'Seherin', mark: '◉', goal: 'Hilf dem Dorf, ohne deine Rolle zu früh zu verraten.', action: 'Prüfe jede Nacht eine andere lebende Person auf Werwolf.' },
  witch: { name: 'Hexe', mark: '⚗', goal: 'Hilf dem Dorf mit zwei einmaligen Tränken.', action: 'Du besitzt einmal Heilung und einmal Gift, höchstens einen Trank pro Nacht.' },
  hunter: { name: 'Jäger', mark: '⌖', goal: 'Hilf dem Dorf und beobachte genau.', action: 'Wenn du stirbst, reißt du sofort eine lebende Person mit.' },
  villager: { name: 'Dorfbewohner', mark: '⌂', goal: 'Findet und verbannt alle Werwölfe.', action: 'Du hast nachts keine Aktion. Diskutiere und stimme am Tag ab.' },
}

const PHASE_LABELS = {
  [WEREWOLF_PHASES.ROLE_REVEAL]: 'Geheime Rollen',
  [WEREWOLF_PHASES.NIGHT_WOLVES]: 'Werwölfe',
  [WEREWOLF_PHASES.NIGHT_SEER]: 'Seherin',
  [WEREWOLF_PHASES.NIGHT_WITCH]: 'Hexe',
  [WEREWOLF_PHASES.HUNTER_REACTION]: 'Jägerreaktion',
  [WEREWOLF_PHASES.DAWN]: 'Morgengrauen',
  [WEREWOLF_PHASES.DAY]: 'Dorfversammlung',
  [WEREWOLF_PHASES.DAY_VOTE]: 'Abstimmung',
  [WEREWOLF_PHASES.RUNOFF_VOTE]: 'Stichwahl',
  [WEREWOLF_PHASES.EXECUTION]: 'Urteil',
  [WEREWOLF_PHASES.COMPLETE]: 'Spielende',
}

function player(game, id) { return game.players.find((entry) => entry.id === id) }

function VisibilityBadge({ label, secret = false }) {
  return <span className={`ww-visibility ${secret ? 'is-secret' : ''}`}>{label ?? (secret ? 'Nur Spielleitung' : 'Kann die Gruppe sehen')}</span>
}

function TargetGrid({ candidates, onSelect, selectedId }) {
  return (
    <div className="ww-target-grid">
      {candidates.map((candidate) => (
        <button aria-pressed={selectedId === candidate.id} className={selectedId === candidate.id ? 'is-selected' : ''} key={candidate.id} onClick={() => onSelect(candidate.id)} type="button">
          <span>{candidate.name.slice(0, 1).toLocaleUpperCase('de-DE')}</span><strong>{candidate.name}</strong><small>{selectedId === candidate.id ? 'Ausgewählt' : 'Lebt'}</small>
        </button>
      ))}
    </div>
  )
}

function GameChrome({ children, game, secret = false, visibilityLabel }) {
  return (
    <main className={`ww-game-shell ${secret ? 'is-secret' : ''}`}>
      <header className="ww-phasebar">
        <div><span>{game.phase.startsWith('night') ? `Nacht ${game.night?.number ?? 1}` : game.phase === 'role-reveal' ? 'Vorbereitung' : `Tag ${game.day?.number ?? game.night?.number ?? 1}`}</span><strong>{PHASE_LABELS[game.phase]}</strong></div>
        <VisibilityBadge label={visibilityLabel} secret={secret} />
      </header>
      {children}
    </main>
  )
}

function RoleReveal({ game, onConfirm, onOpen, open }) {
  const active = player(game, getCurrentRoleRevealPlayerId(game))
  if (!active) return null
  const role = ROLES[active.role]
  const pack = game.players.filter((entry) => entry.role === WEREWOLF_ROLES.WOLF && entry.id !== active.id).map((entry) => entry.name)
  if (!open) {
    return (
      <div className="ww-handoff" role="dialog" aria-labelledby="ww-handoff-title" aria-modal="true">
        <span className="ww-handoff__mark" aria-hidden="true">☾</span><span className="ww-kicker">Geheime Rolle · {game.revealIndex + 1} von {game.players.length}</span>
        <h1 id="ww-handoff-title">Gerät an {active.name} geben.</h1><p>Die Rolle ist noch vollständig verdeckt. Achte darauf, dass niemand auf den Bildschirm sieht.</p>
        <Button autoFocus onClick={onOpen} type="button">Ich bin {active.name} · Rolle zeigen</Button><small>Beim App-Wechsel wird die Rolle sofort wieder verdeckt.</small>
      </div>
    )
  }
  return (
    <GameChrome game={game} secret visibilityLabel={`Nur ${active.name}`}>
      <section className={`ww-role-reveal ww-role-reveal--${active.role}`}>
        <span className="ww-role-reveal__mark" aria-hidden="true">{role.mark}</span><span className="ww-kicker">{active.name}, deine Rolle ist</span><h1>{role.name}</h1>
        <div className="ww-role-copy"><div><span>Dein Ziel</span><p>{role.goal}</p></div><div><span>Deine Aufgabe</span><p>{role.action}</p></div></div>
        {active.role === WEREWOLF_ROLES.WOLF ? <p className="ww-pack"><strong>Dein Rudel:</strong> {pack.length ? pack.join(' · ') : 'Du bist der einzige Werwolf.'}</p> : null}
        <Button onClick={() => onConfirm(active.id)} type="button">Rolle merken &amp; wieder verbergen</Button>
      </section>
    </GameChrome>
  )
}

function ModeratorNight({ game, onAction, onPrivateResult }) {
  const [selected, setSelected] = useState(null)
  const [witchPoisonOpen, setWitchPoisonOpen] = useState(false)
  const alive = getAlivePlayers(game)
  const wolves = alive.filter((entry) => entry.role === WEREWOLF_ROLES.WOLF)
  const seer = alive.find((entry) => entry.role === WEREWOLF_ROLES.SEER)
  const wolfTarget = player(game, game.night?.wolfTargetId)
  const phase = game.phase
  let title = ''
  let instruction = ''
  let candidates = []

  useEffect(() => {
    setSelected(null)
    setWitchPoisonOpen(false)
  }, [phase])

  if (phase === WEREWOLF_PHASES.NIGHT_WOLVES) {
    title = 'Die Werwölfe erwachen.'
    instruction = `${wolves.map((entry) => entry.name).join(' und ')} wählen gemeinsam ein Opfer. Tippe das vereinbarte Ziel ein.`
    candidates = alive.filter((entry) => entry.role !== WEREWOLF_ROLES.WOLF)
  } else if (phase === WEREWOLF_PHASES.NIGHT_SEER) {
    title = 'Die Seherin erwacht.'
    instruction = `${seer?.name} zeigt auf eine andere lebende Person. Das Ergebnis bleibt bei der Spielleitung.`
    candidates = alive.filter((entry) => entry.id !== seer?.id)
  }

  function confirmTarget() {
    if (!selected) return
    if (phase === WEREWOLF_PHASES.NIGHT_WOLVES) onAction((current) => selectWolfVictim(current, selected))
    else {
      const next = onAction((current) => inspectWithSeer(current, selected))
      if (next) onPrivateResult({ target: player(next, selected), isWolf: next.night.seerInspection.isWolf })
    }
  }

  if (phase === WEREWOLF_PHASES.NIGHT_WITCH) {
    const witch = alive.find((entry) => entry.role === WEREWOLF_ROLES.WITCH)
    const poisonCandidates = alive.filter((entry) => entry.id !== witch?.id)
    return (
      <GameChrome game={game} secret>
        <section className="ww-action-card"><span className="ww-action-mark" aria-hidden="true">⚗</span><span className="ww-kicker">Schritt 3 · Nacht</span><h1>Die Hexe erwacht.</h1><p>{witch?.name} erfährt: {wolfTarget ? `${wolfTarget.name} wurde von den Werwölfen gewählt.` : 'Die Werwölfe haben kein Ziel.'}</p>
          <div className="ww-potion-grid">
            <button disabled={!game.witchResources.healAvailable || !wolfTarget} onClick={() => onAction((current) => submitWitchAction(current, { heal: true }))} type="button"><span>✦</span><strong>Heiltrank</strong><small>{game.witchResources.healAvailable ? `Rette ${wolfTarget?.name ?? 'das Opfer'}` : 'Bereits verbraucht'}</small></button>
            <button aria-expanded={witchPoisonOpen} aria-pressed={witchPoisonOpen} className={witchPoisonOpen ? 'is-selected' : ''} disabled={!game.witchResources.poisonAvailable} onClick={() => { setWitchPoisonOpen((current) => !current); setSelected(null) }} type="button"><span>◆</span><strong>Gifttrank</strong><small>{game.witchResources.poisonAvailable ? 'Ein lebendes Ziel wählen' : 'Bereits verbraucht'}</small></button>
            <button onClick={() => onAction((current) => submitWitchAction(current, {}))} type="button"><span>○</span><strong>Kein Trank</strong><small>Diese Nacht nichts tun</small></button>
          </div>
          {witchPoisonOpen ? <><h2>Giftziel bestätigen</h2><TargetGrid candidates={poisonCandidates} onSelect={setSelected} selectedId={selected} /><Button disabled={!selected} onClick={() => onAction((current) => submitWitchAction(current, { poisonTargetId: selected }))} type="button">{selected ? `${player(game, selected)?.name} vergiften` : 'Giftziel wählen'}</Button></> : null}
        </section>
      </GameChrome>
    )
  }

  return (
    <GameChrome game={game} secret>
      <section className="ww-action-card"><span className="ww-action-mark" aria-hidden="true">{phase === WEREWOLF_PHASES.NIGHT_WOLVES ? '☾' : '◉'}</span><span className="ww-kicker">{phase === WEREWOLF_PHASES.NIGHT_WOLVES ? 'Schritt 1' : 'Schritt 2'} · Nacht</span><h1>{title}</h1><p>{instruction}</p><TargetGrid candidates={candidates} onSelect={setSelected} selectedId={selected} /><Button disabled={!selected} onClick={confirmTarget} type="button">{selected ? `${player(game, selected)?.name} bestätigen` : 'Ziel wählen'}</Button></section>
    </GameChrome>
  )
}

function PrivateResult({ result, onClose }) {
  return <div className="ww-private-result" role="dialog" aria-labelledby="ww-private-title" aria-modal="true"><span aria-hidden="true">◉</span><small>Nur für die Spielleitung</small><h2 id="ww-private-title">{result.target.name} ist {result.isWolf ? 'ein Werwolf.' : 'kein Werwolf.'}</h2><p>Zeige oder signalisiere dieses Ergebnis ausschließlich der Seherin.</p><Button autoFocus onClick={onClose} type="button">Ergebnis wieder verdecken</Button></div>
}

function ModeratorHandoff({ onUnlock, reviewSeerResult = false }) {
  return <div className="ww-handoff" role="dialog" aria-labelledby="ww-host-handoff" aria-modal="true"><span className="ww-handoff__mark" aria-hidden="true">☾</span><span className="ww-kicker">Privater Spielleitungsbereich</span><h1 id="ww-host-handoff">Gerät zurück an die Spielleitung geben.</h1><p>{reviewSeerResult ? 'Ein privates Seherinnen-Ergebnis wartet. Erst die nicht mitspielende Spielleitung darf fortfahren.' : 'Alle anderen legen das Gerät weg. Die nächste Nachtaufgabe enthält geheime Rolleninformationen.'}</p><Button autoFocus onClick={onUnlock} type="button">Ich bin die Spielleitung</Button></div>
}

function Dawn({ game, onContinue }) {
  const deaths = game.lastDeaths
  return <GameChrome game={game}><section className="ww-public-card"><span className="ww-sun" aria-hidden="true">☀</span><span className="ww-kicker">Alle öffnen die Augen</span><h1>Das Dorf erwacht.</h1>{deaths.length ? <><p>In der Nacht sind ausgeschieden:</p><div className="ww-deaths">{deaths.map((death) => { const dead = player(game, death.playerId); return <div key={death.playerId}><strong>{dead.name}</strong><span>{ROLES[death.role].name}</span></div> })}</div></> : <p className="ww-no-death">Diese Nacht ist niemand gestorben.</p>}<Button onClick={onContinue} type="button">Dorfversammlung beginnen</Button></section></GameChrome>
}

function Day({ game, onVote }) {
  return <GameChrome game={game}><section className="ww-public-card"><span className="ww-kicker">Diskussion · ohne Zeitlimit</span><h1>Wem vertraut das Dorf?</h1><p>Besprecht Verdachtsmomente. Die Spielleitung kann die Abstimmung starten, sobald alle bereit sind.</p><div className="ww-roster">{game.players.map((entry) => <div className={entry.alive ? '' : 'is-dead'} key={entry.id}><span>{entry.alive ? 'Lebt' : 'Ausgeschieden'}</span><strong>{entry.name}</strong><small>{entry.alive ? 'Rolle geheim' : ROLES[entry.revealedRole].name}</small></div>)}</div><Button onClick={onVote} type="button">Verdeckte Abstimmung starten</Button></section></GameChrome>
}

function Vote({ game, onAction, onLock, unlocked }) {
  const voter = player(game, getCurrentVoterId(game))
  const [selected, setSelected] = useState(null)
  const candidates = game.vote.candidateIds.map((id) => player(game, id)).filter((entry) => entry.alive && entry.id !== voter.id)
  if (!unlocked) return <div className="ww-handoff" role="dialog" aria-labelledby="ww-vote-handoff" aria-modal="true"><span className="ww-handoff__mark" aria-hidden="true">✓</span><span className="ww-kicker">Geheime {game.phase === WEREWOLF_PHASES.RUNOFF_VOTE ? 'Stichwahl' : 'Abstimmung'} · {game.vote.currentVoterIndex + 1} von {game.vote.voterOrder.length}</span><h1 id="ww-vote-handoff">Gerät an {voter.name} geben.</h1><p>Bisherige Stimmen bleiben geheim und sind nicht auf dem Bildschirm.</p><Button autoFocus onClick={onLock} type="button">Ich bin {voter.name} · Wahl öffnen</Button></div>
  return <GameChrome game={game} secret visibilityLabel={`Nur ${voter.name}`}><section className="ww-action-card"><span className="ww-kicker">Nur {voter.name}</span><h1>{game.phase === WEREWOLF_PHASES.RUNOFF_VOTE ? 'Deine Stichwahl' : 'Wen verdächtigst du?'}</h1><p>Wähle genau eine andere lebende Person. Deine Stimme wird danach sofort verdeckt.</p><TargetGrid candidates={candidates} onSelect={setSelected} selectedId={selected} /><Button disabled={!selected} onClick={() => { const next = onAction((current) => submitDayVote(current, voter.id, selected)); if (next) onLock() }} type="button">Stimme für {selected ? player(game, selected)?.name : '…'} abgeben</Button></section></GameChrome>
}

function Execution({ game, onContinue }) {
  const executed = player(game, game.day?.executedId)
  const additionalDeaths = game.lastDeaths.filter((death) => death.playerId !== executed?.id)
  return <GameChrome game={game}><section className="ww-public-card"><span className="ww-kicker">Das Dorf hat entschieden</span><h1>{executed ? `${executed.name} scheidet aus.` : 'Die Stichwahl endet unentschieden.'}</h1>{executed ? <p>Die Rolle wird aufgedeckt: <strong>{ROLES[executed.role].name}</strong>.</p> : <p>Heute wird niemand verbannt.</p>}{additionalDeaths.length ? <div className="ww-deaths" aria-label="Weitere Todesreaktionen">{additionalDeaths.map((death) => { const dead = player(game, death.playerId); return <div key={death.playerId}><strong>{dead.name} wurde mitgerissen</strong><span>{ROLES[dead.role].name}</span></div> })}</div> : null}<Button onClick={onContinue} type="button">Nächste Nacht beginnen</Button></section></GameChrome>
}

function Hunter({ game, onAction }) {
  const hunter = player(game, getCurrentHunterId(game))
  const [selected, setSelected] = useState(null)
  const candidates = getAlivePlayers(game).filter((entry) => entry.id !== hunter.id)
  return <GameChrome game={game} secret><section className="ww-action-card"><span className="ww-action-mark" aria-hidden="true">⌖</span><span className="ww-kicker">Todesreaktion zuerst auflösen</span><h1>{hunter.name} war der Jäger.</h1><p>Der Jäger zeigt auf eine lebende Person, die sofort mit ausscheidet. Erst danach wird geprüft, wer gewonnen hat.</p><TargetGrid candidates={candidates} onSelect={setSelected} selectedId={selected} /><Button disabled={!selected} onClick={() => onAction((current) => submitHunterShot(current, hunter.id, selected))} type="button">Schuss auf {selected ? player(game, selected)?.name : '…'} bestätigen</Button></section></GameChrome>
}

function Complete({ game, onNew }) {
  return <GameChrome game={game}><section className="ww-public-card ww-final"><span className="ww-final-mark" aria-hidden="true">{game.winner === 'village' ? '☀' : '☾'}</span><span className="ww-kicker">Partie beendet</span><h1>{game.winner === 'village' ? 'Das Dorf gewinnt.' : 'Die Werwölfe gewinnen.'}</h1><p>{game.winner === 'village' ? 'Alle Werwölfe wurden enttarnt.' : 'Die Werwölfe sind nun mindestens so zahlreich wie der Rest des Dorfes.'}</p>{game.lastDeaths.length ? <div className="ww-deaths" aria-label="Zuletzt ausgeschieden">{game.lastDeaths.map((death) => { const dead = player(game, death.playerId); return <div key={death.playerId}><strong>{dead.name}</strong><span>{ROLES[dead.role].name} · ausgeschieden</span></div> })}</div> : null}<div className="ww-final-roster">{game.players.map((entry) => <div key={entry.id}><strong>{entry.name}</strong><span>{ROLES[entry.role].name}</span></div>)}</div><div className="ww-final-actions"><Button onClick={onNew} type="button">Neue Partie</Button><a href={appPath('/')}>Zur Startseite</a></div></section></GameChrome>
}

export default function WerewolfGamePage() {
  const [game, setGame] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [roleOpen, setRoleOpen] = useState(false)
  const [voteOpen, setVoteOpen] = useState(false)
  const [moderatorOpen, setModeratorOpen] = useState(false)
  const [seenSeerNight, setSeenSeerNight] = useState(null)
  const [privateResult, setPrivateResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { setGame(werewolfRepository.load()); setLoaded(true) }, [])
  const relock = useCallback(() => { setRoleOpen(false); setVoteOpen(false); setModeratorOpen(false); setPrivateResult(null) }, [])
  useEffect(() => {
    const hide = () => { if (document.visibilityState !== 'visible') relock() }
    window.addEventListener('blur', relock); document.addEventListener('visibilitychange', hide)
    return () => { window.removeEventListener('blur', relock); document.removeEventListener('visibilitychange', hide) }
  }, [relock])
  useEffect(() => { setVoteOpen(false) }, [game?.phase, game?.vote?.currentVoterIndex])

  const phase = game?.phase
  const aliveCount = useMemo(() => game ? getAlivePlayers(game).length : 0, [game])
  const needsSeerReview = Boolean(game?.night?.seerInspection
    && seenSeerNight !== game.night.number
    && [WEREWOLF_PHASES.NIGHT_WITCH, WEREWOLF_PHASES.HUNTER_REACTION, WEREWOLF_PHASES.DAWN].includes(phase))
  const moderatorPhase = [WEREWOLF_PHASES.NIGHT_WOLVES, WEREWOLF_PHASES.NIGHT_SEER, WEREWOLF_PHASES.NIGHT_WITCH, WEREWOLF_PHASES.HUNTER_REACTION].includes(phase)
  const votePhase = [WEREWOLF_PHASES.DAY_VOTE, WEREWOLF_PHASES.RUNOFF_VOTE].includes(phase)
  const blockingOverlay = Boolean(privateResult
    || ((moderatorPhase || needsSeerReview) && !moderatorOpen)
    || (phase === WEREWOLF_PHASES.ROLE_REVEAL && !roleOpen)
    || (votePhase && !voteOpen))

  function action(mutation) {
    try {
      const next = mutation(game)
      if (!werewolfRepository.save(next)) throw new Error('Der neue Stand konnte nicht gespeichert werden.')
      setGame(next); setError(''); return next
    } catch (actionError) { setError(actionError.message || 'Diese Aktion konnte nicht ausgeführt werden.'); return null }
  }

  function newGame() { werewolfRepository.clear(); window.location.assign(appPath('/werwolf')) }
  function unlockModerator() {
    setModeratorOpen(true)
    if (needsSeerReview) {
      const inspection = game.night.seerInspection
      setPrivateResult({ target: player(game, inspection.targetId), isWolf: inspection.isWolf })
    }
  }
  if (!loaded) return <div className="ww-loading" role="status">Das Dorf wird geladen …</div>
  if (!game) return <div className="ww-page"><AppHeader backLabel="Zur Startseite" backTo="/" variant="dark" /><main className="ww-missing"><span aria-hidden="true">☾</span><h1>Keine Partie gefunden.</h1><p>Richte zuerst das Dorf und seine Rollen ein.</p><a href={appPath('/werwolf')}>Werwolf einrichten</a></main></div>

  return (
    <div className={`ww-page ww-page--game ${phase?.startsWith('night') ? 'is-night' : 'is-day'}`}>
      {!blockingOverlay ? <AppHeader backLabel="Spielübersicht" backTo="/werwolf" variant="dark" /> : null}
      {!blockingOverlay ? <div className="ww-game-status"><span><i /> Lokal gespeichert</span><span>{aliveCount} von {game.players.length} leben</span></div> : null}
      {error ? <div className="ww-game-error" role="alert"><span>{error}</span><button onClick={() => setError('')} type="button">Schließen</button></div> : null}
      {(moderatorPhase || needsSeerReview) && !moderatorOpen ? <ModeratorHandoff onUnlock={unlockModerator} reviewSeerResult={needsSeerReview} /> : null}
      {!privateResult && (!(moderatorPhase || needsSeerReview) || moderatorOpen) ? <>
        {phase === WEREWOLF_PHASES.ROLE_REVEAL ? <RoleReveal game={game} onConfirm={(id) => { if (action((current) => confirmWerewolfRole(current, id))) relock() }} onOpen={() => setRoleOpen(true)} open={roleOpen} /> : null}
        {[WEREWOLF_PHASES.NIGHT_WOLVES, WEREWOLF_PHASES.NIGHT_SEER, WEREWOLF_PHASES.NIGHT_WITCH].includes(phase) ? <ModeratorNight game={game} key={phase} onAction={action} onPrivateResult={setPrivateResult} /> : null}
        {phase === WEREWOLF_PHASES.HUNTER_REACTION ? <Hunter game={game} onAction={action} /> : null}
        {phase === WEREWOLF_PHASES.DAWN ? <Dawn game={game} onContinue={() => action(continueToDay)} /> : null}
        {phase === WEREWOLF_PHASES.DAY ? <Day game={game} onVote={() => action(beginDayVote)} /> : null}
        {[WEREWOLF_PHASES.DAY_VOTE, WEREWOLF_PHASES.RUNOFF_VOTE].includes(phase) ? <Vote game={game} onAction={action} onLock={() => { setVoteOpen((current) => !current); setModeratorOpen(false) }} unlocked={voteOpen} /> : null}
        {phase === WEREWOLF_PHASES.EXECUTION ? <Execution game={game} onContinue={() => { const next = action(continueAfterExecution); if (next) setModeratorOpen(false) }} /> : null}
        {phase === WEREWOLF_PHASES.COMPLETE ? <Complete game={game} onNew={newGame} /> : null}
      </> : null}
      {privateResult ? <PrivateResult onClose={() => { setPrivateResult(null); setSeenSeerNight(game.night?.number ?? null) }} result={privateResult} /> : null}
    </div>
  )
}
