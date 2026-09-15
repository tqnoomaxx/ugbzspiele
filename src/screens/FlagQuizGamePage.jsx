'use client'

import { useEffect, useMemo, useState } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'
import { ArrowRightIcon, CheckIcon, SparkIcon, TrophyIcon } from '../components/Icons.jsx'
import { flagById, getCollection, getFlagsForCollection } from '../games/flaggenkunde/catalog.js'
import { advanceQuiz, answerQuestion, createQuiz, getQuizResult } from '../games/flaggenkunde/gameEngine.js'
import { loadQuizSession, recordFlagAnswer, saveQuizSession } from '../games/flaggenkunde/progressRepository.js'

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

function ResultScreen({ quiz, onRestart }) {
  const result = getQuizResult(quiz)
  const collection = getCollection(quiz.collectionId)
  const message = result.accuracy >= 90 ? 'Weltklasse!' : result.accuracy >= 70 ? 'Starke Reise!' : result.accuracy >= 50 ? 'Gute Grundlage!' : 'Jede Flagge beginnt mit dem ersten Blick.'
  return (
    <main className="fq-result-shell">
      <section className="fq-result-card">
        <div className="fq-result-seal"><TrophyIcon size={45} /></div>
        <span className="fq-kicker">Runde abgeschlossen</span>
        <h1>{message}</h1>
        <p>{collection.title} · {result.baseTotal} Lernkarten · {quiz.score} Punkte</p>
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

  useEffect(() => setQuiz(loadQuizSession()), [])
  useEffect(() => {
    if (quiz) saveQuizSession(quiz)
  }, [quiz])

  const question = quiz?.questions[quiz.questionIndex]
  const flag = question ? flagById.get(question.flagId) : null
  const options = useMemo(() => question?.optionIds.map((id) => flagById.get(id)).filter(Boolean) ?? [], [question])
  const latestAnswer = quiz?.answers.at(-1)

  useEffect(() => {
    function handleKeyDown(event) {
      if (quiz?.phase === 'question' && /^[1-4]$/.test(event.key)) {
        document.querySelector(`[data-fq-option="${Number(event.key) - 1}"]`)?.click()
      } else if (quiz?.phase === 'feedback' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        document.querySelector('[data-fq-next]')?.click()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [quiz?.phase, quiz?.questionIndex])

  function choose(optionId) {
    if (!quiz || quiz.phase !== 'question') return
    const correct = optionId === question.flagId
    recordFlagAnswer(question.flagId, correct)
    setQuiz(answerQuestion(quiz, optionId))
  }

  function next() {
    if (quiz) setQuiz(advanceQuiz(quiz))
  }

  function restart() {
    const pool = getFlagsForCollection(quiz.collectionId)
    const nextQuiz = createQuiz(pool, { collectionId: quiz.collectionId, roundLength: quiz.baseQuestionCount, repeatMistakes: quiz.repeatMistakes })
    saveQuizSession(nextQuiz)
    setQuiz(nextQuiz)
  }

  if (quiz === undefined) {
    return <div className="flag-page"><div className="fq-loading"><span>◉</span>Flaggen werden sortiert …</div></div>
  }

  if (!quiz || !flag || options.length < 4) {
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

  return (
    <div className="flag-page flag-page--game">
      <AppHeader variant="dark" backLabel="Sammlungen" backTo="/flaggen" />
      <main className="fq-game-shell">
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

        <section className={`fq-question-card ${answered ? (latestAnswer.correct ? 'is-correct' : 'is-wrong') : ''}`}>
          <div className="fq-question-copy">
            <span className="fq-kicker">{question.repeated ? 'Wiederholung · Welche Flagge ist das?' : 'Welche Flagge ist das?'}</span>
            <h1>{answered ? flag.name : 'Schau genau hin.'}</h1>
            <p>{answered ? `${flag.code} · ${collection.shortTitle ?? collection.title}` : 'Wähle die passende Antwort.'}</p>
            {answered ? <RegionLocation flag={flag} /> : null}
          </div>
          <div className="fq-flag-stage">
            <span className="fq-flag-stage__pin fq-flag-stage__pin--one" aria-hidden="true" />
            <span className="fq-flag-stage__pin fq-flag-stage__pin--two" aria-hidden="true" />
            <FlagPicture flag={flag} revealed={answered} />
          </div>
        </section>

        <section className="fq-answer-area" aria-label="Antwortmöglichkeiten">
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

          <div className={`fq-feedback ${answered ? 'is-visible' : ''}`} aria-live="polite">
            {answered ? (
              <>
                <div>
                  <SparkIcon size={21} />
                  <p><strong>{latestAnswer.correct ? 'Richtig erkannt!' : 'Fast – jetzt sitzt sie besser.'}</strong><span>{latestAnswer.correct ? `+${100 + Math.min(quiz.streak - 1, 10) * 15} Punkte` : `Die richtige Antwort ist ${flag.name}.${quiz.repeatMistakes ? ' Sie kommt später noch einmal.' : ''}`}</span></p>
                </div>
                <button data-fq-next onClick={next} type="button">{quiz.questionIndex === quiz.questions.length - 1 ? 'Ergebnis ansehen' : 'Nächste Flagge'} <ArrowRightIcon size={21} /></button>
              </>
            ) : <span className="fq-keyhint">Tipp: Antworte auch mit den Tasten 1–4.</span>}
          </div>
        </section>
      </main>
    </div>
  )
}
