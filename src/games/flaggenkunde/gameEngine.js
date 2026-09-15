export const FLAG_QUIZ_VERSION = 1

export function shuffle(items, random = Math.random) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[result[index], result[target]] = [result[target], result[index]]
  }
  return result
}

function getDistractorPool(answer, pool) {
  const isDistinct = (flag) => flag.id !== answer.id && (!answer.visualKey || flag.visualKey !== answer.visualKey)
  const sameCollection = pool.filter((flag) => isDistinct(flag) && flag.collection === answer.collection)
  const sameContinent = pool.filter((flag) => isDistinct(flag) && flag.continent === answer.continent)
  const allOthers = pool.filter(isDistinct)
  return [...new Map([...sameCollection, ...sameContinent, ...allOthers].map((flag) => [flag.id, flag])).values()]
}

function makeQuestion(answer, pool, random) {
  const distractors = shuffle(getDistractorPool(answer, pool), random).slice(0, 3)
  return {
    flagId: answer.id,
    optionIds: shuffle([answer, ...distractors], random).map((flag) => flag.id),
  }
}

export function createQuiz(flags, { collectionId = 'countries', roundLength = 20, random = Math.random } = {}) {
  if (!Array.isArray(flags) || flags.length < 4) throw new Error('Für ein Quiz werden mindestens vier Flaggen benötigt.')
  const requestedLength = roundLength === 'all' ? flags.length : Number(roundLength)
  const length = Math.max(1, Math.min(flags.length, Number.isFinite(requestedLength) ? requestedLength : 20))
  const selected = shuffle(flags, random).slice(0, length)

  return {
    version: FLAG_QUIZ_VERSION,
    collectionId,
    phase: 'question',
    questionIndex: 0,
    questions: selected.map((flag) => makeQuestion(flag, flags, random)),
    answers: [],
    score: 0,
    streak: 0,
    bestStreak: 0,
    startedAt: new Date().toISOString(),
  }
}

export function answerQuestion(quiz, selectedId) {
  if (quiz.phase !== 'question') return quiz
  const question = quiz.questions[quiz.questionIndex]
  if (!question?.optionIds.includes(selectedId)) return quiz
  const correct = question.flagId === selectedId
  const nextStreak = correct ? quiz.streak + 1 : 0
  return {
    ...quiz,
    phase: 'feedback',
    answers: [...quiz.answers, { flagId: question.flagId, selectedId, correct }],
    score: quiz.score + (correct ? 100 + Math.min(quiz.streak, 10) * 15 : 0),
    streak: nextStreak,
    bestStreak: Math.max(quiz.bestStreak, nextStreak),
  }
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
  return {
    correct,
    incorrect: quiz.answers.length - correct,
    total: quiz.questions.length,
    accuracy: quiz.answers.length ? Math.round((correct / quiz.answers.length) * 100) : 0,
    mistakes: quiz.answers.filter((answer) => !answer.correct).map((answer) => answer.flagId),
  }
}
