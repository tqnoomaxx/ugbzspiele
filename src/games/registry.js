import { appPath } from '../basePath.js'

export const games = [
  {
    id: 'card-game',
    title: 'Kartenspiel',
    description: 'Stiche ansagen, Runden werten, Spielstand behalten.',
    path: appPath('/kartenspiel'),
    artwork: appPath('/assets/cards-on-felt.webp'),
    available: true,
    rooms: null,
    resumePath: appPath('/kartenspiel/spielen'),
  },
  {
    id: 'doppelwort',
    title: 'Imposter',
    description: 'Hinweise geben, bluffen und den Imposter enttarnen.',
    path: appPath('/imposter'),
    artwork: appPath('/assets/doppelwort-table.webp'),
    available: true,
    rooms: { gameKey: 'doppelwort', localFallback: true, realtime: true },
    theme: 'night',
    resumePath: appPath('/imposter/raum'),
  },
  {
    id: 'kniffel',
    title: 'Kniffel',
    description: 'Klassisch würfeln – komplett digital oder mit echtem Würfel und sicherem Punkteblock.',
    path: appPath('/kniffel'),
    artwork: appPath('/assets/kniffel-table.webp'),
    available: true,
    rooms: { gameKey: 'kniffel', localFallback: true, realtime: true },
    theme: 'wine',
    resumePath: appPath('/kniffel/spiel'),
  },
]
