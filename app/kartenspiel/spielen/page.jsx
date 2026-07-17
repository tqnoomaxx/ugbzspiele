'use client'

import dynamic from 'next/dynamic'

const CardGamePage = dynamic(() => import('../../../src/pages/CardGamePage.jsx'), {
  ssr: false,
  loading: () => <main className="route-loader"><span className="route-loader__mark">UGBZ</span></main>,
})

export default function CardGameRoute() {
  return <CardGamePage />
}
