export function createLocalGameRepository({ storageKey, validate, protectRevision = false }) {
  function inspect() {
    if (typeof window === 'undefined' || !window.localStorage) return { state: null, issue: null, raw: null }
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return { state: null, issue: null, raw: null }
    try {
      const state = JSON.parse(raw)
      return validate(state)
        ? { state, issue: null, raw: null }
        : { state: null, issue: 'corrupt', raw }
    } catch { return { state: null, issue: 'corrupt', raw } }
  }

  return {
    inspect,
    load: () => inspect().state,
    save(state) {
      if (typeof window === 'undefined' || !window.localStorage || !validate(state)) return false
      try {
        const stored = inspect().state
        if (protectRevision
          && stored?.id === state?.id
          && Number.isInteger(stored.revision)
          && Number.isInteger(state.revision)
          && stored.revision >= state.revision) return false
        window.localStorage.setItem(storageKey, JSON.stringify(state)); return true
      }
      catch { return false }
    },
    clear() {
      if (typeof window === 'undefined' || !window.localStorage) return false
      try { window.localStorage.removeItem(storageKey); return true }
      catch { return false }
    },
  }
}
