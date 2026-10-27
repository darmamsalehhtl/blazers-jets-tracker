import { useNbaLink, type GameRef } from '../../lib/nbaLink'

/** Finished NBA game → its NBA.com page (highlights, League Pass replay), in a new tab. */
export function NbaWatchLink({ comp, hidden }: { comp: GameRef; hidden: boolean }) {
  const { href, direct } = useNbaLink(comp)
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 hover:bg-surface-2"
    >
      <PlayIcon />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{direct ? 'Watch on NBA.com' : 'Find it on NBA.com'}</span>
        <span className="block text-xs text-muted">
          {direct ? 'Highlights and League Pass replay' : "Opens that day's games, tap this one for highlights and the replay"}
          {hidden && ' · NBA.com shows the final score'}
        </span>
      </span>
      <ExternalIcon />
    </a>
  )
}

function PlayIcon() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-por/10 text-por">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.8-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14z" />
      </svg>
    </span>
  )
}

function ExternalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  )
}
