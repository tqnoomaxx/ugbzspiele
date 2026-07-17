import { Link } from 'react-router-dom'
import AppHeader from '../components/AppHeader.jsx'
import { ArrowRightIcon, DoorIcon } from '../components/Icons.jsx'
import { games, roomFeature } from '../games/registry.js'

export default function HomePage() {
  const game = games[0]

  return (
    <div className="page page--home">
      <AppHeader />
      <main className="home-shell">
        <section className="home-intro" aria-labelledby="home-title">
          <h1 id="home-title">Was wird gespielt?</h1>
          <p>Wähle ein Spiel und leg direkt los.</p>
        </section>

        <Link className="game-feature" to={game.path}>
          <div className="game-feature__art" aria-hidden="true">
            <img src={game.artwork} alt="" />
          </div>
          <div className="game-feature__content">
            <h2>{game.title}</h2>
            <p>{game.description}</p>
            <span className="game-feature__action">
              Spiel öffnen
              <ArrowRightIcon size={23} />
            </span>
          </div>
        </Link>

        <section className="room-preview" aria-disabled="true">
          <span className="room-preview__icon"><DoorIcon size={34} /></span>
          <div>
            <h2>{roomFeature.title}</h2>
            <p>{roomFeature.description}</p>
          </div>
        </section>
      </main>
    </div>
  )
}
