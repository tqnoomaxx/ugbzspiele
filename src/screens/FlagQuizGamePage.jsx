'use client'

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import { ArrowRightIcon, CheckIcon, SparkIcon, TrophyIcon } from '../components/Icons.jsx'
import { flagById, getCollection, getFlagsForCollection } from '../games/flaggenkunde/catalog.js'
import { advanceQuiz, answerMapGuess, answerQuestion, answerTypedQuestion, createQuiz, getQuizResult, QUIZ_MODES } from '../games/flaggenkunde/gameEngine.js'
import { loadQuizSession, recordFlagAnswer, saveQuizSession } from '../games/flaggenkunde/progressRepository.js'

const RegionQuizMap = lazy(() => import('../components/RegionQuizMap.jsx'))

function FlagPicture({ flag, revealed = false }) {
  return (
    <img
      alt={revealed ? `Flagge von ${flag.name}` : ''}
      className="fq-flag-image"
      decoding="async"
      src={appPath(flag.image)}
    />
  )
}

function RegionLocation({ flag }) {
  if (flag.kind !== 'region' || !flag.locationMap) return null
  return (
    <aside className="fq-location-card" aria-label={`Lage von ${flag.name} in ${flag.parent}`}>
      <img alt={`Umrisskarte: ${flag.name} ist innerhalb von ${flag.parent} hervorgehoben`} src={appPath(flag.locationMap)} />
      <div>
        <span>Wo liegt das?</span>
        <strong>{flag.parent}</strong>
        <small>Die gesuchte Region ist korallfarben markiert.</small>
      </div>
    </aside>
  )
}

function QuestionPresentation({ answered, collection, flag, mode, question }) {
  const repeated = question.repeated ? 'Wiederholung · ' : ''
  if (mode === QUIZ_MODES.REVERSE) {
    return (
      <>
        <div className="fq-question-copy">
          <span className="fq-kicker">{repeated}Name → Flagge</span>
          <h1>{flag.name}</h1>
          <p>{flag.parent ? `${flag.parent} · ` : ''}Wähle unten das passende Motiv.</p>
          {answered ? <RegionLocation flag={flag} /> : null}
        </div>
        <div className="fq-reverse-stage">
          {answered ? <FlagPicture flag={flag} revealed /> : <><strong>?</strong><span>Vier Motive.<br />Eine Antwort.</span></>}
        </div>
      </>
    )
  }

  if (mode === QUIZ_MODES.EUROPE_MAP) {
    return (
      <>
        <div className="fq-question-copy">
          <span className="fq-kicker">{repeated}Europa-Hypermodus</span>
          <h1>{flag.name}</h1>
          <p>Finde die Region auf der Europakarte.</p>
        </div>
        <div className="fq-hyper-target">
          {answered && flag.image ? <FlagPicture flag={flag} revealed /> : <span aria-hidden="true">⌖</span>}
          <div><small>Land</small><strong>{flag.parent}</strong></div>
        </div>
      </>
    )
  }

  const isMap = mode === QUIZ_MODES.MAP
  const isTyped = mode === QUIZ_MODES.TYPE
  return (
    <>
      <div className="fq-question-copy">
        <span className="fq-kicker">{repeated}{isMap ? 'Flagge → Karte' : isTyped ? 'Name eintippen' : 'Welche Flagge ist das?'}</span>
        <h1>{answered ? flag.name : isMap ? 'Wo liegt sie?' : 'Schau genau hin.'}</h1>
        <p>{answered ? `${flag.code} · ${collection.shortTitle ?? collection.title}` : isMap ? 'Klicke unten auf die richtige Region.' : isTyped ? 'Schreibe den vollständigen Namen.' : 'Wähle die passende Antwort.'}</p>
        {answered && !isMap ? <RegionLocation flag={flag} /> : null}
      </div>
      <div className="fq-flag-stage">
        <span className="fq-flag-stage__pin fq-flag-stage__pin--one" aria-hidden="true" />
        <span className="fq-flag-stage__pin fq-flag-stage__pin--two" aria-hidden="true" />
        <FlagPicture flag={flag} revealed={answered} />
      </div>
    </>
  )
}

