'use client'

import { useEffect, useMemo, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import Button from '../components/Button.jsx'
import { createMemoryGame, validateMemoryPlayers } from '../games/memory/gameEngine.js'
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

function defaultNames() {
  return ['Spieler 1', 'Spieler 2']
}

export default function MemorySetupPage() {
  const sets = useMemo(() => getMemorySets(), [])
  const [selectedSetId, setSelectedSetId] = useState(() => getDefaultMemorySetId())
  const selectedSet = useMemo(() => getMemorySet(selectedSetId), [selectedSetId])
  const pairOptions = useMemo(() => getAvailableMemoryPairCounts(selectedSetId), [selectedSetId])
  const assets = useMemo(() => getMemoryAssets(selectedSetId), [selectedSetId])
  const [names, setNames] = useState(defaultNames)
  const [pairCount, setPairCount] = useState(() => getDefaultMemoryPairCount(getDefaultMemorySetId()))
  const [savedGame, setSavedGame] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)

  useEffect(() => {
    const inspected = memoryGameRepository.inspect(memoryManifest)
    setSavedGame(inspected.game)
    if (inspected.issue === 'assets-changed') setError('Die Motive wurden geändert. Bitte starte eine neue Partie.')
  }, [])

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
  const selectSet = (set) => {
    if (!set.ready) return
    setSelectedSetId(set.id)
    setPairCount(getDefaultMemoryPairCount(set.id))
    setConfirmOverwrite(false)
    setError('')
  }

  const startGame = async (event) => {
    event.preventDefault()
    const validation = validateMemoryPlayers(names)
    if (!validation.valid) { setError(validation.message); return }
    if (!selectedSet?.ready) { setError('Bitte wähle ein spielbares Bilder-Set.'); return }
    if (savedGame && !confirmOverwrite) { setConfirmOverwrite(true); setError(''); return }
    setBusy(true)
    setError('')
    try {
      const game = createMemoryGame({
        names: validation.names,
        pairCount,
        assets,
        setId: selectedSet.id,
        setLabel: selectedSet.label,
        setFingerprint: selectedSet.fingerprint,
      })
      const selectedIds = new Set(game.deck.map((card) => card.assetId))
      await preloadMemoryAssets(assets.filter((asset) => selectedIds.has(asset.id)))
      if (!memoryGameRepository.save(game, memoryManifest)) throw new Error('Die Partie konnte nicht im Browser gespeichert werden.')
      window.location.assign(appPath('/memory/spielen'))
    } catch (startError) {
      setError(startError.message)
      setBusy(false)
    }
  }

  const continueGame = () => window.location.assign(appPath('/memory/spielen'))

  return (
    <div className="memory-page memory-page--setup">
      <AppHeader variant="dark" backTo="/" backLabel="Alle Spiele" />
      <main className="memory-setup-shell">
        <header className="memory-title-block">
          <span>Der Familienklassiker</span>
          <h1>Memory</h1>
          <p>Aufdecken, merken und die meisten Paare sammeln.</p>
        </header>

        {savedGame ? (
          <section className="memory-resume" aria-labelledby="memory-resume-title">
            <div><span>Aktive Partie · {savedGame.setLabel}</span><h2 id="memory-resume-title">{savedGame.matchedPairs} von {savedGame.pairCount} Paaren gefunden</h2><p>{savedGame.players.map((player) => player.name).join(' · ')}</p></div>
            <Button onClick={continueGame} type="button">Partie fortsetzen</Button>
          </section>
        ) : null}

        <form className="memory-setup-card" onSubmit={startGame}>
          <section aria-labelledby="memory-players-title">
            <div className="memory-section-heading"><span>01</span><div><h2 id="memory-players-title">Wer spielt mit?</h2><p>Ihr spielt gemeinsam an diesem Gerät.</p></div></div>
            <div className="memory-player-fields">
              {names.map((name, index) => (
                <label key={index}>
                  <span className="sr-only">Name von Person {index + 1}</span>
                  <input aria-label={`Name von Person ${index + 1}`} maxLength={28} onChange={(event) => updateName(index, event.target.value)} value={name} />
                  <button aria-label={`${name || `Person ${index + 1}`} entfernen`} disabled={names.length === 1} onClick={() => removePlayer(index)} type="button">×</button>
                </label>
              ))}
            </div>
            <button className="memory-add-player" disabled={names.length >= 6} onClick={addPlayer} type="button">+ Person hinzufügen</button>
          </section>

          <section aria-labelledby="memory-set-title">
            <div className="memory-section-heading"><span>02</span><div><h2 id="memory-set-title">Welches Bilder-Set?</h2><p>Jeder Ordner wird automatisch zu einem eigenen Set.</p></div></div>
            <div className="memory-set-options">
              {sets.map((set) => (
                <button
                  aria-label={`${set.label}, ${set.cards.length} Motive${set.ready ? '' : ', noch nicht spielbar'}`}
                  aria-pressed={selectedSetId === set.id}
                  className={selectedSetId === set.id ? 'is-active' : ''}
                  disabled={!set.ready}
                  key={set.id}
                  onClick={() => selectSet(set)}
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

          <section aria-labelledby="memory-size-title">
            <div className="memory-section-heading"><span>03</span><div><h2 id="memory-size-title">Wie groß soll das Spiel sein?</h2><p>{pairCount} Paare · etwa {pairCount <= 6 ? '3–7' : pairCount <= 8 ? '5–10' : '8–15'} Minuten</p></div></div>
            <div className="memory-pair-options">
              {pairOptions.map((count) => (
                <button aria-pressed={pairCount === count} className={pairCount === count ? 'is-active' : ''} key={count} onClick={() => { setPairCount(count); setConfirmOverwrite(false) }} type="button">
                  <strong>{count}</strong><span>Paare</span>
                </button>
              ))}
            </div>
          </section>

          <p aria-live="polite" className="memory-error">{error}</p>
          {confirmOverwrite ? <div className="memory-overwrite" role="alert"><strong>Aktive Partie wirklich ersetzen?</strong><span>Der bisherige lokale Spielstand geht verloren.</span><button onClick={() => setConfirmOverwrite(false)} type="button">Abbrechen</button></div> : null}
          <Button className="memory-start" disabled={busy} type="submit">{busy ? 'Motive werden geladen …' : confirmOverwrite ? 'Trotzdem neu starten' : 'Spiel starten'}</Button>
          <p className="memory-save-note">Lokales Spiel · Züge werden automatisch und verlustsicher gespeichert</p>
        </form>
      </main>
    </div>
  )
}
