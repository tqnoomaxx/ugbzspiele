export const FLAG_QUIZ_VERSION = 3

export const QUIZ_MODES = {
  CHOICE: 'choice',
  TYPE: 'type',
  REVERSE: 'reverse',
  MAP: 'map',
  EUROPE_MAP: 'europe-map',
  CAPITAL_COUNTRY: 'capital-country',
  COUNTRY_CAPITAL: 'country-capital',
  CITY_COUNTRY: 'city-country',
  CITY_NAME: 'city-name',
  CITY_REVERSE: 'city-reverse',
  LANDMARK_COUNTRY: 'landmark-country',
  LANDMARK_NAME: 'landmark-name',
}

export function shuffle(items, random = Math.random) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function optionAnswerKey(flag, quizMode) {
  if ([QUIZ_MODES.CAPITAL_COUNTRY, QUIZ_MODES.CITY_COUNTRY, QUIZ_MODES.LANDMARK_COUNTRY].includes(quizMode)) return flag.parent
  return flag.name ?? flag.id
}

function getDistractorPool(answer, pool, quizMode) {
  const answerKey = optionAnswerKey(answer, quizMode)
  const isDistinct = (flag) => flag.id !== answer.id && optionAnswerKey(flag, quizMode) !== answerKey && (!answer.visualKey || flag.visualKey !== answer.visualKey)
  const sameCollection = pool.filter((flag) => isDistinct(flag) && flag.collection === answer.collection)
  const sameContinent = pool.filter((flag) => isDistinct(flag) && flag.continent === answer.continent)
  const allOthers = pool.filter(isDistinct)
  return [...new Map([...sameCollection, ...sameContinent, ...allOthers].map((flag) => [optionAnswerKey(flag, quizMode), flag])).values()]
}

function makeQuestion(answer, pool, random, quizMode) {
  if (quizMode === QUIZ_MODES.TYPE || quizMode === QUIZ_MODES.MAP || quizMode === QUIZ_MODES.EUROPE_MAP) {
    return { flagId: answer.id }
  }
  const distractors = shuffle(getDistractorPool(answer, pool, quizMode), random).slice(0, 3)
  return {
    flagId: answer.id,
    optionIds: shuffle([answer, ...distractors], random).map((flag) => flag.id),
  }
}

export function createQuiz(flags, { collectionId = 'countries', roundLength = 20, repeatMistakes = false, quizMode = QUIZ_MODES.CHOICE, random = Math.random } = {}) {
  const needsOptions = ![QUIZ_MODES.TYPE, QUIZ_MODES.MAP, QUIZ_MODES.EUROPE_MAP].includes(quizMode)
  const minimum = needsOptions ? 4 : 1
  if (!Array.isArray(flags) || flags.length < minimum) throw new Error(needsOptions ? 'Für diesen Fragetyp werden mindestens vier Lernkarten benötigt.' : 'Für ein Quiz wird mindestens eine Lernkarte benötigt.')
  const requestedLength = roundLength === 'all' ? flags.length : Number(roundLength)
  const length = Math.max(1, Math.min(flags.length, Number.isFinite(requestedLength) ? requestedLength : 20))
  const selected = shuffle(flags, random).slice(0, length)

  return {
    version: FLAG_QUIZ_VERSION,
    collectionId,
    quizMode,
    repeatMistakes,
    phase: 'question',
    questionIndex: 0,
    questions: selected.map((flag) => makeQuestion(flag, flags, random, quizMode)),
    baseQuestionCount: selected.length,
    repeatCount: 0,
    answers: [],
    score: 0,
    streak: 0,
    bestStreak: 0,
    startedAt: new Date().toISOString(),
  }
}

