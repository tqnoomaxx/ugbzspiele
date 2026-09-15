'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import { CheckIcon, SearchIcon } from '../components/Icons.jsx'
import { flagCollections, getCollection, getFlagsForCollection } from '../games/flaggenkunde/catalog.js'
import { isFlagMastered, loadFlagProgress } from '../games/flaggenkunde/progressRepository.js'

export default function FlagExplorerPage() {
  const [collectionId, setCollectionId] = useState('all')
  const [query, setQuery] = useState('')
  const [progress, setProgress] = useState({ version: 1, stats: {} })
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase('de'))

  useEffect(() => setProgress(loadFlagProgress()), [])

  const flags = useMemo(() => {
    const collectionFlags = getFlagsForCollection(collectionId)
    if (!deferredQuery) return collectionFlags
    return collectionFlags.filter((flag) => `${flag.name} ${flag.code}`.toLocaleLowerCase('de').includes(deferredQuery))
  }, [collectionId, deferredQuery])

  return (
    <div className="flag-page flag-page--explorer">
      <AppHeader variant="dark" backLabel="Zum Quiz" backTo="/flaggen" />
      <main className="fq-explorer-shell">
        <header className="fq-explorer-head">
          <span className="fq-kicker">Flaggenatlas</span>
          <h1>Entdecken,<br /><em>vergleichen, merken.</em></h1>
          <p>Alle Bilder liegen lokal im Projekt. Suche nach Namen oder Kürzel und vergleiche ähnliche Flaggen direkt miteinander.</p>
        </header>

        <div className="fq-explorer-tools">
          <label className="fq-search">
            <SearchIcon size={21} />
            <span className="sr-only">Flaggen suchen</span>
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Flagge oder Kürzel suchen …" type="search" value={query} />
          </label>
          <label className="fq-filter">
            <span className="sr-only">Sammlung filtern</span>
            <select onChange={(event) => setCollectionId(event.target.value)} value={collectionId}>
              {flagCollections.filter((collection) => collection.id !== 'random').map((collection) => (
                <option key={collection.id} value={collection.id}>{collection.title} · {getFlagsForCollection(collection.id).length}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="fq-explorer-summary">
          <strong>{flags.length}</strong>
          <span>{getCollection(collectionId).title}{deferredQuery ? ` · Treffer für „${query.trim()}“` : ''}</span>
        </div>

        {flags.length ? (
          <section className="fq-flag-grid" aria-label="Flaggenübersicht">
            {flags.map((flag) => {
              const mastered = isFlagMastered(progress.stats[flag.id])
              return (
                <article className="fq-flag-tile" key={flag.id}>
                  <div className="fq-flag-tile__image"><img alt={`Flagge von ${flag.name}`} loading="lazy" src={appPath(flag.image)} /></div>
                  <div>
                    <span>{flag.code}</span>
                    <h2>{flag.name}</h2>
                  </div>
                  {mastered ? <span className="fq-mastered" title="Gemeistert"><CheckIcon size={16} /></span> : null}
                </article>
              )
            })}
          </section>
        ) : (
          <div className="fq-no-results"><span>?</span><h2>Keine Flagge gefunden.</h2><p>Versuche einen anderen Namen oder lösche den Filter.</p></div>
        )}
      </main>
    </div>
  )
}
