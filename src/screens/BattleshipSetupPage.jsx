'use client'

import { useEffect, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import {
  createBattleshipGame,
  createBattleshipId,
  createBattleshipRoom,
} from '../games/battleship/gameEngine.js'
import { battleshipRepository } from '../games/battleship/gameRepository.js'
import { battleshipRoomRepository } from '../games/battleship/roomRepository.js'

function gameStatus(game) {
  if (game.phase === 'complete') return 'Das Ergebnis ist bereit.'
  if (game.phase === 'battle') {
    const player = game.players[game.turnIndex]
    return `${player.name} ist am Zug · ${game.history.length} Schüsse gespielt`
  }
  const player = game.players[game.placementIndex]
  return `${player.name} stellt gerade die Flotte auf.`
}

function OnlineRooms({ onSelect, rooms }) {
  return (
    <section className="bs-online-rooms" aria-labelledby="bs-online-rooms-title">
      <div><span className="bs-kicker">Öffentlich · Freunde-Beta</span><h2 id="bs-online-rooms-title">Offene Flottenräume</h2></div>
      {rooms.length ? <div className="bs-online-rooms__list">{rooms.map((room) => (
        <button key={room.code} onClick={() => onSelect(room.code)} type="button">
          <span><strong>{room.name}</strong><small>{room.playerCount} von 2 Personen{room.passwordProtected ? ' · Passwort' : ''}</small></span>
          <b>{room.code}</b>
        </button>
      ))}</div> : <p>Noch wartet kein öffentlicher Flottenraum auf eine zweite Person.</p>}
    </section>
  )
}

export default function BattleshipSetupPage() {
  const [mode, setMode] = useState('local')
  const [onlineTab, setOnlineTab] = useState('create')
  const [names, setNames] = useState(['', ''])
  const [createForm, setCreateForm] = useState({ name: '', roomName: '', visibility: 'private', passwordEnabled: false, password: '' })
  const [joinForm, setJoinForm] = useState({ name: '', code: '', password: '' })
  const [publicRooms, setPublicRooms] = useState([])
  const [savedGame, setSavedGame] = useState(null)
  const [savedRoom, setSavedRoom] = useState(null)
  const [corruptSave, setCorruptSave] = useState(false)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const online = battleshipRoomRepository.isOnline

  useEffect(() => {
    const inspection = battleshipRepository.inspect()
    setSavedGame(inspection.state)
    setCorruptSave(inspection.issue === 'corrupt')
    setReady(true)

    let active = true
    const refreshRooms = async () => {
      if (!online) return
      try {
        const rooms = await battleshipRoomRepository.listPublic()
        if (active) setPublicRooms(rooms.filter((room) => room.playerCount < 2))
      } catch { /* Ein privater Raum kann weiterhin über Code geöffnet werden. */ }
    }
    const loadSavedRoom = async () => {
      const session = battleshipRoomRepository.loadSession()
      if (!session) return
      try {
        const room = await battleshipRoomRepository.load(session.roomCode)
        if (active) setSavedRoom(room)
      } catch { /* Die Sitzung kann zu einem inzwischen geschlossenen Raum gehören. */ }
    }
    refreshRooms()
    loadSavedRoom()
    const unsubscribe = battleshipRoomRepository.subscribe(refreshRooms)
    const inviteCode = new URLSearchParams(window.location.search).get('code')
    if (inviteCode) {
      setMode('online')
      setOnlineTab('join')
      setJoinForm((current) => ({ ...current, code: inviteCode.replace(/\s/g, '').toUpperCase() }))
    }
    return () => { active = false; unsubscribe() }
  }, [online])

  function updateName(index, value) {
    setNames((current) => current.map((name, nameIndex) => (nameIndex === index ? value : name)))
    setConfirmOverwrite(false)
    setError('')
  }

  function startLocalGame(overwrite = false) {
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

  async function createOnlineRoom(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      if (!online) throw new Error('Der Online-Modus ist auf diesem Build nicht verbunden.')
      let room = null
      for (let attempt = 0; attempt < 5 && !room; attempt += 1) {
        const candidate = createBattleshipRoom({
          hostName: createForm.name,
          roomName: createForm.roomName,
          visibility: createForm.visibility,
          password: createForm.passwordEnabled ? createForm.password : '',
        })
        try { room = await battleshipRoomRepository.create(candidate) }
        catch (creationError) {
          if (attempt === 4 || !/code|taken|vergeben/i.test(creationError.message)) throw creationError
        }
      }
      if (!room || !battleshipRoomRepository.saveSession(room.code, room.hostId)) throw new Error('Die Raumsitzung konnte nicht gespeichert werden.')
      window.location.assign(appPath('/schiffe-versenken/spiel'))
    } catch (creationError) { setError(creationError.message); setBusy(false) }
  }

  async function joinOnlineRoom(event) {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      if (!online) throw new Error('Beitreten auf einem zweiten Gerät benötigt den Online-Modus.')
      const code = joinForm.code.replace(/\s/g, '').toUpperCase()
      const playerId = createBattleshipId('player')
      await battleshipRoomRepository.join(code, joinForm.name, { id: playerId, password: joinForm.password })
      if (!battleshipRoomRepository.saveSession(code, playerId)) throw new Error('Die Raumsitzung konnte nicht gespeichert werden.')
      window.location.assign(appPath('/schiffe-versenken/spiel'))
    } catch (joinError) { setError(joinError.message); setBusy(false) }
  }

  function openRoom(code) {
    setMode('online'); setOnlineTab('join'); setJoinForm((current) => ({ ...current, code })); setError('')
    window.requestAnimationFrame(() => document.querySelector('.bs-mode-panels')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  function resumeLocalGame() {
    if (!battleshipRepository.load()) setError('Der gespeicherte Spielstand konnte nicht geladen werden.')
    else window.location.assign(appPath('/schiffe-versenken/spiel'))
  }

  return (
    <div className="bs-page bs-page--setup">
      <AppHeader backLabel="Zurück" backTo="/" />
      <main className="bs-setup-shell">
        <section className="bs-setup-hero" aria-labelledby="bs-setup-title">
          <div className="bs-setup-hero__art" aria-hidden="true"><img alt="" src={appPath('/assets/battleship-table.svg')} /></div>
          <div className="bs-setup-hero__copy">
            <span className="bs-kicker">Lokal oder online</span>
            <h1 id="bs-setup-title">Schiffe versenken</h1>
            <p>Zwei geheime Flotten – auf einem gemeinsamen oder auf zwei getrennten Geräten.</p>
            <div className="bs-offline-note" role="note"><span aria-hidden="true">⌁</span><div><strong>{online ? 'Geräteübergreifende Räume aktiv' : 'Lokales Spielen aktiv'}</strong><small>{online ? 'Realtime-Synchronisierung mit öffentlichem oder privatem Raum.' : 'Online-Räume erscheinen nach verbundener Supabase-Konfiguration.'}</small></div></div>
          </div>
        </section>

        <div className="bs-mode-picker" aria-label="Gerätemodus">
          <button aria-pressed={mode === 'local'} className={mode === 'local' ? 'is-active' : ''} onClick={() => { setMode('local'); setError('') }} type="button"><strong>Ein gemeinsames Gerät</strong><span>Privat herumreichen und lokal speichern.</span></button>
          <button aria-pressed={mode === 'online'} className={mode === 'online' ? 'is-active' : ''} disabled={!online || !ready} onClick={() => { setMode('online'); setError('') }} type="button"><strong>Zwei eigene Geräte</strong><span>{online ? 'Per Raumcode in Echtzeit spielen.' : 'Online-Verbindung noch nicht aktiv.'}</span></button>
        </div>

        {mode === 'local' ? <div className="bs-mode-panels">
          {corruptSave ? <section className="bs-alert bs-alert--danger" role="alert"><div><strong>Der gespeicherte Spielstand ist beschädigt.</strong><p>Entferne ihn, bevor du eine neue Partie beginnst.</p></div><button onClick={() => { battleshipRepository.clear(); setCorruptSave(false); setError('Der beschädigte Spielstand wurde entfernt.') }} type="button">Defekten Stand entfernen</button></section> : null}
          {savedGame ? <section className="bs-save-card" aria-labelledby="bs-save-title"><div><span>Aktive lokale Partie</span><h2 id="bs-save-title">{savedGame.players.map((player) => player.name).join(' gegen ')}</h2><p>{gameStatus(savedGame)}</p></div><Button disabled={!ready} onClick={resumeLocalGame} type="button">Spiel fortsetzen <span aria-hidden="true">→</span></Button></section> : null}

          <section className="bs-setup-card" aria-labelledby="bs-names-title">
            <div className="bs-setup-card__intro"><span className="bs-step">01</span><div><h2 id="bs-names-title">Wer führt die Flotten?</h2><p>Die erste Person stellt zuerst auf. Nach jedem Zug wird das Spielfeld wieder gesperrt.</p></div></div>
            <div className="bs-name-grid">{names.map((name, index) => <label className="bs-name-field" key={index}><span>{index === 0 ? 'Erste Person' : 'Zweite Person'}</span><input autoComplete="off" disabled={!ready} maxLength={24} onChange={(event) => updateName(index, event.target.value)} placeholder={index === 0 ? 'Zum Beispiel Ada' : 'Zum Beispiel Ben'} value={name} /></label>)}</div>
            <div className="bs-rules-strip" aria-label="Spielregeln"><div><strong>10 × 10</strong><span>Spielfeld</span></div><div><strong>5 Schiffe</strong><span>Längen 5 · 4 · 3 · 3 · 2</span></div><div><strong>Berühren erlaubt</strong><span>Überlappen verboten</span></div><div><strong>1 Schuss</strong><span>Dann wechselt der Zug</span></div></div>
            {error ? <p className="bs-form-error" role="alert">{error}</p> : null}
            {confirmOverwrite ? <div className="bs-overwrite" role="alert"><div><strong>Aktive Partie überschreiben?</strong><span>Der bisherige lokale Spielstand geht verloren.</span></div><div><button onClick={() => setConfirmOverwrite(false)} type="button">Abbrechen</button><button className="is-danger" onClick={() => startLocalGame(true)} type="button">Trotzdem neu beginnen</button></div></div> : <Button className="bs-start-button" disabled={!ready || corruptSave} onClick={() => startLocalGame(false)} type="button">Neue Partie starten <span aria-hidden="true">→</span></Button>}
          </section>
        </div> : <div className="bs-mode-panels">
          {savedRoom ? <section className="bs-save-card"><div><span>Aktiver Onlineraum</span><h2>{savedRoom.name}</h2><p>{savedRoom.players.length} von 2 Personen · Code {savedRoom.code}</p></div><Button onClick={() => window.location.assign(appPath('/schiffe-versenken/spiel'))} type="button">Raum fortsetzen</Button></section> : null}
          <section className="bs-setup-card bs-online-card">
            <div className="bs-online-tabs" role="tablist" aria-label="Online-Raum öffnen">
              <button aria-selected={onlineTab === 'create'} className={onlineTab === 'create' ? 'is-active' : ''} onClick={() => { setOnlineTab('create'); setError('') }} role="tab" type="button">Raum erstellen</button>
              <button aria-selected={onlineTab === 'join'} className={onlineTab === 'join' ? 'is-active' : ''} onClick={() => { setOnlineTab('join'); setError('') }} role="tab" type="button">Mit Code beitreten</button>
            </div>
            {onlineTab === 'create' ? <form className="bs-online-form" onSubmit={createOnlineRoom} role="tabpanel">
              <div className="bs-setup-card__intro"><span className="bs-step">01</span><div><h2>Flottenraum eröffnen</h2><p>Du erhältst einen Code, den die zweite Person auf ihrem Gerät eingibt.</p></div></div>
              <div className="bs-online-grid"><label><span>Dein Name</span><input maxLength={24} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} required value={createForm.name} /></label><label><span>Raumname <small>optional</small></span><input maxLength={48} onChange={(event) => setCreateForm({ ...createForm, roomName: event.target.value })} value={createForm.roomName} /></label><label><span>Sichtbarkeit</span><select onChange={(event) => setCreateForm({ ...createForm, visibility: event.target.value })} value={createForm.visibility}><option value="private">Privat · nur per Code</option><option value="public">Öffentlich sichtbar</option></select></label><label className="bs-online-check"><input checked={createForm.passwordEnabled} onChange={(event) => setCreateForm({ ...createForm, passwordEnabled: event.target.checked })} type="checkbox" /><span>Zusätzlich mit Passwort schützen</span></label>{createForm.passwordEnabled ? <label><span>Raumpasswort</span><input minLength={4} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} required type="password" value={createForm.password} /></label> : null}</div>
              {error ? <p className="bs-form-error" role="alert">{error}</p> : null}<Button className="bs-start-button" disabled={busy} type="submit">{busy ? 'Raum wird eröffnet …' : 'Onlineraum erstellen'}</Button>
            </form> : <form className="bs-online-form" onSubmit={joinOnlineRoom} role="tabpanel">
              <div className="bs-setup-card__intro"><span className="bs-step">02</span><div><h2>Zur Flotte stoßen</h2><p>Öffne den Einladungslink oder trage den fünfstelligen Raumcode ein.</p></div></div>
              <div className="bs-online-grid"><label><span>Dein Name</span><input maxLength={24} onChange={(event) => setJoinForm({ ...joinForm, name: event.target.value })} required value={joinForm.name} /></label><label><span>Raumcode</span><input className="bs-code-input" maxLength={6} onChange={(event) => setJoinForm({ ...joinForm, code: event.target.value.toUpperCase() })} required value={joinForm.code} /></label><label><span>Passwort <small>falls vergeben</small></span><input onChange={(event) => setJoinForm({ ...joinForm, password: event.target.value })} type="password" value={joinForm.password} /></label></div>
              {error ? <p className="bs-form-error" role="alert">{error}</p> : null}<Button className="bs-start-button" disabled={busy} type="submit">{busy ? 'Verbindung wird aufgebaut …' : 'Raum betreten'}</Button>
            </form>}
          </section>
          <OnlineRooms onSelect={openRoom} rooms={publicRooms} />
        </div>}
      </main>
    </div>
  )
}
