// Thin wrappers around ESPN's public (undocumented) JSON endpoints.
// Every URL here is fetched straight from the browser; ESPN sends
// `Access-Control-Allow-Origin: *` on all of them.

import type { TeamConfig } from './teams'

const SITE = 'https://site.api.espn.com/apis/site/v2/sports'
const SITE_V2 = 'https://site.api.espn.com/apis/v2/sports'
const WEB = 'https://site.web.api.espn.com/apis/common/v3/sports'
const CORE = 'https://sports.core.api.espn.com/v2/sports'

const path = (t: TeamConfig) => `${t.sport}/${t.league}`

export const urls = {
  /** `dates` (YYYYMMDD, ESPN's US Eastern game day) picks a day; omitted = ESPN's current slate. */
  scoreboard: (t: TeamConfig, dates?: string) => `${SITE}/${path(t)}/scoreboard${qs({ dates })}`,
  schedule: (t: TeamConfig, seasonType?: number, season?: number) =>
    `${SITE}/${path(t)}/teams/${t.id}/schedule${qs({ seasontype: seasonType, season })}`,
  summary: (t: TeamConfig, eventId: string) => `${SITE}/${path(t)}/summary?event=${eventId}`,
  roster: (t: TeamConfig) => `${SITE}/${path(t)}/teams/${t.id}/roster`,
  teamStats: (t: TeamConfig) => `${SITE}/${path(t)}/teams/${t.id}/statistics`,
  injuries: (t: TeamConfig) => `${SITE}/${path(t)}/teams/${t.id}/injuries`,
  news: (t: TeamConfig) => `${SITE}/${path(t)}/news?team=${t.id}&limit=30`,
  standings: (t: TeamConfig, season?: number, level?: number) => `${SITE_V2}/${path(t)}/standings${qs({ season, level })}`,
  coreTeamStats: (t: TeamConfig, season: number, seasonType: number) =>
    `${CORE}/${t.sport}/leagues/${t.league}/seasons/${season}/types/${seasonType}/teams/${t.id}/statistics`,
  athlete: (t: TeamConfig, id: string) => `${WEB}/${path(t)}/athletes/${id}`,
  athleteStats: (t: TeamConfig, id: string) => `${WEB}/${path(t)}/athletes/${id}/stats`,
  athleteGamelog: (t: TeamConfig, id: string, season?: number) =>
    `${WEB}/${path(t)}/athletes/${id}/gamelog${qs({ season })}`,
  athleteSplits: (t: TeamConfig, id: string, season?: number, category?: string) =>
    `${WEB}/${path(t)}/athletes/${id}/splits${qs({ season, category })}`,
}

function qs(params: Record<string, string | number | undefined>) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  if (!entries.length) return ''
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')
}

export async function getJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, cache: 'no-store' })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

// ---------- Shared response shapes (only the fields the app reads) ----------

export interface Logo {
  href: string
}

export interface TeamRef {
  id: string
  abbreviation: string
  displayName: string
  shortDisplayName?: string
  name?: string
  nickname?: string
  location?: string
  color?: string
  alternateColor?: string
  logo?: string
  logos?: Logo[]
}

export interface StatusType {
  name: string
  state: 'pre' | 'in' | 'post'
  completed: boolean
  description: string
  detail: string
  shortDetail: string
}

export interface Status {
  clock?: number
  displayClock?: string
  period?: number
  type: StatusType
}

export type Score = string | { value?: number; displayValue: string }

export interface Competitor {
  id: string
  homeAway: 'home' | 'away'
  winner?: boolean
  team: TeamRef
  score?: Score
  linescores?: { displayValue?: string; value?: number }[]
  record?: { type?: string; summary?: string; displayValue?: string }[] | string
  records?: { type?: string; summary?: string }[]
  possession?: boolean
}

export interface Competition {
  id: string
  date: string
  venue?: { fullName: string; address?: { city?: string; state?: string } }
  competitors: Competitor[]
  status: Status
  broadcasts?: { media?: { shortName?: string }; names?: string[] }[]
  situation?: Situation
  notes?: { headline?: string }[]
}

export interface Situation {
  downDistanceText?: string
  shortDownDistanceText?: string
  possessionText?: string
  possession?: string
  isRedZone?: boolean
  lastPlay?: { text?: string }
  homeTimeouts?: number
  awayTimeouts?: number
}

export interface EspnEvent {
  id: string
  date: string
  name: string
  shortName: string
  week?: { number: number; text?: string }
  seasonType?: { type: number; name: string; abbreviation?: string }
  competitions: Competition[]
}

export interface ScoreboardResponse {
  events: EspnEvent[]
}

export interface ScheduleResponse {
  season: { year: number; type: number; name: string; displayName: string }
  team: TeamRef & { recordSummary?: string; standingSummary?: string; seasonSummary?: string }
  events: EspnEvent[]
}

export interface AthleteRef {
  id: string
  displayName: string
  shortName?: string
  jersey?: string
  headshot?: Logo | string
  position?: { abbreviation: string; name?: string }
}

// ---------- Helpers ----------

export function scoreText(s?: Score): string {
  if (s === undefined) return ''
  return typeof s === 'string' ? s : s.displayValue
}

export function teamLogo(t: TeamRef): string | undefined {
  return t.logo ?? t.logos?.[0]?.href
}

/** Square-cropped ESPN headshot for an athlete id. */
export function faceUrl(league: string, id: string, size = 96) {
  return `https://a.espncdn.com/combiner/i?img=/i/headshots/${league}/players/full/${id}.png&w=${size}&h=${size}&scale=crop`
}

/** ESPN team logo by abbreviation (e.g. "nyj", "gs"). */
export function teamLogoByAbbr(league: string, abbr: string) {
  return `https://a.espncdn.com/i/teamlogos/${league}/500/${abbr.toLowerCase()}.png`
}

export function headshotUrl(h?: Logo | string): string | undefined {
  if (!h) return undefined
  return typeof h === 'string' ? h : h.href
}

export function recordText(c: Competitor): string | undefined {
  if (typeof c.record === 'string') return c.record
  const r = c.record?.find((x) => x.type === 'total') ?? c.record?.[0]
  if (r) return r.summary ?? r.displayValue
  return c.records?.find((x) => x.type === 'total')?.summary ?? c.records?.[0]?.summary
}

export function findTeamEvent(events: EspnEvent[] | undefined, teamId: string) {
  return events?.find((e) => e.competitions[0]?.competitors.some((c) => c.team.id === teamId))
}

export function sides(comp: Competition, teamId: string) {
  const us = comp.competitors.find((c) => c.team.id === teamId)!
  const them = comp.competitors.find((c) => c.team.id !== teamId)!
  return { us, them }
}

export const isLive = (e?: EspnEvent) => e?.competitions[0]?.status.type.state === 'in'