function ResultScreen({ quiz, onRestart }) {
  const result = getQuizResult(quiz)
  const collection = getCollection(quiz.collectionId)
  const hyper = quiz.quizMode === QUIZ_MODES.EUROPE_MAP
  const message = hyper ? 'Europa gemeistert!' : result.accuracy >= 90 ? 'Weltklasse!' : result.accuracy >= 70 ? 'Starke Reise!' : result.accuracy >= 50 ? 'Gute Grundlage!' : 'Jede Flagge beginnt mit dem ersten Blick.'
  return (
    <main className="fq-result-shell">
      <section className="fq-result-card">
        <div className="fq-result-seal"><TrophyIcon size={45} /></div>
        <span className="fq-kicker">Runde abgeschlossen</span>
        <h1>{message}</h1>
        <p>{collection.title} · {result.baseTotal} {hyper ? 'Gebiete' : 'Lernkarten'} · {quiz.score} Punkte</p>
        <div className="fq-result-score">
          <strong>{result.accuracy}<small>%</small></strong>
          <span>Trefferquote</span>
        </div>
        <div className="fq-result-stats">
          <div><strong>{result.learned}/{result.baseTotal}</strong><span>gelernt</span></div>
          <div><strong>{result.incorrect}</strong><span>Fehler</span></div>
          <div><strong>{result.repeats}</strong><span>wiederholt</span></div>
          <div><strong>{quiz.bestStreak}</strong><span>beste Serie</span></div>
        </div>
        <div className="fq-result-actions">
          <button className="fq-launch" onClick={onRestart} type="button">Noch eine Runde <ArrowRightIcon size={21} /></button>
          <a href={appPath('/flaggen')}>Andere Sammlung</a>
          <a href={appPath('/flaggen/lernen')}>Flaggen nachschlagen</a>
        </div>
      </section>
    </main>
  )
}

