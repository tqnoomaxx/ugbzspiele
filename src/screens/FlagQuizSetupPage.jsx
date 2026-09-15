'use client'

import { useEffect, useMemo, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import { ArrowRightIcon, SearchIcon, SparkIcon } from '../components/Icons.jsx'
import { flagCatalog, flagCollections, getCollection, getFlagsForCollection } from '../games/flaggenkunde/catalog.js'
import { createQuiz, QUIZ_MODES } from '../games/flaggenkunde/gameEngine.js'
import { getProgressSummary, loadFlagProgress, saveQuizSession } from '../games/flaggenkunde/progressRepository.js'

const roundLengths = [10, 20, 50, 'all']
const groupOrder = ['Welt', 'Europa regional', 'Amerika regional', 'Asien regional', 'Pazifik regional']
const quizModes = [
  { id: QUIZ_MODES.CHOICE, mark: '1–4', title: 'Flagge → Name', description: 'Die klassische Auswahl mit vier Namen.' },
  { id: QUIZ_MODES.TYPE, mark: 'Aa', title: 'Name eingeben', description: 'Erkenne die Flagge ganz ohne Vorgaben.' },
  { id: QUIZ_MODES.REVERSE, mark: '⇄', title: 'Name → Flagge', description: 'Finde zum Namen das richtige Motiv.' },
  { id: QUIZ_MODES.MAP, mark: '⌖', title: 'Flagge → Karte', description: 'Klicke die Region an ihrer richtigen Lage an.', regionsOnly: true },
]

function CollectionCard({ collection, progress, selected, onSelect, ready }) {
  const flags = getFlagsForCollection(collection.id)
  const summary = getProgressSummary(progress, flags)
  return (
    <button
      aria-pressed={selected}
      className={`fq-collection ${selected ? 'is-selected' : ''}`}
      disabled={!ready}
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
  const [quizMode, setQuizMode] = useState(QUIZ_MODES.CHOICE)
  const [repeatMistakes, setRepeatMistakes] = useState(true)
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
  const isHyperMode = quizMode === QUIZ_MODES.EUROPE_MAP
  const isMapMode = quizMode === QUIZ_MODES.MAP || isHyperMode
  const mapModeAvailable = selectedFlags.length > 0 && selectedFlags.every((flag) => flag.kind === 'region')
  const selectedMode = quizModes.find((mode) => mode.id === quizMode)

  function selectCollection(id) {
    setSelectedId(id)
    const collection = getCollection(id)
    if (collection.quizMode === QUIZ_MODES.EUROPE_MAP) {
      setQuizMode(QUIZ_MODES.EUROPE_MAP)
      setRoundLength('all')
    } else {
      if (quizMode === QUIZ_MODES.EUROPE_MAP || (quizMode === QUIZ_MODES.MAP && !getFlagsForCollection(id).every((flag) => flag.kind === 'region'))) setQuizMode(QUIZ_MODES.CHOICE)
      setRoundLength(20)
    }
  }

  function startQuiz() {
    const quiz = createQuiz(selectedFlags, {
      collectionId: selectedId,
      roundLength: isHyperMode ? 'all' : roundLength,
      repeatMistakes: isMapMode ? false : repeatMistakes,
      quizMode,
    })
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
            <h1>Die Welt hat<br /><em>{flagCatalog.length} Flaggen.</em></h1>
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
              <CollectionCard collection={collection} key={collection.id} onSelect={selectCollection} progress={progress} ready={ready} selected={selectedId === collection.id} />
            ))}
          </div>

          {groupOrder.map((group) => (
            <div className="fq-collection-group" key={group}>
              <h3>{group}</h3>
              <div className="fq-collection-grid">
                {flagCollections
                  .filter((collection) => collection.group === group)
                  .map((collection) => (
                    <CollectionCard collection={collection} key={collection.id} onSelect={selectCollection} progress={progress} ready={ready} selected={selectedId === collection.id} />
                  ))}
              </div>
            </div>
          ))}

          <div className="fq-question-mode-config">
            <div>
              <span className="fq-step">02 · Fragetyp</span>
              <h2>Wie möchtest du antworten?</h2>
            </div>
            {isHyperMode ? (
              <div className="fq-hyper-mode-note">
                <span aria-hidden="true">⚡</span>
                <div><strong>Europa-Karte aktiviert</strong><small>{selectedFlags.length} Gebiete in zufälliger Reihenfolge: Bundesländer, Regionen, Provinzen und Kleinstaaten. Finde sie alle auf der zoombaren Europakarte. Verwaltungsebene und Grenzstand variieren je Land; keine tagesaktuelle amtliche Karte.</small></div>
              </div>
            ) : (
              <div className="fq-mode-options" role="group" aria-label="Fragetyp wählen">
                {quizModes.map((mode) => {
                  const disabled = mode.regionsOnly && !mapModeAvailable
                  return (
                    <button
                      aria-pressed={quizMode === mode.id}
                      className={quizMode === mode.id ? 'is-selected' : ''}
                      disabled={disabled}
                      key={mode.id}
                      onClick={() => setQuizMode(mode.id)}
                      type="button"
                    >
                      <span aria-hidden="true">{mode.mark}</span>
                      <span><strong>{mode.title}</strong><small>{disabled ? 'Nur für regionale Sammlungen verfügbar.' : mode.description}</small></span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="fq-training-config">
            <div>
              <span className="fq-step">03 · Lernmodus</span>
              <h2>Wie sollen Fehler trainiert werden?</h2>
            </div>
            {isMapMode ? (
              <div className="fq-hyper-mode-note fq-hyper-mode-note--quiet">
                <span aria-hidden="true">⌖</span>
                <div><strong>Finden statt überspringen</strong><small>Ein falscher Kartenpunkt zählt als Versuch; du suchst weiter, bis die richtige Region gefunden ist.</small></div>
              </div>
            ) : <div className="fq-training-options" role="group" aria-label="Lernmodus wählen">
              <button aria-pressed={repeatMistakes} className={repeatMistakes ? 'is-selected' : ''} onClick={() => setRepeatMistakes(true)} type="button">
                <SparkIcon size={22} />
                <span><strong>Fehler wiederholen</strong><small>Falsche Flaggen kommen später erneut – bis sie sitzen.</small></span>
              </button>
              <button aria-pressed={!repeatMistakes} className={!repeatMistakes ? 'is-selected' : ''} onClick={() => setRepeatMistakes(false)} type="button">
                <span className="fq-classic-mark" aria-hidden="true">1×</span>
                <span><strong>Klassische Runde</strong><small>Jede ausgewählte Flagge erscheint genau einmal.</small></span>
              </button>
            </div>}
          </div>

          <div className="fq-round-config">
            <div>
              <span className="fq-step">04 · Rundenlänge</span>
              <h2>Wie weit geht die Reise?</h2>
            </div>
            {isHyperMode ? (
              <div className="fq-hyper-total"><strong>{selectedFlags.length}</strong><span>Regionen · komplette Europareise</span></div>
            ) : <div className="fq-length-options" role="group" aria-label="Rundenlänge wählen">
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
            </div>}
          </div>

          <div className="fq-launchbar">
            <div>
              <span>Ausgewählt</span>
              <strong>{selectedCollection.title}</strong>
              <small>{selectedSummary.mastered} von {selectedSummary.total} gemeistert · {isHyperMode ? 'Europa-Karte' : selectedMode?.title} · {isMapMode ? 'Finden bis richtig' : repeatMistakes ? 'Fehlertraining aktiv' : 'klassisch'}</small>
            </div>
            <button className="fq-launch" disabled={!ready} onClick={startQuiz} type="button">
              Quiz starten <ArrowRightIcon size={22} />
            </button>
          </div>
        </section>

        <p className="fq-attribution">Die Flaggen und Lerndaten liegen vollständig in diesem Projekt. <a href={appPath('/assets/flags/ATTRIBUTION.md')}>Quellen &amp; Lizenzen</a></p>
      </main>
    </div>
  )
}
