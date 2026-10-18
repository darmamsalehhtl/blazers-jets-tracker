import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import GamePage from './pages/GamePage'
import Home from './pages/Home'
import PlayerPage from './pages/PlayerPage'
import TeamPage from './pages/TeamPage'

// Hash routing so deep links work on GitHub Pages without server rewrites.
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="team/:team" element={<TeamPage />} />
          <Route path="game/:team/:eventId" element={<GamePage />} />
          <Route path="player/:team/:athleteId" element={<PlayerPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
