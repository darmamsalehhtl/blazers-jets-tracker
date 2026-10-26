import { HashRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Layout } from './components/Layout'
import GamePage from './pages/GamePage'
import DraftPage from './pages/DraftPage'
import Home from './pages/Home'
import LivePage from './pages/LivePage'
import MvpPage from './pages/MvpPage'
import PlayerPage from './pages/PlayerPage'
import TeamPage from './pages/TeamPage'

// Hash routing so deep links work on GitHub Pages without server rewrites.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="live" element={<LivePage />} />
          <Route path="draft" element={<DraftPage />} />
          <Route path="mvp" element={<MvpPage />} />
          <Route path="team/:team" element={<Keyed by="team" page={TeamPage} />} />
          <Route path="game/:team/:eventId" element={<GamePage />} />
          <Route path="player/:team/:athleteId" element={<Keyed by="athleteId" page={PlayerPage} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

/** Remount a page when its route param changes, so no state leaks between teams/players. */
function Keyed({ by, page: Page }: { by: string; page: () => ReactNode }) {
  const params = useParams()
  return <Page key={params[by]} />
}
