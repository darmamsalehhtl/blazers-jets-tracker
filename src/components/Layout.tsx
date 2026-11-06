import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { ErrorBoundary } from './ErrorBoundary'
import { EyeIcon, EyeOffIcon } from './ui'
import { SpoilerProvider, useSpoilers } from '../lib/spoilers'
import { TEAM_ORDER, TEAMS } from '../lib/teams'
import { useTheme } from '../lib/theme'

export function Layout() {
  return (
    <SpoilerProvider>
      <Shell />
    </SpoilerProvider>
  )
}

function Shell() {
  const { theme, toggle } = useTheme()
  const spoilers = useSpoilers()
  const location = useLocation()
  return (
    <div className="mx-auto min-h-dvh max-w-5xl">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex h-14 items-center px-2 md:gap-2 md:px-4">
          <Link to="/" className="mr-auto flex shrink-0 items-center gap-2 font-semibold tracking-tight">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-7 w-7" />
            <span className="hidden md:inline">Tracker</span>
          </Link>
          <NavLink to="/live" className={navClass}>
            <span className="h-2 w-2 rounded-full bg-live" />
            Live
          </NavLink>
          {TEAM_ORDER.map((k) => (
            <NavLink key={k} to={`/team/${k}`} className={navClass}>
              {/* Logos only where there's room: every tab has to fit on a phone. */}
              <img src={TEAMS[k].logo} alt="" className="hidden h-5 w-5 object-contain md:block" />
              {TEAMS[k].nickname}
            </NavLink>
          ))}
          {/* Draft, Playoffs and Calendar are icons on phones: the header is full there. */}
          <NavLink to="/draft" aria-label="Draft" title="Draft" className={navClass}>
            <DraftIcon />
            <span className="hidden md:inline">Draft</span>
          </NavLink>
          <NavLink to="/playoffs" aria-label="Playoffs" title="Playoffs" className={navClass}>
            <TrophyIcon />
            <span className="hidden md:inline">Playoffs</span>
          </NavLink>
          <NavLink to="/mvp" className={navClass}>
            MVP
          </NavLink>
          <NavLink to="/calendar" aria-label="Calendar" title="Calendar" className={navClass}>
            <CalendarIcon />
            <span className="hidden md:inline">Calendar</span>
          </NavLink>
          <button
            onClick={spoilers.toggle}
            aria-pressed={spoilers.show}
            aria-label={spoilers.show ? 'Hide spoilers' : 'Show spoilers'}
            title={spoilers.show ? 'Spoilers on: scores shown' : 'Spoilers off: final scores hidden'}
            className={`flex h-9 w-7 shrink-0 min-[380px]:w-8 md:w-9 items-center justify-center rounded-lg hover:bg-surface-2 hover:text-text md:ml-1 ${
              spoilers.show ? 'text-text' : 'text-muted'
            }`}
          >
            {spoilers.show ? <EyeIcon /> : <EyeOffIcon />}
          </button>
          <button
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="flex h-9 w-7 shrink-0 min-[380px]:w-8 md:w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
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

const navClass = ({ isActive }: { isActive: boolean }) =>
  `flex shrink-0 items-center gap-1.5 rounded-lg px-1 py-1.5 text-sm font-medium min-[380px]:px-1.5 md:px-2.5 ${
    isActive ? 'bg-surface-2 text-text' : 'text-muted hover:text-text'
  }`

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:hidden">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  )
}

function DraftIcon() {
  // A numbered list: the draft order.
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:hidden">
      <path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
    </svg>
  )
}

function TrophyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="md:hidden">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
    </svg>
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
