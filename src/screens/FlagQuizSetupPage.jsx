'use client'

import { useEffect, useMemo, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import { ArrowRightIcon, SearchIcon, SparkIcon } from '../components/Icons.jsx'
import { flagCatalog, flagCollections, getCollection, getFlagsForCollection } from '../games/flaggenkunde/catalog.js'
import { createQuiz } from '../games/flaggenkunde/gameEngine.js'
import { getProgressSummary, loadFlagProgress, saveQuizSession } from '../games/flaggenkunde/progressRepository.js'

const roundLengths = [10, 20, 50, 'all']
const groupOrder = ['Welt', 'Europa regional', 'Amerika regional', 'Pazifik regional']

function CollectionCard({ collection, progress, selected, onSelect }) {
  const flags = getFlagsForCollection(collection.id)
  const summary = getProgressSummary(progress, flags)
  return (
    <button
      aria-pressed={selected}
      className={`fq-collection ${selected ? 'is-selected' : ''}`}
      onClick={() => onSelect(collection.id)}
      type="button"
    >
      <span className="fq-collection__symbol" aria-hidden="true">{collection.symbol}</span>
      <span className="fq-collection__copy">
        <strong>{collection.title}</strong>
        <small>{collection.description}</small>
      </span>
      <span className="fq-collection__count">{flags.length}</span>
      <span className="fq-collection__progress" aria-label={`${summary.mastered} von ${summary.total} gemeistert`}>
        <i style={{ width: `${summary.total ? summary.mastered / summary.total * 100 : 0}%` }} />
      </span>
    </button>
  )
}

export default function FlagQuizSetupPage() {
  const [selectedId, setSelectedId] = useState('countries')
  const [roundLength, setRoundLength] = useState(20)
  const [progress, setProgress] = useState({ version: 1, stats: {} })
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setProgress(loadFlagProgress())
    setReady(true)
  }, [])

  const selectedCollection = getCollection(selectedId)
  const selectedFlags = useMemo(() => getFlagsForCollection(selectedId), [selectedId])
  const overall = useMemo(() => getProgressSummary(progress, flagCatalog), [progress])
  const selectedSummary = useMemo(() => getProgressSummary(progress, selectedFlags), [progress, selectedFlags])

  function selectCollection(id) {
    setSelectedId(id)
    setRoundLength(id === 'random' ? 20 : 20)
  }

  function startQuiz() {
    const quiz = createQuiz(selectedFlags, { collectionId: selectedId, roundLength })
    saveQuizSession(quiz)
    window.location.assign(appPath('/flaggen/spielen'))
  }

  const featured = flagCollections.filter((collection) => collection.featured)

  return (
    <div className="flag-page flag-page--setup">
      <AppHeader variant="dark" home />
      <main className="fq-setup-shell">
        <section className="fq-hero">
          <div className="fq-hero__copy">
            <span className="fq-kicker"><SparkIcon size={18} /> Flaggenkunde</span>
            <h1>Die Welt hat<br /><em>576 Flaggen.</em></h1>
            <p>Von Albanien bis Wyoming: Wähle eine Sammlung, erkenne die Flagge und baue Schritt für Schritt echtes Wissen auf.</p>
            <div className="fq-hero__actions">
              <a className="fq-primary-link" href={appPath('/flaggen/lernen')}>
                <SearchIcon size={20} /> Alle Flaggen entdecken
              </a>
              <span>Komplett lokal · ohne Anmeldung</span>
            </div>
          </div>
          <div className="fq-passport" aria-label={`Dein Lernstand: ${overall.mastered} Flaggen gemeistert`}>
            <span className="fq-passport__eyebrow">Dein Reisepass</span>
            <strong>{overall.mastered}</strong>
            <span>gemeistert</span>
            <div className="fq-passport__meter"><i style={{ width: `${overall.mastered / overall.total * 100}%` }} /></div>
            <small>{overall.seen} gesehen · {overall.total} insgesamt</small>
          </div>
        </section>

        <section aria-busy={!ready} className="fq-start-panel" aria-labelledby="fq-start-title">
          <div className="fq-start-panel__heading">
            <div>
              <span className="fq-step">01 · Sammlung</span>
              <h2 id="fq-start-title">Was möchtest du lernen?</h2>
            </div>
            <p>Die Antworten kommen bewusst aus derselben Region – so lernst du auch schwierige Unterschiede.</p>
          </div>

          <div className="fq-featured-grid">
            {featured.map((collection) => (
              <CollectionCard collection={collection} key={collection.id} onSelect={selectCollection} progress={progress} selected={selectedId === collection.id} />
            ))}
          </div>

          {groupOrder.map((group) => (
            <div className="fq-collection-group" key={group}>
              <h3>{group}</h3>
              <div className="fq-collection-grid">
                {flagCollections
                  .filter((collection) => collection.group === group)
                  .map((collection) => (
                    <CollectionCard collection={collection} key={collection.id} onSelect={selectCollection} progress={progress} selected={selectedId === collection.id} />
                  ))}
              </div>
            </div>
          ))}

          <div className="fq-round-config">
            <div>
              <span className="fq-step">02 · Rundenlänge</span>
              <h2>Wie weit geht die Reise?</h2>
            </div>
            <div className="fq-length-options" role="group" aria-label="Rundenlänge wählen">
              {roundLengths.map((length) => (
                <button
                  aria-pressed={roundLength === length}
                  className={roundLength === length ? 'is-selected' : ''}
                  key={length}
                  onClick={() => setRoundLength(length)}
                  type="button"
                >
                  <strong>{length === 'all' ? selectedFlags.length : length}</strong>
                  <span>{length === 'all' ? 'Komplett' : 'Fragen'}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="fq-launchbar">
            <div>
              <span>Ausgewählt</span>
              <strong>{selectedCollection.title}</strong>
              <small>{selectedSummary.mastered} von {selectedSummary.total} gemeistert</small>
            </div>
            <button className="fq-launch" onClick={startQuiz} type="button">
              Quiz starten <ArrowRightIcon size={22} />
            </button>
          </div>
        </section>

        <p className="fq-attribution">Die Flaggen und Lerndaten liegen vollständig in diesem Projekt. <a href={appPath('/assets/flags/ATTRIBUTION.md')}>Quellen &amp; Lizenzen</a></p>
      </main>
    </div>
  )
}
