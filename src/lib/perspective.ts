import type { Summary } from './summary'
import type { TeamConfig } from './teams'

export interface Perspective {
  home: boolean
  abbr: string
  name: string
  color: string
}

/**
 * Whose point of view charts like win probability take: our team when it's
 * playing, otherwise the home team (for other games on the Live tab).
 */
export function perspective(s: Summary, team: TeamConfig): Perspective {
  const comps = s.header.competitions[0].competitors
  const us = comps.find((c) => c.team.id === team.id)
  if (us) return { home: us.homeAway === 'home', abbr: team.abbr, name: team.nickname, color: team.color }
  const home = comps.find((c) => c.homeAway === 'home') ?? comps[0]
  return {
    home: true,
    abbr: home.team.abbreviation,
    name: home.team.name ?? home.team.shortDisplayName ?? home.team.abbreviation,
    color: home.team.color ? `#${home.team.color}` : 'var(--text)',
  }
}
