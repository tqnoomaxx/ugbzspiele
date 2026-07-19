'use client'

import { useEffect, useMemo, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import {
  createMemoryGame,
  createMemoryId,
  createMemoryRoom,
  validateMemoryPlayers,
} from '../games/memory/gameEngine.js'
import { memoryGameRepository } from '../games/memory/gameRepository.js'
import {
  getAvailableMemoryPairCounts,
  getDefaultMemoryPairCount,
  getDefaultMemorySetId,
  getMemoryAssets,
  getMemorySet,
  getMemorySets,
  memoryManifest,
} from '../games/memory/manifest.js'
import { preloadMemoryAssets } from '../games/memory/preload.js'
import { memoryRoomRepository } from '../games/memory/roomRepository.js'

function defaultNames() { return ['Spieler 1', 'Spieler 2'] }
function durationForPairs(pairCount) {
  if (pairCount <= 6) return '3–7'
  if (pairCount <= 9) return '5–10'
  if (pairCount <= 12) return '8–15'
  return '12–20'
}

function SetChooser({ onSelect, selectedSetId, sets, step = '02' }) {
  return (
    <section aria-labelledby={`memory-set-title-${step}`}>
      <div className="memory-section-heading"><span>{step}</span><div><h2 id={`memory-set-title-${step}`}>Welches Bilder-Set?</h2><p>Jeder Ordner wird automatisch zu einem eigenen Set.</p></div></div>
      <div className="memory-set-options">
        {sets.map((set) => (
          <button
            aria-label={`${set.label}, ${set.cards.length} Motive${set.ready ? '' : ', noch nicht spielbar'}`}
            aria-pressed={selectedSetId === set.id}
            className={selectedSetId === set.id ? 'is-active' : ''}
            disabled={!set.ready}
            key={set.id}
            onClick={() => onSelect(set)}
            type="button"
          >
            <span className="memory-set-preview" aria-hidden="true">
              {set.cards.slice(0, 3).map((card) => <img alt="" height={card.height} key={card.id} src={appPath(card.src)} width={card.width} />)}
              {set.cards.length === 0 ? <i>?</i> : null}
            </span>
            <span className="memory-set-copy"><strong>{set.label}</strong><small>{set.ready ? `${set.cards.length} Motive` : `${set.cards.length}/6 Motive`}</small></span>
          </button>
        ))}
      </div>
    </section>
  )
}

function PairChooser({ onSelect, pairCount, pairOptions, step = '03' }) {
  return (
    <section aria-labelledby={`memory-size-title-${step}`}>
      <div className="memory-section-heading"><span>{step}</span><div><h2 id={`memory-size-title-${step}`}>Wie groß soll das Spiel sein?</h2><p>{pairCount} Paare · etwa {durationForPairs(pairCount)} Minuten · Motive zufällig gewählt</p></div></div>
      <div className="memory-pair-options">
        {pairOptions.map((count) => (
          <button aria-pressed={pairCount === count} className={pairCount === count ? 'is-active' : ''} key={count} onClick={() => onSelect(count)} type="button">
            <strong>{count}</strong><span>Paare</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function PublicRooms({ onSelect, rooms }) {
  return (
    <section className="memory-public-rooms" aria-labelledby="memory-public-title">
      <div><span>Öffentlich · Freunde-Beta</span><h2 id="memory-public-title">Offene Memory-Räume</h2></div>
      {rooms.length ? <div>{rooms.map((room) => (
        <button key={room.code} onClick={() => onSelect(room.code)} type="button">
          <span><strong>{room.name}</strong><small>{room.playerCount} von 6 Personen{room.passwordProtected ? ' · Passwort' : ''}</small></span><b>{room.code}</b>
        </button>
      ))}</div> : <p>Noch wartet kein öffentlicher Memory-Raum.</p>}
    </section>
  )
}

export default function MemorySetupPage() {
  const sets = useMemo(() => getMemorySets(), [])
  const [mode, setMode] = useState('local')
  const [onlineTab, setOnlineTab] = useState('create')
  const [selectedSetId, setSelectedSetId] = useState(() => getDefaultMemorySetId())
  const selectedSet = useMemo(() => getMemorySet(selectedSetId), [selectedSetId])
  const pairOptions = useMemo(() => getAvailableMemoryPairCounts(selectedSetId), [selectedSetId])
  const assets = useMemo(() => getMemoryAssets(selectedSetId), [selectedSetId])
  const [names, setNames] = useState(defaultNames)
  const [pairCount, setPairCount] = useState(() => getDefaultMemoryPairCount(getDefaultMemorySetId()))
  const [createForm, setCreateForm] = useState({ name: '', roomName: '', visibility: 'private', passwordEnabled: false, password: '' })
  const [joinForm, setJoinForm] = useState({ name: '', code: '', password: '' })
  const [publicRooms, setPublicRooms] = useState([])
  const [savedGame, setSavedGame] = useState(null)
  const [savedRoom, setSavedRoom] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const online = memoryRoomRepository.isOnline

  useEffect(() => {
    let active = true
    const inspected = memoryGameRepository.inspect(memoryManifest)
    setSavedGame(inspected.game)
    if (inspected.issue === 'assets-changed') setError('Die Motive wurden geändert. Bitte starte eine neue Partie.')

    const refreshRooms = async () => {
      if (!online) return
      try {
        const rooms = await memoryRoomRepository.listPublic()
        if (active) setPublicRooms(rooms.filter((room) => room.playerCount < 6))
      } catch { /* Private Räume bleiben über ihren Code erreichbar. */ }
    }
    const loadSavedRoom = async () => {
      const session = memoryRoomRepository.loadSession()
      if (!session) return
      try {
        const room = await memoryRoomRepository.load(session.roomCode)
        if (active) setSavedRoom(room)
      } catch { /* Der Raum kann inzwischen geschlossen worden sein. */ }
    }
    refreshRooms()
    loadSavedRoom()
    const unsubscribe = memoryRoomRepository.subscribe(refreshRooms)
    const inviteCode = new URLSearchParams(window.location.search).get('code')
    if (inviteCode) {
      setMode('online')
      setOnlineTab('join')
      setJoinForm((current) => ({ ...current, code: inviteCode.replace(/\s/g, '').toUpperCase() }))
    }
    return () => { active = false; unsubscribe() }
  }, [online])

  const selectSet = (set) => {
    if (!set.ready) return
    setSelectedSetId(set.id)
    setPairCount(getDefaultMemoryPairCount(set.id))
    setConfirmOverwrite(false)
    setError('')
  }
  const selectPairCount = (count) => { setPairCount(count); setConfirmOverwrite(false); setError('') }
  const updateName = (index, value) => { setNames((current) => current.map((name, nameIndex) => nameIndex === index ? value : name)); setConfirmOverwrite(false) }
  const addPlayer = () => {
    setNames((current) => {
      if (current.length >= 6) return current
      const used = new Set(current.map((name) => name.toLocaleLowerCase('de-DE')))
      const number = Array.from({ length: 6 }, (_, index) => index + 1).find((index) => !used.has(`spieler ${index}`)) ?? current.length + 1
      return [...current, `Spieler ${number}`]
    })
    setConfirmOverwrite(false)
  }
  const removePlayer = (index) => { setNames((current) => current.length <= 1 ? current : current.filter((_, nameIndex) => nameIndex !== index)); setConfirmOverwrite(false) }

  const startLocalGame = async (event) => {
    event.preventDefault()
    const validation = validateMemoryPlayers(names)
    if (!validation.valid) { setError(validation.message); return }
    if (!selectedSet?.ready) { setError('Bitte wähle ein spielbares Bilder-Set.'); return }
    if (savedGame && !confirmOverwrite) { setConfirmOverwrite(true); setError(''); return }
    setBusy(true); setError('')
    try {
      const game = createMemoryGame({ names: validation.names, pairCount, assets, setId: selectedSet.id, setLabel: selectedSet.label, setFingerprint: selectedSet.fingerprint })
      const selectedIds = new Set(game.deck.map((card) => card.assetId))
      await preloadMemoryAssets(assets.filter((asset) => selectedIds.has(asset.id)))
      if (!memoryGameRepository.save(game, memoryManifest)) throw new Error('Die Partie konnte nicht im Browser gespeichert werden.')
      window.location.assign(appPath('/memory/spielen'))
    } catch (startError) { setError(startError.message); setBusy(false) }
  }

  const createOnlineRoom = async (event) => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      if (!online) throw new Error('Der Online-Modus ist auf diesem Build nicht verbunden.')
      if (!selectedSet?.ready) throw new Error('Bitte wähle ein spielbares Bilder-Set.')
      let room = null
      for (let attempt = 0; attempt < 5 && !room; attempt += 1) {
        const candidate = createMemoryRoom({
          hostName: createForm.name,
          roomName: createForm.roomName,
          visibility: createForm.visibility,
          password: createForm.passwordEnabled ? createForm.password : '',
          pairCount,
          assets,
          setId: selectedSet.id,
          setLabel: selectedSet.label,
          setFingerprint: selectedSet.fingerprint,
        })
        try { room = await memoryRoomRepository.create(candidate) }
        catch (creationError) {
          if (attempt === 4 || !/code|taken|vergeben/i.test(creationError.message)) throw creationError
        }
      }
      if (!room || !memoryRoomRepository.saveSession(room.code, room.hostId)) throw new Error('Die Raumsitzung konnte nicht gespeichert werden.')
      window.location.assign(appPath('/memory/spielen'))
    } catch (creationError) { setError(creationError.message); setBusy(false) }
  }

  const joinOnlineRoom = async (event) => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      if (!online) throw new Error('Beitreten auf einem zweiten Gerät benötigt den Online-Modus.')
      const code = joinForm.code.replace(/\s/g, '').toUpperCase()
      const playerId = createMemoryId('player')
      await memoryRoomRepository.join(code, joinForm.name, { id: playerId, password: joinForm.password })
      if (!memoryRoomRepository.saveSession(code, playerId)) throw new Error('Die Raumsitzung konnte nicht gespeichert werden.')
      window.location.assign(appPath('/memory/spielen'))
    } catch (joinError) { setError(joinError.message); setBusy(false) }
  }

  const openRoom = (code) => { setMode('online'); setOnlineTab('join'); setJoinForm((current) => ({ ...current, code })); setError('') }

  return (
    <div className="memory-page memory-page--setup">
      <AppHeader variant="dark" backTo="/" backLabel="Alle Spiele" />
      <main className="memory-setup-shell">
        <header className="memory-title-block"><span>Lokal oder online</span><h1>Memory</h1><p>Zufällige Motive aufdecken – gemeinsam an einem oder auf mehreren Geräten.</p></header>

        <div className="memory-mode-picker" aria-label="Gerätemodus">
          <button aria-pressed={mode === 'local'} className={mode === 'local' ? 'is-active' : ''} onClick={() => { setMode('local'); setError('') }} type="button"><strong>Ein gemeinsames Gerät</strong><span>Zusammensitzen und abwechselnd aufdecken.</span></button>
          <button aria-pressed={mode === 'online'} className={mode === 'online' ? 'is-active' : ''} disabled={!online} onClick={() => { setMode('online'); setError('') }} type="button"><strong>Eigene Geräte</strong><span>{online ? 'Per Raumcode live synchronisiert.' : 'Online-Verbindung noch nicht aktiv.'}</span></button>
        </div>

        {mode === 'local' ? <>
          {savedGame ? <section className="memory-resume" aria-labelledby="memory-resume-title"><div><span>Aktive Partie · {savedGame.setLabel}</span><h2 id="memory-resume-title">{savedGame.matchedPairs} von {savedGame.pairCount} Paaren gefunden</h2><p>{savedGame.players.map((player) => player.name).join(' · ')}</p></div><Button onClick={() => window.location.assign(appPath('/memory/spielen'))} type="button">Partie fortsetzen</Button></section> : null}
          <form className="memory-setup-card" onSubmit={startLocalGame}>
            <section aria-labelledby="memory-players-title"><div className="memory-section-heading"><span>01</span><div><h2 id="memory-players-title">Wer spielt mit?</h2><p>Ihr spielt gemeinsam an diesem Gerät.</p></div></div><div className="memory-player-fields">{names.map((name, index) => <label key={index}><span className="sr-only">Name von Person {index + 1}</span><input aria-label={`Name von Person ${index + 1}`} maxLength={28} onChange={(event) => updateName(index, event.target.value)} value={name} /><button aria-label={`${name || `Person ${index + 1}`} entfernen`} disabled={names.length === 1} onClick={() => removePlayer(index)} type="button">×</button></label>)}</div><button className="memory-add-player" disabled={names.length >= 6} onClick={addPlayer} type="button">+ Person hinzufügen</button></section>
            <SetChooser onSelect={selectSet} selectedSetId={selectedSetId} sets={sets} />
            <PairChooser onSelect={selectPairCount} pairCount={pairCount} pairOptions={pairOptions} />
            <p aria-live="polite" className="memory-error">{error}</p>
            {confirmOverwrite ? <div className="memory-overwrite" role="alert"><strong>Aktive Partie wirklich ersetzen?</strong><span>Der bisherige lokale Spielstand geht verloren.</span><button onClick={() => setConfirmOverwrite(false)} type="button">Abbrechen</button></div> : null}
            <Button className="memory-start" disabled={busy} type="submit">{busy ? 'Motive werden geladen …' : confirmOverwrite ? 'Trotzdem neu starten' : 'Spiel starten'}</Button>
            <p className="memory-save-note">Lokales Spiel · Züge werden automatisch und verlustsicher gespeichert</p>
          </form>
        </> : <div className="memory-online-shell">
          {savedRoom ? <section className="memory-resume"><div><span>Aktiver Onlineraum · {savedRoom.code}</span><h2>{savedRoom.name}</h2><p>{savedRoom.players.length} Personen · {savedRoom.setLabel} · {savedRoom.pairCount} Paare</p></div><Button onClick={() => window.location.assign(appPath('/memory/spielen'))} type="button">Raum öffnen</Button></section> : null}
          <div className="memory-online-tabs" role="tablist" aria-label="Onlineraum"><button aria-selected={onlineTab === 'create'} className={onlineTab === 'create' ? 'is-active' : ''} onClick={() => setOnlineTab('create')} role="tab" type="button">Raum erstellen</button><button aria-selected={onlineTab === 'join'} className={onlineTab === 'join' ? 'is-active' : ''} onClick={() => setOnlineTab('join')} role="tab" type="button">Raum beitreten</button></div>
          {onlineTab === 'create' ? <form className="memory-setup-card memory-online-form" onSubmit={createOnlineRoom}>
            <section><div className="memory-section-heading"><span>01</span><div><h2>Neuer Memory-Raum</h2><p>Du leitest den Raum und startest die Partie.</p></div></div><div className="memory-player-fields"><label><span className="sr-only">Dein Name</span><input aria-label="Dein Name" maxLength={28} onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))} placeholder="Dein Name" value={createForm.name} /></label><label><span className="sr-only">Raumname</span><input aria-label="Raumname" maxLength={48} onChange={(event) => setCreateForm((current) => ({ ...current, roomName: event.target.value }))} placeholder="Zum Beispiel Sonntagsrunde" value={createForm.roomName} /></label></div></section>
            <SetChooser onSelect={selectSet} selectedSetId={selectedSetId} sets={sets} />
            <PairChooser onSelect={selectPairCount} pairCount={pairCount} pairOptions={pairOptions} />
            <section className="memory-room-options"><div className="memory-section-heading"><span>04</span><div><h2>Sichtbarkeit</h2><p>Öffentlich auffindbar oder nur per Code.</p></div></div><div className="memory-visibility"><button aria-pressed={createForm.visibility === 'private'} className={createForm.visibility === 'private' ? 'is-active' : ''} onClick={() => setCreateForm((current) => ({ ...current, visibility: 'private' }))} type="button">Privat</button><button aria-pressed={createForm.visibility === 'public'} className={createForm.visibility === 'public' ? 'is-active' : ''} onClick={() => setCreateForm((current) => ({ ...current, visibility: 'public' }))} type="button">Öffentlich</button></div><label className="memory-password-toggle"><input checked={createForm.passwordEnabled} onChange={(event) => setCreateForm((current) => ({ ...current, passwordEnabled: event.target.checked }))} type="checkbox" /><span>Raum mit Passwort schützen</span></label>{createForm.passwordEnabled ? <input aria-label="Raumpasswort" maxLength={64} onChange={(event) => setCreateForm((current) => ({ ...current, password: event.target.value }))} placeholder="Passwort" type="password" value={createForm.password} /> : null}</section>
            <p aria-live="polite" className="memory-error">{error}</p><Button className="memory-start" disabled={busy} type="submit">{busy ? 'Raum wird erstellt …' : 'Onlineraum erstellen'}</Button><p className="memory-save-note">2–6 Geräte · live synchronisiert</p>
          </form> : <form className="memory-setup-card memory-join-form" onSubmit={joinOnlineRoom}>
            <section><div className="memory-section-heading"><span>→</span><div><h2>Mit Raumcode beitreten</h2><p>Trage den Code vom anderen Gerät ein.</p></div></div><div className="memory-join-fields"><label><span>Dein Name</span><input maxLength={28} onChange={(event) => setJoinForm((current) => ({ ...current, name: event.target.value }))} value={joinForm.name} /></label><label><span>Raumcode</span><input autoCapitalize="characters" maxLength={6} onChange={(event) => setJoinForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} value={joinForm.code} /></label><label><span>Passwort, falls nötig</span><input maxLength={64} onChange={(event) => setJoinForm((current) => ({ ...current, password: event.target.value }))} type="password" value={joinForm.password} /></label></div></section><p aria-live="polite" className="memory-error">{error}</p><Button className="memory-start" disabled={busy} type="submit">{busy ? 'Raum wird geöffnet …' : 'Raum beitreten'}</Button><p className="memory-save-note">Dein Gerät merkt sich die Raumsitzung automatisch</p>
          </form>}
          <PublicRooms onSelect={openRoom} rooms={publicRooms} />
        </div>}
      </main>
    </div>
  )
}
