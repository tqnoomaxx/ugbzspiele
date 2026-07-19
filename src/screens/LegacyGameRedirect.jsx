'use client'

import { useEffect, useMemo } from 'react'
import { appPath } from '../basePath.js'
import AppHeader from '../components/AppHeader.jsx'

export default function LegacyGameRedirect({ target }) {
  const fallback = useMemo(() => appPath(target), [target])

  useEffect(() => {
    const destination = `${fallback}${window.location.search}${window.location.hash}`
    window.location.replace(destination)
  }, [fallback])

  return (
    <div className="dw-page">
      <AppHeader variant="dark" home />
      <main className="dw-missing-room">
        <span>Imposter hat einen neuen Namen</span>
        <h1>Du wirst zum aktuellen Spiel weitergeleitet.</h1>
        <p>Einladungscode und Link-Parameter bleiben dabei erhalten.</p>
        <a className="button button--primary" href={fallback}>Jetzt zu Imposter</a>
      </main>
    </div>
  )
}
