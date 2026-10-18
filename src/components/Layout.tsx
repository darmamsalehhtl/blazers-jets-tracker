import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'
import { TEAM_ORDER, TEAMS } from '../lib/teams'
import { useTheme } from '../lib/theme'

export function Layout() {
  const { theme, toggle } = useTheme()
  const location = useLocation()
  return (
    <div className="mx-auto min-h-dvh max-w-5xl">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex h-14 items-center gap-2 px-4">
          <Link to="/" className="mr-auto flex items-center gap-2 font-semibold tracking-tight">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-7 w-7" />
            <span className="hidden sm:inline">Tracker</span>
          </Link>
          <NavLink
            to="/live"
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium ${isActive ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'}`
            }
          >
            <span className="h-2 w-2 rounded-full bg-live" />
            Live
          </NavLink>
          {TEAM_ORDER.map((k) => (
            <NavLink
              key={k}
              to={`/team/${k}`}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium ${
                  isActive ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'
                }`
              }
            >
              <img src={TEAMS[k].logo} alt="" className="h-5 w-5 object-contain" />
              {TEAMS[k].nickname}
            </NavLink>
          ))}
          <button
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>
      <main className="px-4 pt-4 pb-16">
        <ErrorBoundary resetKey={location.pathname + location.search}>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  )
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}
