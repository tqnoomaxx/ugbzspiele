import { ArrowLeftIcon, HomeIcon } from './Icons.jsx'

export default function AppHeader({ variant = 'light', backTo, backLabel = 'Zurück', home = false }) {
  return (
    <header className={`app-header app-header--${variant}`}>
      <div className="app-header__inner">
        <a className="brand" href="/" aria-label="UGBZ Startseite">UGBZ</a>
        {backTo ? (
          <a className="header-link" href={backTo}>
            <ArrowLeftIcon size={21} />
            <span>{backLabel}</span>
          </a>
        ) : null}
        {home ? (
          <a className="header-link" href="/">
            <HomeIcon size={21} />
            <span>Home</span>
          </a>
        ) : null}
      </div>
    </header>
  )
}