export default function FlagQuizGamePage() {
  const [quiz, setQuiz] = useState(undefined)
  const [typedAnswer, setTypedAnswer] = useState('')
  const inputRef = useRef(null)

  useEffect(() => setQuiz(loadQuizSession()), [])
  useEffect(() => {
    if (quiz) saveQuizSession(quiz)
  }, [quiz])

  const question = quiz?.questions[quiz.questionIndex]
  const flag = question ? flagById.get(question.flagId) : null
  const options = useMemo(() => question?.optionIds?.map((id) => flagById.get(id)).filter(Boolean) ?? [], [question])
  const latestAnswer = quiz?.answers.at(-1)
  const quizMode = quiz?.quizMode ?? QUIZ_MODES.CHOICE
  const isMapMode = quizMode === QUIZ_MODES.MAP || quizMode === QUIZ_MODES.EUROPE_MAP
  const isHyperMode = quizMode === QUIZ_MODES.EUROPE_MAP
  const completedMapIds = useMemo(() => quiz?.answers.filter((answer) => answer.correct).map((answer) => answer.flagId) ?? [], [quiz?.answers])

  useEffect(() => {
    if (quiz?.phase === 'question') {
      setTypedAnswer('')
      if (quizMode === QUIZ_MODES.TYPE) inputRef.current?.focus({ preventScroll: true })
    }
  }, [quiz?.questionIndex, quiz?.phase, quizMode])

  useEffect(() => {
    if (!quiz || quiz.quizMode !== QUIZ_MODES.EUROPE_MAP || quiz.phase !== 'feedback') return undefined
    const timer = window.setTimeout(() => setQuiz((current) => current?.phase === 'feedback' ? advanceQuiz(current) : current), 650)
    return () => window.clearTimeout(timer)
  }, [quiz?.phase, quiz?.questionIndex, quiz?.quizMode])

  useEffect(() => {
    function handleKeyDown(event) {
      if (quiz?.phase === 'question' && (quizMode === QUIZ_MODES.CHOICE || quizMode === QUIZ_MODES.REVERSE) && /^[1-4]$/.test(event.key)) {
        document.querySelector(`[data-fq-option="${Number(event.key) - 1}"]`)?.click()
      } else if (quiz?.phase === 'feedback' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        document.querySelector('[data-fq-next]')?.click()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [quiz?.phase, quiz?.questionIndex, quizMode])

  function choose(optionId) {
    if (!quiz || quiz.phase !== 'question') return
    const correct = optionId === question.flagId
    recordFlagAnswer(question.flagId, correct)
    setQuiz(answerQuestion(quiz, optionId))
  }

  function submitTyped(event) {
    event.preventDefault()
    if (!quiz || quiz.phase !== 'question' || !flag) return
    const nextQuiz = answerTypedQuestion(quiz, typedAnswer, flag.name, flag.code)
    if (nextQuiz === quiz) return
    recordFlagAnswer(question.flagId, nextQuiz.answers.at(-1).correct)
    setQuiz(nextQuiz)
  }

  function chooseMap(regionId) {
    if (!quiz || quiz.phase !== 'question') return
    const correct = regionId === question.flagId
    recordFlagAnswer(question.flagId, correct)
    setQuiz(answerMapGuess(quiz, regionId))
  }

  function next() {
    if (quiz) setQuiz(advanceQuiz(quiz))
  }

  function restart() {
    const pool = getFlagsForCollection(quiz.collectionId)
    const nextQuiz = createQuiz(pool, {
      collectionId: quiz.collectionId,
      roundLength: quiz.quizMode === QUIZ_MODES.EUROPE_MAP ? 'all' : quiz.baseQuestionCount,
      repeatMistakes: quiz.repeatMistakes,
      quizMode: quiz.quizMode,
    })
    saveQuizSession(nextQuiz)
    setTypedAnswer('')
    setQuiz(nextQuiz)
  }

  if (quiz === undefined) {
    return <div className="flag-page"><div className="fq-loading"><span>◉</span>Flaggen werden sortiert …</div></div>
  }

  const needsOptions = quizMode === QUIZ_MODES.CHOICE || quizMode === QUIZ_MODES.REVERSE
  if (!quiz || !flag || (needsOptions && options.length < 4)) {
    return (
      <div className="flag-page">
        <AppHeader variant="dark" home />
        <main className="fq-empty">
          <h1>Bereit für eine neue Reise?</h1>
          <p>Wähle zuerst eine Flaggensammlung aus.</p>
          <a className="fq-primary-link" href={appPath('/flaggen')}>Zur Spielauswahl</a>
        </main>
      </div>
    )
  }

  if (quiz.phase === 'complete') {
    return <div className="flag-page flag-page--game"><AppHeader variant="dark" home /><ResultScreen onRestart={restart} quiz={quiz} /></div>
  }

  const collection = getCollection(quiz.collectionId)
  const progress = (quiz.questionIndex / quiz.questions.length) * 100
  const answered = quiz.phase === 'feedback'
  const wrongMapRegion = quiz.lastMapGuessId ? flagById.get(quiz.lastMapGuessId) : null
  const questionCardClass = [
    'fq-question-card',
    quizMode === QUIZ_MODES.REVERSE ? 'fq-question-card--reverse' : '',
    isMapMode ? 'fq-question-card--map' : '',
    isHyperMode ? 'fq-question-card--hyper' : '',
    answered ? (latestAnswer.correct ? 'is-correct' : 'is-wrong') : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="flag-page flag-page--game">
      <AppHeader variant="dark" backLabel="Sammlungen" backTo="/flaggen" />
      <main className={`fq-game-shell ${isMapMode ? 'fq-game-shell--map' : ''}`}>
        <div className="fq-game-topbar">
          <div>
            <span>{collection.shortTitle ?? collection.title}</span>
            <strong>{quiz.questionIndex + 1} <small>/ {quiz.questions.length}</small></strong>
          </div>
          <div className="fq-game-progress" aria-label={`Frage ${quiz.questionIndex + 1} von ${quiz.questions.length}`}>
            <i style={{ width: `${progress}%` }} />
          </div>
          <div className="fq-game-score">
            <span>Punkte</span><strong>{quiz.score}</strong>
            <span>Serie</span><strong>{quiz.streak}×</strong>
          </div>
        </div>

        <section className={questionCardClass}>
          <QuestionPresentation answered={answered} collection={collection} flag={flag} mode={quizMode} question={question} />
        </section>

        <section className={`fq-answer-area ${isMapMode ? 'fq-answer-area--map' : ''}`} aria-label="Antwortbereich">
          {quizMode === QUIZ_MODES.CHOICE ? (
            <div className="fq-answer-grid">
              {options.map((option, index) => {
                const isCorrect = answered && option.id === question.flagId
                const isWrong = answered && option.id === latestAnswer.selectedId && !latestAnswer.correct
                return (
                  <button
                    className={`${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}`.trim()}
                    data-fq-option={index}
                    disabled={answered}
                    key={option.id}
                    onClick={() => choose(option.id)}
                    type="button"
                  >
                    <span>{index + 1}</span>
                    <strong>{option.name}</strong>
                    {isCorrect ? <CheckIcon size={22} /> : null}
                  </button>
                )
              })}
            </div>
          ) : null}

          {quizMode === QUIZ_MODES.REVERSE ? (
            <div className="fq-answer-grid fq-answer-grid--flags">
              {options.map((option, index) => {
                const isCorrect = answered && option.id === question.flagId
                const isWrong = answered && option.id === latestAnswer.selectedId && !latestAnswer.correct
                return (
                  <button
                    aria-label={answered ? option.name : `Flagge ${index + 1}`}
                    className={`${isCorrect ? 'is-correct' : ''} ${isWrong ? 'is-wrong' : ''}`.trim()}
                    data-fq-option={index}
                    disabled={answered}
                    key={option.id}
                    onClick={() => choose(option.id)}
                    type="button"
                  >
                    <span>{index + 1}</span>
                    <img alt="" src={appPath(option.image)} />
                    <strong>{answered ? option.name : ''}</strong>
                    {isCorrect ? <CheckIcon size={22} /> : null}
                  </button>
                )
              })}
            </div>
          ) : null}

          {quizMode === QUIZ_MODES.TYPE ? (
            <form className="fq-type-answer" onSubmit={submitTyped}>
              <label htmlFor="fq-typed-answer">Deine Antwort</label>
              <div>
                <input
                  autoComplete="off"
                  disabled={answered}
                  id="fq-typed-answer"
                  ref={inputRef}
                  onChange={(event) => setTypedAnswer(event.target.value)}
                  placeholder="Land oder Region …"
                  spellCheck="false"
                  value={typedAnswer}
                />
                <button disabled={answered || !typedAnswer.trim()} type="submit">Prüfen <ArrowRightIcon size={20} /></button>
              </div>
              <small>Großschreibung und Akzente sind optional; der Länder- oder Regionscode funktioniert ebenfalls.</small>
            </form>
          ) : null}

          {isMapMode ? (
            <Suspense fallback={<div className="fq-map-loading">Karte wird entfaltet …</div>}>
              <RegionQuizMap
                answered={answered}
                completedIds={completedMapIds}
                hyper={isHyperMode}
                lastGuessId={quiz.lastMapGuessId}
                onSelect={chooseMap}
                targetId={question.flagId}
              />
            </Suspense>
          ) : null}

          {isMapMode && !answered && wrongMapRegion ? (
            <div className="fq-map-try-again" aria-live="polite"><strong>{wrongMapRegion.name} ist es noch nicht.</strong><span>Versuch es direkt noch einmal – die Aufgabe bleibt offen.</span></div>
          ) : null}

          <div className={`fq-feedback ${answered ? 'is-visible' : ''}`} aria-live="polite">
            {answered ? (
              <>
                <div>
                  <SparkIcon size={21} />
                  <p><strong>{isMapMode ? 'Richtig gefunden!' : latestAnswer.correct ? 'Richtig erkannt!' : 'Fast – jetzt sitzt sie besser.'}</strong><span>{latestAnswer.correct ? `${flag.name} · +${100 + Math.min(quiz.streak - 1, 10) * 15} Punkte` : `Die richtige Antwort ist ${flag.name}.${quiz.repeatMistakes ? ' Sie kommt später noch einmal.' : ''}`}</span></p>
                </div>
                {isHyperMode ? <span className="fq-hyper-advance">Nächstes Ziel …</span> : <button data-fq-next onClick={next} type="button">{quiz.questionIndex === quiz.questions.length - 1 ? 'Ergebnis ansehen' : isMapMode ? 'Nächste Region' : 'Nächste Flagge'} <ArrowRightIcon size={21} /></button>}
              </>
            ) : !isMapMode ? <span className="fq-keyhint">{quizMode === QUIZ_MODES.TYPE ? 'Mit Enter prüfst du deine Eingabe.' : 'Tipp: Antworte auch mit den Tasten 1–4.'}</span> : null}
          </div>
        </section>
      </main>
    </div>
  )
}
