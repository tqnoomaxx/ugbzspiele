const STORAGE_KEY = 'ugbz:flaggenkunde:progress:v1'
const SESSION_KEY = 'ugbz:flaggenkunde:quiz:v1'

const emptyProgress = () => ({ version: 1, stats: {} })

export function loadFlagProgress() {
  if (typeof window === 'undefined') return emptyProgress()
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    return parsed?.version === 1 && parsed.stats && typeof parsed.stats === 'object' ? parsed : emptyProgress()
  } catch {
    return emptyProgress()
  }
}

export function recordFlagAnswer(flagId, correct) {
  const progress = loadFlagProgress()
  const previous = progress.stats[flagId] ?? { attempts: 0, correct: 0, streak: 0 }
  const next = {
    ...progress,
    stats: {
      ...progress.stats,
      [flagId]: {
        attempts: previous.attempts + 1,
        correct: previous.correct + (correct ? 1 : 0),
        streak: correct ? previous.streak + 1 : 0,
        lastSeen: new Date().toISOString(),
      },
    },
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function isFlagMastered(stat) {
  return Boolean(stat && stat.correct >= 3 && stat.correct / stat.attempts >= 0.75)
}

export function getProgressSummary(progress, flags) {
  let seen = 0
  let mastered = 0
  for (const flag of flags) {
    const stat = progress.stats[flag.id]
    if (stat?.attempts) seen += 1
    if (isFlagMastered(stat)) mastered += 1
  }
  return { seen, mastered, total: flags.length }
}

export function saveQuizSession(quiz) {
  if (typeof window !== 'undefined') window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(quiz))
}

export function loadQuizSession() {
  if (typeof window === 'undefined') return null
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SESSION_KEY))
    return parsed?.version === 1 && Array.isArray(parsed.questions) ? parsed : null
  } catch {
    return null
  }
}
