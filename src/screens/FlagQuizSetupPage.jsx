'use client'

import { useEffect, useMemo, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import { ArrowRightIcon, SearchIcon, SparkIcon } from '../components/Icons.jsx'
import { flagCatalog, getCollection, getFlagsForCollection, getHyperItems, hyperCategoryDefinitions, learningCollections } from '../games/flaggenkunde/catalog.js'
import { createQuiz, QUIZ_MODES } from '../games/flaggenkunde/gameEngine.js'
import { getProgressSummary, loadFlagProgress, saveQuizSession } from '../games/flaggenkunde/progressRepository.js'

const roundLengths = [10, 20, 50, 'all']
const topicOptions = [
  { id: 'flags', mark: '⚑', title: 'Flaggen', description: 'Länder und Regionen an ihren Flaggen erkennen.' },
  { id: 'cities', mark: '⌂', title: 'Hauptstädte & Städte', description: 'Städte, Hauptstädte und Länder verbinden.' },
  { id: 'regional-capitals', mark: '⌖', title: 'Regionale Hauptstädte', description: 'Bundesländer, Provinzen und ihre Hauptstädte.' },
  { id: 'landmarks', mark: '◇', title: 'Sehenswürdigkeiten & UNESCO', description: 'Berühmte Orte auf echten Bildern erkennen.' },
  { id: 'hyper', mark: '⚡', title: 'Hypermodus', description: 'Wähle mehrere Themen und mische alles in einer Runde.' },
]
const continentLabels = { europe: 'Europa', africa: 'Afrika', asia: 'Asien', 'north-america': 'Nordamerika', 'south-america': 'Südamerika', oceania: 'Ozeanien' }

function groupBy(items, getKey) {
  const groups = new Map()
  for (const item of items) {
    const key = getKey(item)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return groups
}

function modesFor(collection, items) {
  if (collection.quizMode === QUIZ_MODES.EUROPE_MAP) return []
  if (collection.topic === 'hyper') return []
  if (collection.topic === 'flags') return [
    { id: QUIZ_MODES.CHOICE, mark: '1–4', title: 'Flaggenbild → Name', description: 'Du siehst die Flagge und wählst ihren Namen.', disabled: items.length < 4 },
    { id: QUIZ_MODES.TYPE, mark: 'Aa', title: 'Flaggenbild → Eingabe', description: 'Du erkennst die Flagge ohne Antwortvorgaben.' },
    { id: QUIZ_MODES.REVERSE, mark: '⇄', title: 'Name → Flaggenbild', description: 'Du siehst den Namen und wählst das Motiv.', disabled: items.length < 4 },
    { id: QUIZ_MODES.MAP, mark: '⌖', title: 'Flaggenbild → Karte', description: 'Du suchst die Region auf ihrer Landeskarte.', disabled: !items.every((item) => item.kind === 'region') },
  ]
  if (collection.topic === 'cities') {
    const allCapitals = items.every((item) => item.capital)
    const allHaveImages = items.every((item) => item.image)
    const countries = new Set(items.map((item) => item.parent)).size
    return [
      ...(allCapitals ? [
        { id: QUIZ_MODES.COUNTRY_CAPITAL, mark: '→', title: 'Land → Hauptstadt', description: 'Zum Land die richtige Hauptstadt finden.' },
        { id: QUIZ_MODES.CAPITAL_COUNTRY, mark: '←', title: 'Hauptstadt → Land', description: 'Die Hauptstadt ihrem Land zuordnen.' },
      ] : []),
      ...(countries >= 4 ? [{ id: QUIZ_MODES.CITY_COUNTRY, mark: '⌂', title: 'Stadt → Land', description: 'Eine bekannte Stadt dem Land zuordnen.' }] : []),
      ...(allHaveImages ? [
        { id: QUIZ_MODES.CITY_NAME, mark: '▣', title: 'Stadtbild → Name', description: 'Du siehst die Stadt und wählst ihren Namen.' },
        { id: QUIZ_MODES.CITY_REVERSE, mark: '⇄', title: 'Name → Stadtbild', description: 'Du wählst zum Stadtnamen das richtige Bild.' },
      ] : []),
    ]
  }
  if (collection.topic === 'regional-capitals') return [
    { id: QUIZ_MODES.REGION_CAPITAL, mark: '→', title: 'Region → Hauptstadt', description: 'Zum Bundesland, Staat oder Kanton die Hauptstadt finden.' },
    { id: QUIZ_MODES.CAPITAL_REGION, mark: '←', title: 'Hauptstadt → Region', description: 'Die regionale Hauptstadt ihrer Verwaltungseinheit zuordnen.' },
  ]
  const countries = new Set(items.map((item) => item.parent)).size
  return [
    ...(countries >= 4 ? [{ id: QUIZ_MODES.LANDMARK_COUNTRY, mark: '◎', title: 'Bild → Land', description: 'In welchem Land liegt dieser Ort?' }] : []),
    { id: QUIZ_MODES.LANDMARK_NAME, mark: '◇', title: 'Bild → Sehenswürdigkeit', description: 'Welcher berühmte Ort ist auf dem Bild?' },
  ]
}

function ModeExample({ item, mode }) {
  const showImage = [QUIZ_MODES.CHOICE, QUIZ_MODES.TYPE, QUIZ_MODES.CITY_NAME, QUIZ_MODES.LANDMARK_COUNTRY, QUIZ_MODES.LANDMARK_NAME].includes(mode)
  const showImageChoices = [QUIZ_MODES.REVERSE, QUIZ_MODES.CITY_REVERSE].includes(mode)
  if (mode === QUIZ_MODES.MAP) return <span className="fq-mode-example fq-mode-example--map"><b>Flagge</b><i>→</i><b>Karte</b></span>
  if (showImageChoices) return <span className="fq-mode-example"><b>{item.name}</b><i>→</i><em className="fq-mode-thumb"><img alt="" src={appPath(item.image)} /></em></span>
  if (showImage) return <span className="fq-mode-example"><em className="fq-mode-thumb"><img alt="" src={appPath(item.image)} /></em><i>→</i><b>{mode === QUIZ_MODES.LANDMARK_COUNTRY ? item.parent : item.name}</b></span>
  if (mode === QUIZ_MODES.COUNTRY_CAPITAL) return <span className="fq-mode-example"><b>{item.parent}</b><i>→</i><b>{item.name}</b></span>
  if (mode === QUIZ_MODES.REGION_CAPITAL) return <span className="fq-mode-example"><b>{item.region}</b><i>→</i><b>{item.name}</b></span>
  if (mode === QUIZ_MODES.CAPITAL_REGION) return <span className="fq-mode-example"><b>{item.name}</b><i>→</i><b>{item.region}</b></span>
  return <span className="fq-mode-example"><b>{item.name}</b><i>→</i><b>{item.parent}</b></span>
}

function CollectionCard({ collection, onSelect, progress, ready, selected }) {
  const items = getFlagsForCollection(collection.id)
  const summary = getProgressSummary(progress, items)
  const image = collection.image ?? (collection.topic !== 'flags' ? items.find((item) => item.image)?.image : null)
  return (
    <button aria-pressed={selected} className={`fq-collection ${selected ? 'is-selected' : ''} ${image ? 'fq-collection--visual' : ''}`} disabled={!ready} onClick={() => onSelect(collection.id)} type="button">
      {image ? <img alt="" className="fq-collection__image" loading="lazy" src={appPath(image)} /> : <span className="fq-collection__symbol" aria-hidden="true">{collection.symbol}</span>}
      <span className="fq-collection__copy"><strong>{collection.title}</strong><small>{collection.description}</small></span>
      <span className="fq-collection__count">{items.length}</span>
      <span className="fq-collection__progress" aria-label={`${summary.mastered} von ${summary.total} gemeistert`}><i style={{ width: `${summary.total ? summary.mastered / summary.total * 100 : 0}%` }} /></span>
    </button>
  )
}

export default function FlagQuizSetupPage() {
  const [selectedId, setSelectedId] = useState('countries')
  const [topic, setTopic] = useState('flags')
  const [continent, setContinent] = useState('')
  const [country, setCountry] = useState('')
  const [roundLength, setRoundLength] = useState(20)
  const [quizMode, setQuizMode] = useState(QUIZ_MODES.CHOICE)
  const [repeatMistakes, setRepeatMistakes] = useState(true)
  const [hyperCategories, setHyperCategories] = useState(() => hyperCategoryDefinitions.map((category) => category.id))
  const [progress, setProgress] = useState({ version: 1, stats: {} })
  const [ready, setReady] = useState(false)

  useEffect(() => { setProgress(loadFlagProgress()); setReady(true) }, [])

  const selectedCollection = getCollection(selectedId)
  const selectedItems = useMemo(() => selectedId === 'knowledge-hyper' ? getHyperItems(hyperCategories) : getFlagsForCollection(selectedId), [selectedId, hyperCategories])
  const overall = useMemo(() => getProgressSummary(progress, flagCatalog), [progress])
  const selectedSummary = useMemo(() => getProgressSummary(progress, selectedItems), [progress, selectedItems])
  const topicCollections = useMemo(() => learningCollections.filter((collection) => collection.topic === topic), [topic])
  const countries = useMemo(() => [...new Map(topicCollections.filter((collection) => collection.countryCode).map((collection) => {
    const item = getFlagsForCollection(collection.id)[0]
    return [collection.countryCode, item?.parent ?? collection.shortTitle ?? collection.title]
  })).entries()].sort((left, right) => left[1].localeCompare(right[1], 'de')), [topicCollections])
  const filteredCollections = useMemo(() => topicCollections.filter((collection) => {
    if (country) return collection.countryCode === country
    if (continent) return collection.continent === continent
    return true
  }), [topicCollections, continent, country])
  const availableModes = useMemo(() => modesFor(selectedCollection, selectedItems), [selectedCollection, selectedItems])
  const selectedMode = availableModes.find((mode) => mode.id === quizMode)
  const isEuropeHyperMode = quizMode === QUIZ_MODES.EUROPE_MAP
  const isKnowledgeHyperMode = quizMode === QUIZ_MODES.MIXED
  const isMapMode = quizMode === QUIZ_MODES.MAP || isEuropeHyperMode
  const sample = selectedItems.find((item) => item.image) ?? selectedItems[0]
  const canStart = ready && selectedItems.length >= ([QUIZ_MODES.TYPE, QUIZ_MODES.MAP, QUIZ_MODES.EUROPE_MAP].includes(quizMode) ? 1 : 4)

  function selectCollection(id) {
    const collection = getCollection(id)
    const items = getFlagsForCollection(id)
    setSelectedId(id)
    setRoundLength(collection.quizMode === QUIZ_MODES.EUROPE_MAP ? 'all' : Math.min(20, items.length))
    if (collection.quizMode) setQuizMode(collection.quizMode)
    else setQuizMode(collection.defaultQuizMode ?? modesFor(collection, items).find((mode) => !mode.disabled)?.id ?? QUIZ_MODES.CHOICE)
  }

  function selectTopic(nextTopic) {
    setTopic(nextTopic)
    setContinent('')
    setCountry('')
    const first = learningCollections.find((collection) => collection.topic === nextTopic && collection.featured) ?? learningCollections.find((collection) => collection.topic === nextTopic)
    selectCollection(first.id)
  }

  function changeFilter(nextContinent, nextCountry = '') {
    setContinent(nextContinent)
    setCountry(nextCountry)
    const next = topicCollections.find((collection) => nextCountry ? collection.countryCode === nextCountry : nextContinent ? collection.continent === nextContinent : collection.featured) ?? topicCollections[0]
    if (next) selectCollection(next.id)
  }

  function startQuiz() {
    const quiz = createQuiz(selectedItems, { collectionId: selectedId, roundLength: isEuropeHyperMode ? 'all' : roundLength, repeatMistakes: isMapMode ? false : repeatMistakes, quizMode, hyperCategories })
    saveQuizSession(quiz)
    window.location.assign(appPath('/flaggen/spielen'))
  }

  function toggleHyperCategory(categoryId) {
    setHyperCategories((current) => current.includes(categoryId)
      ? current.length === 1 ? current : current.filter((id) => id !== categoryId)
      : [...current, categoryId])
  }

  const groupedCollections = groupBy(filteredCollections, (collection) => collection.featured ? 'Empfohlen' : collection.group ?? 'Weitere Sammlungen')

  return (
    <div className="flag-page flag-page--setup">
      <AppHeader variant="dark" home />
      <main className="fq-setup-shell">
        <section className="fq-learning-intro">
          <div><h1>Was möchtest du lernen?</h1><p>Wähle ein Thema, eine Region und danach die Art der Fragen.</p></div>
          <div className="fq-learning-progress"><strong>{overall.mastered}</strong><span>von {overall.total} Flaggen gemeistert</span><a href={appPath('/flaggen/lernen')}><SearchIcon size={18} /> Atlas öffnen</a></div>
        </section>

        <section aria-busy={!ready} className="fq-start-panel" aria-labelledby="fq-start-title">
          <div className="fq-topic-options" role="tablist" aria-label="Lernthema wählen">
            {topicOptions.map((option) => <button aria-selected={topic === option.id} className={topic === option.id ? 'is-selected' : ''} disabled={!ready} key={option.id} onClick={() => selectTopic(option.id)} role="tab" type="button"><span aria-hidden="true">{option.mark}</span><span><strong>{option.title}</strong><small>{option.description}</small></span></button>)}
          </div>

          <div className="fq-library-heading">
            <div><span className="fq-step">01 · Sammlung</span><h2 id="fq-start-title">Was kommt in die Runde?</h2></div>
            {!isKnowledgeHyperMode ? <div className="fq-library-filters">
              <label>Kontinent<select aria-label="Nach Kontinent filtern" value={continent} onChange={(event) => changeFilter(event.target.value)}><option value="">Alle Kontinente</option>{Object.entries(continentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Land<select aria-label="Nach Land filtern" value={country} onChange={(event) => changeFilter(continent, event.target.value)}><option value="">Alle Länder</option>{countries.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            </div> : null}
          </div>

          {isKnowledgeHyperMode ? <div className="fq-hyper-builder"><div className="fq-hyper-builder__intro"><span aria-hidden="true">⚡</span><div><strong>Dein persönlicher Wissensmix</strong><small>Wähle die Inhalte. Der Hypermodus entscheidet bei jeder Frage passend zwischen Flagge, Name, Bild, Land oder Hauptstadt.</small></div></div><div className="fq-hyper-category-grid">{hyperCategoryDefinitions.map((category) => { const selected = hyperCategories.includes(category.id); const count = getHyperItems([category.id]).length; return <button aria-pressed={selected} className={selected ? 'is-selected' : ''} key={category.id} onClick={() => toggleHyperCategory(category.id)} type="button"><span aria-hidden="true">{category.mark}</span><span><strong>{category.title}</strong><small>{category.description}</small></span><b>{count}</b></button> })}</div><p><strong>{selectedItems.length}</strong> unterschiedliche Lernkarten stehen für deine Runde bereit.</p></div> : <>{[...groupedCollections].map(([group, collections]) => <div className="fq-collection-group" key={group}><h3>{group}</h3><div className="fq-collection-grid">{collections.map((collection) => <CollectionCard collection={collection} key={collection.id} onSelect={selectCollection} progress={progress} ready={ready} selected={selectedId === collection.id} />)}</div></div>)}{!filteredCollections.length ? <p className="fq-library-empty">Für diesen Filter gibt es noch keine eigene Sammlung.</p> : null}</>}

          <div className="fq-question-mode-config">
            <div><span className="fq-step">02 · Fragetyp</span><h2>So sieht deine Aufgabe aus</h2><p>Die kleine Vorschau zeigt direkt, was gegeben ist und was du finden sollst.</p></div>
            {isEuropeHyperMode ? <div className="fq-hyper-mode-note"><span aria-hidden="true">⚡</span><div><strong>Europa-Karte aktiviert</strong><small>{selectedItems.length} Gebiete in zufälliger Reihenfolge. Du kannst ein Ziel überspringen und später mit einer neuen Runde wiederholen.</small></div></div> : isKnowledgeHyperMode ? <div className="fq-hyper-mode-note"><span aria-hidden="true">⇄</span><div><strong>Fragetypen wechseln automatisch</strong><small>Flagge → Name, Name → Flagge, Land → Hauptstadt, Hauptstadt → Region und Bilderfragen werden sinnvoll gemischt.</small></div></div> : <div className="fq-mode-options">{availableModes.map((mode) => <button aria-pressed={quizMode === mode.id} className={quizMode === mode.id ? 'is-selected' : ''} disabled={mode.disabled} key={mode.id} onClick={() => setQuizMode(mode.id)} type="button"><span aria-hidden="true">{mode.mark}</span><span><strong>{mode.title}</strong><ModeExample item={sample} mode={mode.id} /><small>{mode.disabled ? 'Für diese Sammlung nicht verfügbar.' : mode.description}</small></span></button>)}</div>}
          </div>

          <div className="fq-training-config">
            <div><span className="fq-step">03 · Lernmodus</span><h2>Was passiert bei einem Fehler?</h2></div>
            {isMapMode ? <div className="fq-hyper-mode-note fq-hyper-mode-note--quiet"><span aria-hidden="true">⌖</span><div><strong>{isEuropeHyperMode ? 'Suchen oder überspringen' : 'Finden statt überspringen'}</strong><small>{isEuropeHyperMode ? 'Falsche Klicks zählen als Versuch. Mit Überspringen geht es direkt zum nächsten Gebiet.' : 'Die Aufgabe bleibt offen, bis du die richtige Region gefunden hast.'}</small></div></div> : <div className="fq-training-options"><button aria-pressed={repeatMistakes} className={repeatMistakes ? 'is-selected' : ''} onClick={() => setRepeatMistakes(true)} type="button"><SparkIcon size={22} /><span><strong>Fehler wiederholen</strong><small>Falsche Aufgaben kommen später erneut.</small></span></button><button aria-pressed={!repeatMistakes} className={!repeatMistakes ? 'is-selected' : ''} onClick={() => setRepeatMistakes(false)} type="button"><span className="fq-classic-mark" aria-hidden="true">1×</span><span><strong>Klassische Runde</strong><small>Jede Aufgabe erscheint genau einmal.</small></span></button></div>}
          </div>

          <div className="fq-round-config">
            <div><span className="fq-step">04 · Rundenlänge</span><h2>Wie weit geht die Reise?</h2></div>
            {isEuropeHyperMode ? <div className="fq-hyper-total"><strong>{selectedItems.length}</strong><span>Gebiete · komplette Europareise</span></div> : <div className="fq-length-options">{roundLengths.filter((length) => length === 'all' || length <= selectedItems.length).map((length) => <button aria-pressed={roundLength === length} className={roundLength === length ? 'is-selected' : ''} key={length} onClick={() => setRoundLength(length)} type="button"><strong>{length === 'all' ? selectedItems.length : length}</strong><span>{length === 'all' ? 'Komplett' : 'Fragen'}</span></button>)}</div>}
          </div>

          <div className="fq-launchbar"><div><span>Ausgewählt</span><strong>{selectedCollection.title}</strong><small>{selectedSummary.mastered} von {selectedSummary.total} gemeistert · {isEuropeHyperMode ? 'Europa-Karte' : isKnowledgeHyperMode ? `${hyperCategories.length} Themen im Mix` : selectedMode?.title}</small></div><button className="fq-launch" disabled={!canStart} onClick={startQuiz} type="button">Quiz starten <ArrowRightIcon size={22} /></button></div>
        </section>
        <p className="fq-attribution">Bilder, Flaggen und Lerndaten liegen lokal im Projekt. <a href={appPath('/assets/flags/ATTRIBUTION.md')}>Flaggenquellen</a> · <a href={appPath('/assets/geography/ATTRIBUTION.md')}>Bildquellen</a></p>
      </main>
    </div>
  )
}
