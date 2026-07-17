import '../src/styles.css'

export const metadata = {
  title: 'UGBZ',
  description: 'UGBZ – der Spielstand für euren Spieleabend.',
  icons: {
    icon: '/icon.svg',
  },
}

export const viewport = {
  themeColor: '#0f3b2c',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  )
}
