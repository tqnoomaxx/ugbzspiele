'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import { CloseIcon, PlusIcon } from '../components/Icons.jsx'
import { createWerewolfGame, getWerewolfPreset, WEREWOLF_VOTE_MODES } from '../games/werewolf/gameEngine.js'
import { werewolfRepository } from '../games/werewolf/gameRepository.js'

const ROLE_NAMES = { wolf: 'Werwolf', seer: 'Seherin', witch: 'Hexe', hunter: 'Jäger', villager: 'Dorfbewohner' }

function initialNames() {
  return Array.from({ length: 5 }, (_, index) => ({ id: `name-${index + 1}`, value: '' }))
}

function savedStatus(game) {
  if (game.phase === 'complete') return 'Endergebnis ansehen'
  if (game.phase === 'role-reveal') return `Rollenverteilung ${game.revealIndex + 1} von ${game.players.length}`
  if (['day', 'day-vote', 'runoff-vote', 'execution'].includes(game.phase)) return `Tag ${game.day?.number ?? game.night?.number ?? 1} · ${game.players.filter((player) => player.alive).length} leben noch`
  return `Nacht ${game.night?.number ?? 1} · ${game.players.filter((player) => player.alive).length} leben noch`
}

export default function WerewolfSetupPage() {
  const [names, setNames] = useState(initialNames)
  const nextId = useRef(6)
  const [saved, setSaved] = useState(null)
  const [corrupt, setCorrupt] = useState(false)
  const [overwrite, setOverwrite] = useState(false)
  const [error, setError] = useState('')
  const [voteMode, setVoteMode] = useState(WEREWOLF_VOTE_MODES.DEVICE)
  const [ready, setReady] = useState(false)
  const preset = useMemo(() => getWerewolfPreset(names.length), [names.length])

  useEffect(() => {
    const inspection = werewolfRepository.inspect()
    setSaved(inspection.state)
    setCorrupt(inspection.issue === 'corrupt')
    setReady(true)
  }, [])

  function updateName(id, value) {
    setNames((current) => current.map((entry) => entry.id === id ? { ...entry, value } : entry))
    setOverwrite(false)
    setError('')
  }

  function addName() {
    if (names.length >= 12) return
    setNames((current) => [...current, { id: `name-${nextId.current++}`, value: '' }])
    setOverwrite(false)
  }

  function removeName(id) {
    if (names.length <= 5) return
    setNames((current) => current.filter((entry) => entry.id !== id))
    setOverwrite(false)
  }

  function start(force = false) {
    if (saved && !force) { setOverwrite(true); return }
    try {
      const game = createWerewolfGame({ names: names.map((entry) => entry.value), voteMode })
      if (!werewolfRepository.save(game)) throw new Error('Die Partie konnte nicht im Browser gespeichert werden.')
      window.location.assign(appPath('/werwolf/spiel'))
    } catch (startError) {
      setError(startError.message || 'Die Partie konnte nicht gestartet werden.')
    }
  }

  return (
    <div className="ww-page ww-page--setup">
      <AppHeader backLabel="Zurück" backTo="/" variant="dark" />
      <main className="ww-setup-shell">
        <header className="ww-hero">
          <div>
            <span className="ww-kicker">Ein Gerät · mit Spielleitung</span>
            <h1>Werwolf</h1>
            <p>Die App verteilt geheime Rollen, führt durch jede Nacht und zählt die verdeckten Stimmen. Eine nicht mitspielende Person leitet die Partie.</p>
          </div>
          <div className="ww-moon" aria-hidden="true"><span>☾</span></div>
        </header>

        <section className="ww-boundary" role="note">
          <strong>Lokaler Spielleitungsmodus</strong>
          <span>Bewusst ohne Online-Raum: Rollen und Nachtaktionen bleiben auf diesem Gerät. Die Spielleitung spielt nicht mit.</span>
        </section>

        {corrupt ? (
          <section className="ww-alert" role="alert"><div><strong>Der gespeicherte Stand ist beschädigt.</strong><span>Entferne nur diesen Stand und beginne danach neu.</span></div><button onClick={() => { werewolfRepository.clear(); setCorrupt(false) }} type="button">Defekten Stand entfernen</button></section>
        ) : null}

        {saved ? (
          <section className="ww-resume">
            <div><span>Aktive Partie</span><h2>{saved.players.map((player) => player.name).join(' · ')}</h2><p>{savedStatus(saved)}</p></div>
            <Button onClick={() => window.location.assign(appPath('/werwolf/spiel'))} type="button">Partie fortsetzen</Button>
          </section>
        ) : null}

        <div className="ww-setup-grid">
          <section className="ww-setup-card" aria-labelledby="ww-players-title">
            <span className="ww-step">01 · Dorf</span>
            <h2 id="ww-players-title">Wer spielt mit?</h2>
            <p>Fünf bis zwölf Mitspielende, zusätzlich eine nicht mitspielende Spielleitung.</p>
            <div className="ww-name-list">
              {names.map((entry, index) => (
                <div className="ww-name" key={entry.id}>
                  <label htmlFor={entry.id}>{index + 1}</label>
                  <input aria-label={`Name von Person ${index + 1}`} autoComplete="off" disabled={!ready} id={entry.id} maxLength={28} onChange={(event) => updateName(entry.id, event.target.value)} placeholder={`Person ${index + 1}`} value={entry.value} />
                  <button aria-label={`Person ${index + 1} entfernen`} disabled={names.length <= 5} onClick={() => removeName(entry.id)} type="button"><CloseIcon size={18} /></button>
                </div>
              ))}
            </div>
            <button className="ww-add" disabled={names.length >= 12} onClick={addName} type="button"><PlusIcon size={20} /> Person hinzufügen</button>
          </section>

          <section className="ww-setup-card ww-setup-card--roles" aria-labelledby="ww-roles-title">
            <span className="ww-step">02 · Anfänger-Preset</span>
            <h2 id="ww-roles-title">Ausgewogene Rollen</h2>
            <p>Das passende klassische Set wird automatisch und zufällig verteilt.</p>
            <div className="ww-role-counts">
              {Object.entries(preset.counts).filter(([, count]) => count > 0).map(([role, count]) => (
                <div key={role}><span className={`ww-role-dot ww-role-dot--${role}`} aria-hidden="true" /><strong>{count}× {ROLE_NAMES[role]}</strong></div>
              ))}
            </div>
            <fieldset className="ww-vote-mode">
              <legend>Abstimmung am Tag</legend>
              <button aria-pressed={voteMode === WEREWOLF_VOTE_MODES.DEVICE} className={voteMode === WEREWOLF_VOTE_MODES.DEVICE ? 'is-active' : ''} disabled={!ready} onClick={() => setVoteMode(WEREWOLF_VOTE_MODES.DEVICE)} type="button"><strong>Geheim am Handy</strong><span>Alle geben ihre Stimme einzeln und verdeckt ein.</span></button>
              <button aria-pressed={voteMode === WEREWOLF_VOTE_MODES.IN_PERSON} className={voteMode === WEREWOLF_VOTE_MODES.IN_PERSON ? 'is-active' : ''} disabled={!ready} onClick={() => setVoteMode(WEREWOLF_VOTE_MODES.IN_PERSON)} type="button"><strong>Gemeinsam im Raum</strong><span>Ihr stimmt in echt ab; die Spielleitung trägt nur das Ergebnis ein.</span></button>
            </fieldset>
            <div className="ww-rules">
              <h3>So läuft es</h3>
              <ol><li>Gerät einzeln zur Rollenansicht weitergeben.</li><li>Die Spielleitung führt durch Nacht und Tag.</li><li>{voteMode === WEREWOLF_VOTE_MODES.IN_PERSON ? 'Ihr stimmt offen oder per Handzeichen ab; nur das Ergebnis kommt ins Handy.' : 'Abstimmungen werden einzeln und verdeckt eingegeben.'}</li></ol>
            </div>
            <p className="ww-a11y-note">Hinweis: Screenreader können geheime Rollen vorlesen. Nutzt dafür Kopfhörer oder lasst die Spielleitung vorlesen.</p>
            {error ? <p className="ww-error" role="alert">{error}</p> : null}
            {overwrite ? (
              <div className="ww-overwrite" role="alert"><strong>Aktive Partie wirklich ersetzen?</strong><div><button onClick={() => setOverwrite(false)} type="button">Abbrechen</button><button onClick={() => start(true)} type="button">Neu beginnen</button></div></div>
            ) : <Button className="ww-start" disabled={!ready || corrupt} onClick={() => start(false)} type="button">Rollen verteilen</Button>}
          </section>
        </div>
      </main>
    </div>
  )
}
