import '../../src/battleship.css'

export const metadata = {
  title: 'Schiffe versenken · UGBZ',
  description: 'Lokales Schiffe versenken mit sicherem Pass-and-play-Sichtschutz.',
}

export const viewport = {
  themeColor: '#092a32',
  width: 'device-width',
  initialScale: 1,
}

export default function BattleshipLayout({ children }) {
  return children
}