function finishAnswer(quiz, answer, random = Math.random, allowRepeat = true) {
  const question = quiz.questions[quiz.questionIndex]
  const correct = answer.correct
  const nextStreak = correct ? quiz.streak + 1 : 0
  let questions = quiz.questions
  let repeatCount = quiz.repeatCount ?? 0
  if (!correct && quiz.repeatMistakes && allowRepeat) {
    const repeatedQuestion = {
      ...question,
      ...(question.optionIds ? { optionIds: shuffle(question.optionIds, random) } : {}),
      repeated: true,
      repeatNumber: (question.repeatNumber ?? 0) + 1,
    }
    const insertAt = Math.min(questions.length, quiz.questionIndex + 4)
    questions = [...questions.slice(0, insertAt), repeatedQuestion, ...questions.slice(insertAt)]
    repeatCount += 1
  }
  return {
    ...quiz,
    questions,
    repeatCount,
    phase: 'feedback',
    lastMapGuessId: null,
    answers: [...quiz.answers, { flagId: question.flagId, repeated: Boolean(question.repeated), ...answer }],
    score: quiz.score + (correct ? 100 + Math.min(quiz.streak, 10) * 15 : 0),
    streak: nextStreak,
    bestStreak: Math.max(quiz.bestStreak, nextStreak),
  }
}

export function answerQuestion(quiz, selectedId, random = Math.random) {
  if (quiz.phase !== 'question') return quiz
  const question = quiz.questions[quiz.questionIndex]
  if (!question?.optionIds?.includes(selectedId)) return quiz
  return finishAnswer(quiz, { selectedId, correct: question.flagId === selectedId }, random)
}

export function normalizeFlagAnswer(value = '') {
  return value.toLowerCase().replace(/ß/g, 'ss').normalize('NFKD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

export function answerTypedQuestion(quiz, response, expectedName, expectedCode, random = Math.random) {
  if (quiz.phase !== 'question' || typeof response !== 'string') return quiz
  const normalized = normalizeFlagAnswer(response)
  if (!normalized) return quiz
  const transliteratedName = expectedName.toLowerCase().replace(/[äöü]/g, (letter) => ({ ä: 'ae', ö: 'oe', ü: 'ue' })[letter])
  const correct = [expectedName, transliteratedName, expectedCode].some((name) => normalized === normalizeFlagAnswer(name))
  return finishAnswer(quiz, { selectedId: null, response: response.trim(), correct }, random)
}

export function answerMapGuess(quiz, selectedId) {
  if (quiz.phase !== 'question' || !selectedId) return quiz
  const question = quiz.questions[quiz.questionIndex]
  const correct = question.flagId === selectedId
  if (correct) return finishAnswer(quiz, { selectedId, correct: true, mapGuess: true }, Math.random, false)
  return {
    ...quiz,
    lastMapGuessId: selectedId,
    streak: 0,
    answers: [...quiz.answers, { flagId: question.flagId, selectedId, correct: false, mapGuess: true, repeated: Boolean(question.repeated) }],
  }
}

export function skipMapQuestion(quiz) {
  if (quiz.phase !== 'question' || quiz.quizMode !== QUIZ_MODES.EUROPE_MAP) return quiz
  return finishAnswer(quiz, { selectedId: null, correct: false, mapGuess: true, skipped: true }, Math.random, false)
}

export function advanceQuiz(quiz) {
  if (quiz.phase !== 'feedback') return quiz
  if (quiz.questionIndex >= quiz.questions.length - 1) {
    return { ...quiz, phase: 'complete', completedAt: new Date().toISOString() }
  }
  return { ...quiz, phase: 'question', questionIndex: quiz.questionIndex + 1 }
}

export function getQuizResult(quiz) {
  const correct = quiz.answers.filter((answer) => answer.correct).length
  const learned = new Set(quiz.answers.filter((answer) => answer.correct).map((answer) => answer.flagId)).size
  const firstAttempts = new Map()
  for (const answer of quiz.answers) {
    if (!firstAttempts.has(answer.flagId)) firstAttempts.set(answer.flagId, answer)
  }
  return {
    correct,
    incorrect: quiz.answers.length - correct,
    total: quiz.answers.length,
    baseTotal: quiz.baseQuestionCount ?? quiz.questions.length,
    learned,
    firstTryCorrect: [...firstAttempts.values()].filter((answer) => answer.correct).length,
    repeats: quiz.repeatCount ?? 0,
    accuracy: quiz.answers.length ? Math.round((correct / quiz.answers.length) * 100) : 0,
    mistakes: [...new Set(quiz.answers.filter((answer) => !answer.correct).map((answer) => answer.flagId))],
  }
}
