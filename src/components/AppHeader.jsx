import { Link } from 'react-router-dom'
import { ArrowLeftIcon, HomeIcon } from './Icons.jsx'

export default function AppHeader({ variant = 'light', backTo, backLabel = 'Zurück', home = false }) {
  return (
    <header className={`app-header app-header--${variant}`}>
      <div className="app-header__inner">
        <Link className="brand" to="/" aria-label="UGBZ Startseite">UGBZ</Link>
        {backTo ? (
          <Link className="header-link" to={backTo}>
            <ArrowLeftIcon size={21} />
            <span>{backLabel}</span>
          </Link>
        ) : null}
        {home ? (
          <Link className="header-link" to="/">
            <HomeIcon size={21} />
            <span>Home</span>
          </Link>
        ) : null}
      </div>
    </header>
  )
}
