'use client'

import { useEffect, useMemo, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import { ArrowRightIcon, DoorIcon, PlusIcon, UserIcon } from '../components/Icons.jsx'
import { DEFAULT_DOPPELWORT_OPTIONS, DOPPELWORT_CATEGORIES } from '../games/doppelwort/defaults.js'
import { createDoppelwortId, createRoom, sanitizePlayerName } from '../games/doppelwort/gameEngine.js'
import { doppelwortRoomRepository } from '../games/doppelwort/roomRepository.js'

const timerOptions = {
  speakingSeconds: [15, 30, 45, 60, 90],
  meetingSeconds: [0, 30, 45, 60, 90, 120],
  votingSeconds: [30, 45, 60, 90, 120],
}

function Toggle({ checked, label, description, onChange }) {
  return (
    <label className="dw-toggle">
      <span>
        <strong>{label}</strong>
        {description ? <small>{description}</small> : null}
      </span>
      <input checked={checked} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
      <i aria-hidden="true" />
    </label>
  )
}

function PublicRooms({ online, rooms, onSelect }) {
  return (
    <section className="dw-room-list" aria-labelledby="open-rooms-title">
      <div className="dw-section-heading">
        <div>
          <span className="dw-kicker">{online ? 'Online verfügbar' : 'In diesem Browser'}</span>
          <h2 id="open-rooms-title">Offene Spielräume</h2>
        </div>
        <span className="dw-live-mark"><i /> {online ? 'geräteübergreifend' : 'lokal synchron'}</span>
      </div>

      {rooms.length ? (
        <div className="dw-room-list__items">
          {rooms.map((room) => (
            <button className="dw-room-row" key={room.code} onClick={() => onSelect(room.code)} type="button">
              <span className="dw-room-row__seal"><DoorIcon size={25} /></span>
              <span>
                <strong>{room.name}</strong>
                <small>{room.language === 'en' ? 'English' : 'Deutsch'} · {room.status === 'lobby' ? 'Lobby' : 'Läuft'}</small>
              </span>
              <span className="dw-room-row__players">{room.playerCount}/{room.maxPlayers}</span>
              <ArrowRightIcon size={21} />
            </button>
          ))}
        </div>
      ) : (
        <div className="dw-empty-room-list">
          <span><DoorIcon size={30} /></span>
          <div>
            <strong>Noch kein öffentlicher Raum</strong>
            <p>Erstelle einen Raum oder tritt mit einem Einladungscode bei.</p>
          </div>
        </div>
      )}
    </section>
  )
}

export default function DoppelwortLobbyPage() {
  const [mode, setMode] = useState('join')
  const [publicRooms, setPublicRooms] = useState([])
  const [joinForm, setJoinForm] = useState({ name: '', code: '', password: '' })
  const [createForm, setCreateForm] = useState({
    name: '',
    roomName: '',
    password: '',
    options: { ...DEFAULT_DOPPELWORT_OPTIONS },
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const online = doppelwortRoomRepository.isOnline

  const selectMode = (nextMode, { focus = false } = {}) => {
    setMode(nextMode)
    setError('')
    if (focus) window.requestAnimationFrame(() => document.querySelector(`#dw-tab-${nextMode}`)?.focus())
  }

  const handleTabKeyDown = (event) => {
    const nextMode = ['ArrowLeft', 'ArrowRight'].includes(event.key)
      ? (mode === 'join' ? 'create' : 'join')
      : event.key === 'Home'
        ? 'join'
        : event.key === 'End'
          ? 'create'
          : null
    if (!nextMode) return
    event.preventDefault()
    selectMode(nextMode, { focus: true })
  }

  const categories = useMemo(
    () => DOPPELWORT_CATEGORIES[createForm.options.language],
    [createForm.options.language],
  )

  useEffect(() => {
    let active = true
    const refreshRooms = async () => {
      try {
        const rooms = await doppelwortRoomRepository.listPublic()
        if (active) setPublicRooms(rooms)
      } catch (loadError) {
        if (active) setError(loadError.message)
      }
    }
    refreshRooms()
    const unsubscribe = doppelwortRoomRepository.subscribe(refreshRooms)

    const inviteCode = new URLSearchParams(window.location.search).get('code')
    if (inviteCode) {
      setJoinForm((current) => ({ ...current, code: inviteCode.toUpperCase() }))
      selectMode('join')
    }
    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const updateOption = (key, value) => {
    setCreateForm((current) => ({
      ...current,
      options: {
        ...current.options,
        [key]: value,
        ...(key === 'language' ? { category: 'all' } : {}),
      },
    }))
  }

  const openRoom = (code) => {
    setJoinForm((current) => ({ ...current, code }))
    selectMode('join')
    document.querySelector('#dw-access-panel')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handleJoin = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const code = joinForm.code.replace(/\s/g, '').toUpperCase()
      const playerId = createDoppelwortId('player')
      await doppelwortRoomRepository.join(code, sanitizePlayerName(joinForm.name), {
        id: playerId,
        password: joinForm.password,
      })
      if (!doppelwortRoomRepository.saveSession(code, playerId)) throw new Error('Die lokale Sitzung konnte nicht gespeichert werden.')
      window.location.assign(appPath('/imposter/raum'))
    } catch (joinError) {
      setError(joinError.message)
      setSubmitting(false)
    }
  }

  const handleCreate = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      let room = null
      for (let attempt = 0; attempt < 5 && !room; attempt += 1) {
        const candidate = createRoom({
          roomName: createForm.roomName,
          hostName: createForm.name,
          options: createForm.options,
          password: createForm.password,
        })
        try {
          room = await doppelwortRoomRepository.create(candidate)
        } catch (createError) {
          if (attempt === 4) throw createError
        }
      }
      if (!room) throw new Error('Der Raum konnte nicht gespeichert werden. Bitte versuche es erneut.')
      if (!doppelwortRoomRepository.saveSession(room.code, room.hostId)) {
        await doppelwortRoomRepository.remove(room.code)
        throw new Error('Die lokale Sitzung konnte nicht gespeichert werden.')
      }
      window.location.assign(appPath('/imposter/raum'))
    } catch (createError) {
      setError(createError.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="dw-page dw-page--lobby">
      <AppHeader variant="dark" backTo="/" backLabel="Alle Spiele" />
      <main className="dw-lobby-shell">
        <section className="dw-lobby-hero">
          <div>
            <span className="dw-kicker">Ein Begriff. Eine Person blufft.</span>
            <h1>Imposter</h1>
            <p>Gebt kluge Hinweise, hört genau hin und enttarnt den Imposter.</p>
          </div>
          <div className="dw-mode-note" role="note">
            <span className="dw-mode-note__dot" />
            <div>
              <strong>{online ? 'Online-Modus aktiv' : 'Lokaler Spielmodus'}</strong>
              <p>{online ? 'Räume werden in Echtzeit zwischen Smartphones, Tablets und Computern synchronisiert.' : 'Pass-and-Play und mehrere Tabs funktionieren. Mit Supabase-Konfiguration wechselt UGBZ automatisch online.'}</p>
            </div>
          </div>
        </section>

        <div className="dw-lobby-grid">
          <PublicRooms online={online} rooms={publicRooms} onSelect={openRoom} />

          <section className="dw-access-panel" id="dw-access-panel" aria-labelledby="access-title">
            <div className="dw-tab-list" role="tablist" aria-label="Raumzugang">
              <button aria-controls="dw-panel-join" aria-selected={mode === 'join'} className={mode === 'join' ? 'is-active' : ''} id="dw-tab-join" onClick={() => selectMode('join')} onKeyDown={handleTabKeyDown} role="tab" tabIndex={mode === 'join' ? 0 : -1} type="button">Beitreten</button>
              <button aria-controls="dw-panel-create" aria-selected={mode === 'create'} className={mode === 'create' ? 'is-active' : ''} id="dw-tab-create" onClick={() => selectMode('create')} onKeyDown={handleTabKeyDown} role="tab" tabIndex={mode === 'create' ? 0 : -1} type="button">Raum erstellen</button>
            </div>

            {mode === 'join' ? (
              <form aria-labelledby="dw-tab-join" className="dw-form" id="dw-panel-join" onSubmit={handleJoin} role="tabpanel">
                <div className="dw-form__heading">
                  <span className="dw-kicker">Einladung</span>
                  <h2 id="access-title">Tritt einer Runde bei</h2>
                </div>
                <label className="dw-field">
                  <span>Dein Name</span>
                  <span className="dw-input-wrap"><UserIcon size={21} /><input autoComplete="nickname" maxLength={28} onChange={(event) => setJoinForm({ ...joinForm, name: event.target.value })} placeholder="z. B. Robin" required value={joinForm.name} /></span>
                </label>
                <label className="dw-field">
                  <span>Raumcode</span>
                  <input autoCapitalize="characters" className="dw-code-input" maxLength={6} onChange={(event) => setJoinForm({ ...joinForm, code: event.target.value.toUpperCase() })} placeholder="ABCDE" required value={joinForm.code} />
                </label>
                <label className="dw-field">
                  <span>Passwort <small>optional</small></span>
                  <input onChange={(event) => setJoinForm({ ...joinForm, password: event.target.value })} type="password" value={joinForm.password} />
                </label>
                <p aria-live="polite" className="dw-form-error">{error}</p>
                <Button className="dw-submit" disabled={submitting} type="submit">{submitting ? 'Verbindung wird aufgebaut …' : 'Raum betreten'} <ArrowRightIcon size={21} /></Button>
              </form>
            ) : (
              <form aria-labelledby="dw-tab-create" className="dw-form dw-form--create" id="dw-panel-create" onSubmit={handleCreate} role="tabpanel">
                <div className="dw-form__heading">
                  <span className="dw-kicker">Spielleitung</span>
                  <h2 id="access-title">Richte den Salon ein</h2>
                </div>

                <div className="dw-form-grid">
                  <label className="dw-field"><span>Dein Name</span><input maxLength={28} onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })} placeholder="Spielleitung" required value={createForm.name} /></label>
                  <label className="dw-field"><span>Raumname</span><input maxLength={48} onChange={(event) => setCreateForm({ ...createForm, roomName: event.target.value })} placeholder="Freitagssalon" value={createForm.roomName} /></label>
                  <label className="dw-field"><span>Sichtbarkeit</span><select onChange={(event) => updateOption('visibility', event.target.value)} value={createForm.options.visibility}><option value="private">Privat · per Code</option><option value="public">Öffentlich gelistet</option></select></label>
                  <label className="dw-field"><span>Maximale Spieler</span><select onChange={(event) => updateOption('maxPlayers', Number(event.target.value))} value={createForm.options.maxPlayers}>{Array.from({ length: 10 }, (_, index) => index + 3).map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
                  <label className="dw-field"><span>Sprache</span><select onChange={(event) => updateOption('language', event.target.value)} value={createForm.options.language}><option value="de">Deutsch</option><option value="en">English</option></select></label>
                  <label className="dw-field"><span>Kategorie</span><select onChange={(event) => updateOption('category', event.target.value)} value={createForm.options.category}>{categories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
                  <label className="dw-field"><span>Imposter</span><select onChange={(event) => updateOption('imposterCount', Number(event.target.value))} value={createForm.options.imposterCount}>{Array.from({ length: Math.min(3, createForm.options.maxPlayers - 1) }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
                  <label className="dw-field"><span>Runden</span><select onChange={(event) => updateOption('roundCount', Number(event.target.value))} value={createForm.options.roundCount}>{[1, 3, 5, 7, 10].map((count) => <option key={count} value={count}>{count}</option>)}</select></label>
                  {Object.entries(timerOptions).map(([key, values]) => (
                    <label className="dw-field" key={key}>
                      <span>{key === 'speakingSeconds' ? 'Redezeit' : key === 'meetingSeconds' ? 'Besprechung' : 'Abstimmung'}</span>
                      <select onChange={(event) => updateOption(key, Number(event.target.value))} value={createForm.options[key]}>{values.map((seconds) => <option key={seconds} value={seconds}>{seconds === 0 ? 'Ohne Timer' : `${seconds} Sek.`}</option>)}</select>
                    </label>
                  ))}
                </div>

                <div className="dw-toggle-list">
                  <Toggle checked={createForm.options.hintsEnabled} label="Groben Tipp anzeigen" description="Absichtlich allgemeiner als die Kategorie" onChange={(value) => updateOption('hintsEnabled', value)} />
                  <Toggle checked={createForm.options.skipAllowed} label="Überspringen erlauben" onChange={(value) => updateOption('skipAllowed', value)} />
                  <Toggle checked={createForm.options.pointsEnabled} label="Punkte über Runden" onChange={(value) => updateOption('pointsEnabled', value)} />
                  <Toggle checked={createForm.options.autoNextRound} label="Nächste Runde automatisch" description="Nach acht Sekunden" onChange={(value) => updateOption('autoNextRound', value)} />
                  <Toggle checked={createForm.options.autoWordRotation} label="Wörter nicht wiederholen" onChange={(value) => updateOption('autoWordRotation', value)} />
                  <Toggle checked={createForm.options.randomHostOnLeave} label="Spielleitung automatisch übertragen" onChange={(value) => updateOption('randomHostOnLeave', value)} />
                  <Toggle checked={createForm.options.spectatorsAllowed} label="Zuschauer vorbereiten" description="Wird mit dem Online-Adapter aktiv" onChange={(value) => updateOption('spectatorsAllowed', value)} />
                  <Toggle checked={createForm.options.passwordEnabled} label="Raum mit Passwort" onChange={(value) => updateOption('passwordEnabled', value)} />
                </div>

                {createForm.options.passwordEnabled ? <label className="dw-field"><span>Raumpasswort</span><input minLength={4} onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })} required type="password" value={createForm.password} /></label> : null}

                <p aria-live="polite" className="dw-form-error">{error}</p>
                <Button className="dw-submit" disabled={submitting} type="submit"><PlusIcon size={21} /> {submitting ? 'Raum wird erstellt …' : 'Raum eröffnen'}</Button>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}
