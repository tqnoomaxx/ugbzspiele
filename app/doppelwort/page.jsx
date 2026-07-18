'use client'

import dynamic from 'next/dynamic'

const DoppelwortLobbyPage = dynamic(() => import('../../src/pages/DoppelwortLobbyPage.jsx'), {
  ssr: false,
  loading: () => <main className="route-loader"><span className="route-loader__mark">Doppelwort</span></main>,
})

export default function DoppelwortLobbyRoute() {
  return <DoppelwortLobbyPage />
}
