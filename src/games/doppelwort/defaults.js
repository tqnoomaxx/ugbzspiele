export const MIN_PLAYERS = 3
export const MAX_PLAYERS = 12

export const DEFAULT_DOPPELWORT_OPTIONS = Object.freeze({
  imposterCount: 1,
  category: 'all',
  language: 'de',
  speakingSeconds: 30,
  meetingSeconds: 45,
  votingSeconds: 45,
  skipAllowed: true,
  hintsEnabled: true,
  visibility: 'private',
  passwordEnabled: false,
  maxPlayers: 8,
  autoNextRound: false,
  randomHostOnLeave: true,
  spectatorsAllowed: false,
  roundCount: 3,
  pointsEnabled: true,
  autoWordRotation: true,
})

export const DOPPELWORT_CATEGORIES = {
  de: [
    { id: 'all', label: 'Alle Kategorien' },
    { id: 'animals', label: 'Tiere' },
    { id: 'food', label: 'Essen' },
    { id: 'vehicles', label: 'Fahrzeuge' },
    { id: 'sports', label: 'Sport' },
    { id: 'jobs', label: 'Berufe' },
    { id: 'nature', label: 'Natur' },
    { id: 'social', label: 'Internet & Social Media' },
    { id: 'memes', label: 'Memes & Netzkultur' },
  ],
  en: [
    { id: 'all', label: 'All categories' },
    { id: 'animals', label: 'Animals' },
    { id: 'food', label: 'Food' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'sports', label: 'Sports' },
    { id: 'jobs', label: 'Jobs' },
    { id: 'nature', label: 'Nature' },
    { id: 'social', label: 'Internet & Social Media' },
    { id: 'memes', label: 'Memes & Internet Culture' },
  ],
}
