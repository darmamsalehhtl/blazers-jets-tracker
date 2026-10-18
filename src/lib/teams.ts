export type TeamKey = 'nyj' | 'por'
export type Sport = 'football' | 'basketball'
export type League = 'nfl' | 'nba'

export interface TeamConfig {
  key: TeamKey
  id: string
  abbr: string
  name: string
  nickname: string
  sport: Sport
  league: League
  /** CSS color token (see index.css) */
  color: string
  logo: string
}

export const TEAMS: Record<TeamKey, TeamConfig> = {
  nyj: {
    key: 'nyj',
    id: '20',
    abbr: 'NYJ',
    name: 'New York Jets',
    nickname: 'Jets',
    sport: 'football',
    league: 'nfl',
    color: 'var(--nyj)',
    logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png',
  },
  por: {
    key: 'por',
    id: '22',
    abbr: 'POR',
    name: 'Portland Trail Blazers',
    nickname: 'Blazers',
    sport: 'basketball',
    league: 'nba',
    color: 'var(--por)',
    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/por.png',
  },
}

/** Display order everywhere; also the priority when both teams are live. */
export const TEAM_ORDER: TeamKey[] = ['nyj', 'por']

export function isTeamKey(k: string | undefined): k is TeamKey {
  return k === 'nyj' || k === 'por'
}
