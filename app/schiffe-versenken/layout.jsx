import '../../src/battleship.css'

export const metadata = {
  title: 'Schiffe versenken · UGBZ',
  description: 'Schiffe versenken lokal oder synchron auf zwei Geräten spielen.',
}

export const viewport = {
  themeColor: '#092a32',
  width: 'device-width',
  initialScale: 1,
}

export default function BattleshipLayout({ children }) {
  return children
}
