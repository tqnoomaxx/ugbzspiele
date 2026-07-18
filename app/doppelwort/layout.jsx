import '../../src/doppelwort.css'

export const metadata = {
  title: 'Doppelwort · UGBZ',
  description: 'Das soziale Wortspiel mit Crew, Impostern und geheimen Hinweisen.',
}

export const viewport = {
  themeColor: '#06171b',
  width: 'device-width',
  initialScale: 1,
}

export default function DoppelwortLayout({ children }) {
  return children
}
