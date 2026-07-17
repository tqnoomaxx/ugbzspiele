import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage.jsx'

const CardGameSetupPage = lazy(() => import('./pages/CardGameSetupPage.jsx'))
const CardGamePage = lazy(() => import('./pages/CardGamePage.jsx'))

function RouteLoader() {
  return (
    <main className="route-loader" aria-live="polite">
      <span className="route-loader__mark">UGBZ</span>
    </main>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/kartenspiel" element={<CardGameSetupPage />} />
        <Route path="/kartenspiel/spielen" element={<CardGamePage />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </Suspense>
  )
}
