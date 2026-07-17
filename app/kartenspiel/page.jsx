'use client'

import dynamic from 'next/dynamic'

const CardGameSetupPage = dynamic(() => import('../../src/pages/CardGameSetupPage.jsx'), {
  ssr: false,
  loading: () => <main className="route-loader"><span className="route-loader__mark">UGBZ</span></main>,
})

export default function CardGameSetupRoute() {
  return <CardGameSetupPage />
}
