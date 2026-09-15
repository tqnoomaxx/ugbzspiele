import { describe, expect, it } from 'vitest'
import { advanceQuiz, answerQuestion, createQuiz, getQuizResult } from './gameEngine.js'

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
})
