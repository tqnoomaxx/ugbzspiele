import { describe, expect, it } from 'vitest'
import { advanceQuiz, answerMapGuess, answerQuestion, answerTypedQuestion, createQuiz, getQuizResult, normalizeFlagAnswer, QUIZ_MODES, skipMapQuestion } from './gameEngine.js'
import { getFlagsForCollection } from './catalog.js'

const flags = Array.from({ length: 6 }, (_, index) => ({
  id: `flag-${index}`,
  collection: 'test',
  continent: 'europe',
}))

describe('Flaggenkunde-Spielengine', () => {
  it('erstellt eindeutige Fragen mit vier Antwortmöglichkeiten', () => {
    const quiz = createQuiz(flags, { roundLength: 4, random: () => 0.3 })
    expect(quiz.questions).toHaveLength(4)
    expect(new Set(quiz.questions.map((question) => question.flagId)).size).toBe(4)
    for (const question of quiz.questions) {
      expect(question.optionIds).toHaveLength(4)
      expect(new Set(question.optionIds).size).toBe(4)
      expect(question.optionIds).toContain(question.flagId)
    }
  })

  it('wertet Antworten, Serien und das Ergebnis nachvollziehbar aus', () => {
    let quiz = createQuiz(flags, { roundLength: 2, random: () => 0.2 })
    quiz = answerQuestion(quiz, quiz.questions[0].flagId)
    expect(quiz.score).toBe(100)
    expect(quiz.streak).toBe(1)
    quiz = advanceQuiz(quiz)
    const wrong = quiz.questions[1].optionIds.find((id) => id !== quiz.questions[1].flagId)
    quiz = answerQuestion(quiz, wrong)
    quiz = advanceQuiz(quiz)
    expect(quiz.phase).toBe('complete')
    expect(getQuizResult(quiz)).toMatchObject({ correct: 1, incorrect: 1, total: 2, accuracy: 50 })
  })

  it('setzt nie zwei optisch identische Flaggen in dieselbe Auswahl', () => {
    const withAlias = flags.map((flag, index) => ({ ...flag, visualKey: index < 2 ? 'gleich' : `motiv-${index}` }))
    const quiz = createQuiz(withAlias, { roundLength: 'all', random: () => 0.4 })
    for (const question of quiz.questions) {
      const answer = withAlias.find((flag) => flag.id === question.flagId)
      const optionKeys = question.optionIds.map((id) => withAlias.find((flag) => flag.id === id).visualKey)
      expect(optionKeys.filter((key) => key === answer.visualKey)).toHaveLength(1)
    }
  })

  it('legt falsche Flaggen später erneut vor und schließt erst nach der richtigen Wiederholung ab', () => {
    let quiz = createQuiz(flags, { roundLength: 2, repeatMistakes: true, random: () => 0.2 })
    const firstFlagId = quiz.questions[0].flagId
    const wrong = quiz.questions[0].optionIds.find((id) => id !== firstFlagId)

    quiz = answerQuestion(quiz, wrong, () => 0.4)
    expect(quiz.questions).toHaveLength(3)
    expect(quiz.questions[2]).toMatchObject({ flagId: firstFlagId, repeated: true, repeatNumber: 1 })
    expect(quiz.repeatCount).toBe(1)

    quiz = advanceQuiz(quiz)
    quiz = answerQuestion(quiz, quiz.questions[1].flagId)
    quiz = advanceQuiz(quiz)
    expect(quiz.questions[2].flagId).toBe(firstFlagId)
    quiz = answerQuestion(quiz, firstFlagId)
    quiz = advanceQuiz(quiz)

    expect(quiz.phase).toBe('complete')
    expect(getQuizResult(quiz)).toMatchObject({ baseTotal: 2, learned: 2, incorrect: 1, repeats: 1, total: 3 })
  })

  it('wiederholt eine erneut falsch beantwortete Flagge so lange, bis sie sitzt', () => {
    let quiz = createQuiz(flags, { roundLength: 1, repeatMistakes: true, random: () => 0.2 })
    const answerId = quiz.questions[0].flagId
    const wrong = quiz.questions[0].optionIds.find((id) => id !== answerId)

    quiz = advanceQuiz(answerQuestion(quiz, wrong, () => 0.3))
    quiz = advanceQuiz(answerQuestion(quiz, wrong, () => 0.3))
    expect(quiz.questions).toHaveLength(3)
    expect(quiz.questions[2]).toMatchObject({ repeated: true, repeatNumber: 2 })

    quiz = advanceQuiz(answerQuestion(quiz, answerId))
    expect(quiz.phase).toBe('complete')
    expect(getQuizResult(quiz)).toMatchObject({ baseTotal: 1, learned: 1, incorrect: 2, repeats: 2 })
  })

  it('wertet eingetippte Namen ohne Rücksicht auf Großschreibung und Akzente aus', () => {
    const namedFlags = flags.map((flag, index) => ({ ...flag, name: index === 0 ? 'Tucumán' : `Region ${index}`, code: `T-${index}` }))
    let quiz = createQuiz(namedFlags, { roundLength: 1, quizMode: QUIZ_MODES.TYPE, random: () => 0 })
    expect(quiz.questions[0].optionIds).toBeUndefined()
    quiz = answerTypedQuestion(quiz, 'tucuman', 'Tucumán', 'T-0')
    expect(quiz.answers.at(-1)).toMatchObject({ response: 'tucuman', correct: true })
    expect(normalizeFlagAnswer('  O’Higgins ')).toBe('o higgins')
  })

  it('lässt Kartenfehler offen und beendet die Aufgabe erst beim richtigen Gebiet', () => {
    let quiz = createQuiz(flags, { roundLength: 1, quizMode: QUIZ_MODES.MAP, random: () => 0 })
    const targetId = quiz.questions[0].flagId
    const wrongId = flags.find((flag) => flag.id !== targetId).id
    quiz = answerMapGuess(quiz, wrongId)
    expect(quiz).toMatchObject({ phase: 'question', lastMapGuessId: wrongId, streak: 0 })
    expect(quiz.answers.at(-1)).toMatchObject({ correct: false, mapGuess: true })
    quiz = answerMapGuess(quiz, targetId)
    expect(quiz.phase).toBe('feedback')
    quiz = advanceQuiz(quiz)
    expect(getQuizResult(quiz)).toMatchObject({ baseTotal: 1, learned: 1, incorrect: 1, total: 2 })
  })

  it('erzeugt für die umgekehrte Abfrage vier Flaggenoptionen', () => {
    const quiz = createQuiz(flags, { roundLength: 2, quizMode: QUIZ_MODES.REVERSE, random: () => 0.4 })
    expect(quiz.quizMode).toBe(QUIZ_MODES.REVERSE)
    expect(quiz.questions.every((question) => question.optionIds.length === 4)).toBe(true)
  })

  it('akzeptiert Umlautumschreibungen, ignoriert leere Eingaben und wiederholt falsche Namen', () => {
    const quiz = createQuiz(flags, { roundLength: 1, quizMode: QUIZ_MODES.TYPE, repeatMistakes: true })
    expect(answerTypedQuestion(quiz, '   ', 'Baden-Württemberg', 'DE-BW')).toBe(quiz)
    expect(answerTypedQuestion(quiz, 'Baden-Wuerttemberg', 'Baden-Württemberg', 'DE-BW').answers[0].correct).toBe(true)
    const wrong = answerTypedQuestion(quiz, 'Berlin', 'Baden-Württemberg', 'DE-BW')
    expect(wrong.questions[1]).toMatchObject({ flagId: quiz.questions[0].flagId, repeated: true })
    expect(wrong.questions[1].optionIds).toBeUndefined()
  })

  it('durchläuft im Hypermodus jedes Europa-Ziel genau einmal und endet erst nach allen Treffern', () => {
    const targets = getFlagsForCollection('europe-hyper')
    let quiz = createQuiz(targets, { collectionId: 'europe-hyper', quizMode: QUIZ_MODES.EUROPE_MAP, roundLength: 'all', random: () => 0.3 })
    expect(new Set(quiz.questions.map((question) => question.flagId)).size).toBe(targets.length)
    expect(quiz.questions.map((question) => question.flagId)).not.toEqual(targets.map((target) => target.id))
    for (let index = 0; index < targets.length; index += 1) {
      expect(quiz.phase).toBe('question')
      quiz = advanceQuiz(answerMapGuess(quiz, quiz.questions[index].flagId))
    }
    expect(quiz.phase).toBe('complete')
    expect(getQuizResult(quiz)).toMatchObject({ learned: targets.length, incorrect: 0, accuracy: 100 })
  })

  it('überspringt im Hypermodus ein Gebiet nachvollziehbar und geht danach weiter', () => {
    const targets = getFlagsForCollection('europe-hyper')
    let quiz = createQuiz(targets, { collectionId: 'europe-hyper', quizMode: QUIZ_MODES.EUROPE_MAP, roundLength: 2, random: () => 0 })
    quiz = skipMapQuestion(quiz)
    expect(quiz.phase).toBe('feedback')
    expect(quiz.answers.at(-1)).toMatchObject({ correct: false, skipped: true, mapGuess: true })
    quiz = advanceQuiz(quiz)
    expect(quiz).toMatchObject({ phase: 'question', questionIndex: 1 })
  })

  it('erlaubt kleine regionale Sammlungen in Eingabe- und Kartenmodi', () => {
    const single = [flags[0]]
    expect(createQuiz(single, { quizMode: QUIZ_MODES.TYPE, roundLength: 'all' }).questions).toHaveLength(1)
    expect(createQuiz(single, { quizMode: QUIZ_MODES.MAP, roundLength: 'all' }).questions).toHaveLength(1)
    expect(() => createQuiz(single, { quizMode: QUIZ_MODES.CHOICE })).toThrow(/mindestens vier/)
  })

  it('erstellt eindeutige Länderantworten für Städte- und Welterbequizze', () => {
    for (const [collectionId, quizMode] of [['cities-world', QUIZ_MODES.CITY_COUNTRY], ['heritage-world', QUIZ_MODES.LANDMARK_COUNTRY]]) {
      const items = getFlagsForCollection(collectionId)
      const quiz = createQuiz(items, { collectionId, quizMode, roundLength: 10, random: () => 0.37 })
      for (const question of quiz.questions) {
        const parents = question.optionIds.map((id) => items.find((item) => item.id === id).parent)
        expect(new Set(parents).size).toBe(4)
      }
    }
  })
})
