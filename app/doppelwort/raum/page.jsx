'use client'

import dynamic from 'next/dynamic'

const DoppelwortRoomPage = dynamic(() => import('../../../src/pages/DoppelwortRoomPage.jsx'), {
  ssr: false,
  loading: () => <main className="route-loader"><span className="route-loader__mark">Doppelwort</span></main>,
})

export default function DoppelwortRoomRoute() {
  return <DoppelwortRoomPage />
}
