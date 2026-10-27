import { createContext, createElement, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

// Spoiler mode: while `show` is false, finished games hide their score and
// result unless revealed one by one. Off by default; both the switch and the
// revealed games are remembered on this device.

const SHOW_KEY = 'spoilers'
const REVEALED_KEY = 'revealedGames'
const MAX_REVEALED = 300

/** Enough of a game to decide whether its result may be shown. */
export interface GameRef {
  id: string
  state?: string
}

interface SpoilerState {
  /** Spoilers on: every result is shown. */
  show: boolean
  toggle: () => void
  reveal: (id: string) => void
  /** Pre and live games always; finished games only with spoilers on or once revealed. */
  canShow: (game: GameRef) => boolean
}

function load<T>(key: string, parse: (raw: string) => T, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : parse(raw)
  } catch {
    return fallback
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Private mode etc. — the setting still works for this visit.
  }
}

function parseRevealed(raw: string): string[] {
  const v: unknown = JSON.parse(raw)
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

const SpoilerContext = createContext<SpoilerState | null>(null)

export function SpoilerProvider({ children }: { children: ReactNode }) {
  const [show, setShow] = useState(() => load(SHOW_KEY, (r) => r === 'on', false))
  const [revealed, setRevealed] = useState<string[]>(() => load(REVEALED_KEY, parseRevealed, []))

  const toggle = useCallback(() => {
    setShow((s) => {
      save(SHOW_KEY, s ? 'off' : 'on')
      return !s
    })
  }, [])

  const reveal = useCallback((id: string) => {
    setRevealed((list) => {
      if (list.includes(id)) return list
      const next = [...list, id].slice(-MAX_REVEALED)
      save(REVEALED_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo<SpoilerState>(() => {
    const set = new Set(revealed)
    return { show, toggle, reveal, canShow: (g) => show || g.state !== 'post' || set.has(g.id) }
  }, [show, revealed, toggle, reveal])

  return createElement(SpoilerContext.Provider, { value }, children)
}

export function useSpoilers(): SpoilerState {
  const ctx = useContext(SpoilerContext)
  if (!ctx) throw new Error('useSpoilers needs a SpoilerProvider')
  return ctx
}
