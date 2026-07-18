import { appPath } from '../basePath.js'

export const games = [
  {
    id: 'card-game',
    title: 'Kartenspiel',
    description: 'Stiche ansagen, Runden werten, Spielstand behalten.',
    path: appPath('/kartenspiel'),
    artwork: appPath('/assets/cards-on-felt.webp'),
    available: true,
  },
  {
    id: 'doppelwort',
    title: 'Doppelwort',
    description: 'Hinweise geben, das andere Wort wittern und Imposter enttarnen.',
    path: appPath('/doppelwort'),
    artwork: appPath('/assets/doppelwort-table.webp'),
    available: true,
    theme: 'night',
  },
]
