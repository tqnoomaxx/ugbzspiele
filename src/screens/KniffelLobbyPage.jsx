'use client'

import { useEffect, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import { ArrowRightIcon, DoorIcon, PlusIcon, UserIcon } from '../components/Icons.jsx'
import { createKniffelId, createKniffelRoom } from '../games/kniffel/gameEngine.js'
import { kniffelRoomRepository } from '../games/kniffel/roomRepository.js'

const DEFAULT_FORM = {
  name: '',
  roomName: '',
  password: '',
  playMode: 'digital',
  deviceMode: 'shared',
  visibility: 'private',
  passwordEnabled: false,
}

function ModeCard({ active, children, description, disabled, onClick, title }) {
  return (
    <button aria-pressed={active} className={`kf-mode-card ${active ? 'is-active' : ''}`} disabled={disabled} onClick={onClick} type="button">
      <span className="kf-mode-card__check">{active ? '✓' : ''}</span>
      <strong>{title}</strong>
      <small>{description}</small>
      {children}
    </button>
  )
}

function OpenRooms({ rooms, onSelect }) {
  return (
    <section className="kf-public-rooms">
      <div className="kf-section-title"><span>Online</span><h2>Öffentliche Tische</h2></div>
      {rooms.length ? rooms.map((room) => (
        <button className="kf-public-room" key={room.code} onClick={() => onSelect(room.code)} type="button">
          <i><DoorIcon size={22} /></i>
          <span><strong>{room.name}</strong><small>{room.playerCount} Personen · {room.playMode === 'scorepad' ? 'Echte Würfel' : 'Digital'}</small></span>
          <b>{room.code}</b><ArrowRightIcon size={20} />
        </button>
      )) : <p className="kf-empty">Noch ist kein öffentlicher Kniffeltisch offen.</p>}
    </section>
  )
}

export default function KniffelLobbyPage() {
  const [tab, setTab] = useState('create')
  const [form, setForm] = useState(DEFAULT_FORM)
  const [join, setJoin] = useState({ name: '', code: '', password: '' })
  const [rooms, setRooms] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const online = kniffelRoomRepository.isOnline

  useEffect(() => {
    let active = true
    const refresh = async () => {
      if (!online) return
      try { const result = await kniffelRoomRepository.listPublic(); if (active) setRooms(result) }
      catch { /* Creating a local table still works. */ }
    }
    refresh()
    const stop = kniffelRoomRepository.subscribe(refresh)
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) { setJoin((current) => ({ ...current, code: code.toUpperCase() })); setTab('join') }
    return () => { active = false; stop() }
  }, [online])

  const patchForm = (values) => setForm((current) => ({ ...current, ...values }))
  const selectPlayMode = (playMode) => patchForm(playMode === 'scorepad' ? { playMode, deviceMode: 'shared', visibility: 'private', passwordEnabled: false } : { playMode })
  const selectDeviceMode = (deviceMode) => patchForm(deviceMode === 'shared' ? { deviceMode, visibility: 'private', passwordEnabled: false } : { deviceMode })

  const createRoom = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      let room
      for (let attempt = 0; attempt < 5 && !room; attempt += 1) {
        const candidate = createKniffelRoom({
          hostName: form.name,
          roomName: form.roomName,
          password: form.password,
          options: form,
        })
        try { room = await kniffelRoomRepository.create(candidate) }
        catch (creationError) { if (attempt === 4 || !/code|vergeben|taken/i.test(creationError.message)) throw creationError }
      }
      if (!kniffelRoomRepository.saveSession(room.code, room.hostId)) throw new Error('Die Sitzung konnte nicht im Browser gespeichert werden.')
      window.location.assign(appPath('/kniffel/spiel'))
    } catch (creationError) { setError(creationError.message); setBusy(false) }
  }

  const joinRoom = async (event) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      if (!online) throw new Error('Beitreten über mehrere Geräte benötigt den Online-Modus.')
      const code = join.code.replace(/\s/g, '').toUpperCase()
      const playerId = createKniffelId('player')
      await kniffelRoomRepository.join(code, join.name, { id: playerId, password: join.password })
      if (!kniffelRoomRepository.saveSession(code, playerId)) throw new Error('Die Sitzung konnte nicht gespeichert werden.')
      window.location.assign(appPath('/kniffel/spiel'))
    } catch (joinError) { setError(joinError.message); setBusy(false) }
  }

  const openRoom = (code) => { setJoin((current) => ({ ...current, code })); setTab('join'); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  return (
    <div className="kf-page kf-page--setup">
      <AppHeader variant="dark" backTo="/" backLabel="Alle Spiele" />
      <main className="kf-setup-shell">
        <section className="kf-hero">
          <div><span className="kf-kicker">Der Würfelklassiker</span><h1>Kniffel</h1><p>Komplett digital spielen – oder nur den Punkteblock aufs Handy holen.</p></div>
          <div className="kf-cloud-note"><i /><span><strong>{online ? 'Cloud-Speicherung aktiv' : 'Lokale Speicherung aktiv'}</strong><small>Der Spielstand wird laufend gesichert und kann nicht durch einen falschen Tipp verloren gehen.</small></span></div>
        </section>

        <section className="kf-setup-card">
          <div className="kf-tabs" role="tablist">
            <button className={tab === 'create' ? 'is-active' : ''} onClick={() => { setTab('create'); setError('') }} type="button">Neuen Tisch einrichten</button>
            <button className={tab === 'join' ? 'is-active' : ''} onClick={() => { setTab('join'); setError('') }} type="button">Mit Code beitreten</button>
          </div>

          {tab === 'create' ? (
            <form className="kf-setup-form" onSubmit={createRoom}>
              <div className="kf-form-head"><span>01</span><div><h2>Wie möchtet ihr spielen?</h2><p>Beide Varianten nutzen die klassischen 13 Kniffel-Felder.</p></div></div>
              <div className="kf-mode-grid">
                <ModeCard active={form.playMode === 'digital'} description="Würfeln, Halten und Werten direkt in UGBZ." onClick={() => selectPlayMode('digital')} title="Komplett digital" />
                <ModeCard active={form.playMode === 'scorepad'} description="Ihr würfelt am Tisch; das Handy ersetzt nur den Block." onClick={() => selectPlayMode('scorepad')} title="Echte Würfel + Punkteblock" />
              </div>

              <div className="kf-form-head"><span>02</span><div><h2>Auf welchen Geräten?</h2></div></div>
              <div className="kf-mode-grid">
                <ModeCard active={form.deviceMode === 'shared'} description={form.playMode === 'scorepad' ? 'Ein gemeinsamer, automatisch gesicherter Punkteblock.' : 'Herumreichen und gemeinsam auf einem Bildschirm spielen.'} onClick={() => selectDeviceMode('shared')} title="Ein gemeinsames Gerät" />
                <ModeCard active={form.deviceMode === 'separate'} description={online ? 'Alle würfeln am eigenen Smartphone im synchronen Raum.' : 'Wird verfügbar, sobald der Online-Modus verbunden ist.'} disabled={form.playMode === 'scorepad' || !online} onClick={() => selectDeviceMode('separate')} title="Eigene Geräte" />
              </div>

              <div className="kf-form-head"><span>03</span><div><h2>Wer eröffnet den Tisch?</h2></div></div>
              <div className="kf-fields-row">
                <label><span>Dein Name</span><div className="kf-input-icon"><UserIcon size={20} /><input maxLength={28} onChange={(event) => patchForm({ name: event.target.value })} placeholder="z. B. Max" required value={form.name} /></div></label>
                <label><span>Raumname <small>optional</small></span><input maxLength={48} onChange={(event) => patchForm({ roomName: event.target.value })} placeholder="Samstagsrunde" value={form.roomName} /></label>
              </div>

              {form.deviceMode === 'separate' ? <div className="kf-online-options">
                <label><span>Sichtbarkeit</span><select onChange={(event) => patchForm({ visibility: event.target.value })} value={form.visibility}><option value="private">Privat · nur mit Code</option><option value="public">Öffentlich gelistet</option></select></label>
                <label className="kf-check"><input checked={form.passwordEnabled} onChange={(event) => patchForm({ passwordEnabled: event.target.checked })} type="checkbox" /><span>Zusätzlich mit Passwort schützen</span></label>
                {form.passwordEnabled ? <label><span>Raumpasswort</span><input minLength={4} onChange={(event) => patchForm({ password: event.target.value })} required type="password" value={form.password} /></label> : null}
              </div> : null}

              <p aria-live="polite" className="kf-error">{error}</p>
              <Button className="kf-main-action" disabled={busy} type="submit"><PlusIcon size={21} /> {busy ? 'Tisch wird vorbereitet …' : 'Kniffeltisch eröffnen'}</Button>
              <p className="kf-no-limit">Ohne festes Spielerlimit · klassisches Regelwerk · automatisches Speichern</p>
            </form>
          ) : (
            <form className="kf-join-form" onSubmit={joinRoom}>
              <div className="kf-section-title"><span>Einladung</span><h2>An einem Onlinetisch Platz nehmen</h2></div>
              <label><span>Dein Name</span><input maxLength={28} onChange={(event) => setJoin({ ...join, name: event.target.value })} required value={join.name} /></label>
              <label><span>Raumcode</span><input className="kf-code-input" maxLength={6} onChange={(event) => setJoin({ ...join, code: event.target.value.toUpperCase() })} placeholder="ABCDE" required value={join.code} /></label>
              <label><span>Passwort <small>falls vergeben</small></span><input onChange={(event) => setJoin({ ...join, password: event.target.value })} type="password" value={join.password} /></label>
              <p aria-live="polite" className="kf-error">{error}</p>
              <Button className="kf-main-action" disabled={busy || !online} type="submit">{busy ? 'Verbindung läuft …' : 'Raum betreten'} <ArrowRightIcon size={20} /></Button>
              {!online ? <p className="kf-offline-hint">Auf diesem Build ist Online-Beitreten nicht konfiguriert. Gemeinsames Spielen auf einem Gerät funktioniert trotzdem.</p> : null}
            </form>
          )}
        </section>

        {online ? <OpenRooms onSelect={openRoom} rooms={rooms} /> : null}
      </main>
    </div>
  )
}
