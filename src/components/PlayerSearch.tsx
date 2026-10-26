import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { faceUrl, teamLogoByAbbr } from '../lib/espn'
import { searchPlayers, type IndexedPlayer, type PlayerIndex } from '../lib/playerIndex'
import { useDataFile } from '../lib/seasonData'
import type { TeamConfig } from '../lib/teams'

/**
 * Search every current player in the team's league (Jets → NFL, Blazers → NBA).
 * The player list loads on first focus; matching runs locally as you type.
 */
export function PlayerSearch({ team }: { team: TeamConfig }) {
  const nav = useNavigate()
  const listId = useId()
  const box = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [wanted, setWanted] = useState(false)
  const [active, setActive] = useState(-1)
  const { data, error } = useDataFile<PlayerIndex>(wanted ? `players-${team.league}` : null)

  const result = useMemo(
    () => (data?.available ? searchPlayers(data.players, query) : { players: [], more: 0 }),
    [data, query],
  )
  const typed = query.trim().length >= 2
  const showList = open && typed

  // Close when tapping or clicking anywhere else.
  useEffect(() => {
    if (!showList) return
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [showList])

  const choose = (p: IndexedPlayer) => {
    setQuery('')
    setOpen(false)
    setActive(-1)
    input.current?.blur()
    nav(`/player/${team.key}/${p.id}`)
  }

  const onKey = (e: KeyboardEvent) => {
    const n = result.players.length
    if (e.key === 'ArrowDown' && n) {
      e.preventDefault()
      setOpen(true)
      setActive((i) => (i + 1) % n)
    } else if (e.key === 'ArrowUp' && n) {
      e.preventDefault()
      setActive((i) => (i <= 0 ? n - 1 : i - 1))
    } else if (e.key === 'Enter' && showList && n) {
      e.preventDefault()
      choose(result.players[Math.max(0, active)])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    }
  }

  const league = team.league.toUpperCase()
  return (
    <div ref={box} className="relative">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 focus-within:border-text">
        <SearchIcon />
        <input
          ref={input}
          type="search"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          value={query}
          placeholder={`Search ${league} players`}
          autoComplete="off"
          spellCheck={false}
          onFocus={() => {
            setWanted(true)
            setOpen(true)
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setActive(-1)
          }}
          onKeyDown={onKey}
          // 16px so iOS doesn't zoom in on focus.
          className="h-10 min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-muted sm:text-sm"
        />
      </div>

      {showList && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
          {error || (data && !data.available) ? (
            <p className="px-4 py-3 text-sm text-muted">Player search isn't available right now.</p>
          ) : !data ? (
            <p className="px-4 py-3 text-sm text-muted">Loading players…</p>
          ) : result.players.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted">No player found.</p>
          ) : (
            <>
              <ul id={listId} role="listbox" aria-label={`${league} players`}>
                {result.players.map((p, i) => (
                  <li
                    key={p.id}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onPointerEnter={() => setActive(i)}
                    onClick={() => choose(p)}
                    className={`flex cursor-pointer items-center gap-3 border-t border-border/60 px-3 py-2 first:border-0 ${
                      i === active ? 'bg-surface-2' : ''
                    }`}
                  >
                    <Face p={p} league={team.league} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{p.name}</div>
                      <div className="truncate text-xs text-muted">
                        {p.pos} · {p.team}
                      </div>
                    </div>
                    {p.mvp.rank ? (
                      <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] font-semibold tabular-nums">MVP #{p.mvp.rank}</span>
                    ) : (
                      <span className="shrink-0 text-[11px] text-muted" title={p.mvp.reason}>
                        Not ranked
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {result.more > 0 && (
                <p className="border-t border-border/60 px-3 py-1.5 text-[11px] text-muted">
                  {result.more} more, keep typing
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Face({ p, league }: { p: IndexedPlayer; league: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="relative h-9 w-9 shrink-0">
      {failed ? (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold">
          {p.name
            .split(' ')
            .map((w) => w[0])
            .slice(0, 2)
            .join('')}
        </div>
      ) : (
        <img src={faceUrl(league, p.id, 72)} alt="" loading="lazy" onError={() => setFailed(true)} className="h-9 w-9 rounded-full bg-surface-2 object-cover" />
      )}
      <img
        src={teamLogoByAbbr(league, p.team)}
        alt=""
        loading="lazy"
        className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full border border-border bg-surface object-contain"
      />
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-muted" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}
