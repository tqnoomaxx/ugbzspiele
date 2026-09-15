import { describe, expect, it } from 'vitest'
import { getProgressSummary, isFlagMastered } from './progressRepository.js'

describe('Flaggenkunde-Lernfortschritt', () => {
  it('markiert eine Flagge erst nach wiederholt sicheren Antworten als gemeistert', () => {
    expect(isFlagMastered({ attempts: 2, correct: 2 })).toBe(false)
    expect(isFlagMastered({ attempts: 4, correct: 3 })).toBe(true)
    expect(isFlagMastered({ attempts: 5, correct: 3 })).toBe(false)
  })

  it('fasst gesehenen und gemeisterten Bestand je Sammlung zusammen', () => {
    const flags = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const progress = {
      stats: {
        a: { attempts: 4, correct: 3 },
        b: { attempts: 1, correct: 0 },
      },
    }
    expect(getProgressSummary(progress, flags)).toEqual({ seen: 2, mastered: 1, total: 3 })
  })
})
