// NBA shot geometry. ESPN shot coordinates are in feet on a half court:
// x 0–50 across, y measured from the basket (≈0) toward half court (≈47).

export interface Shot {
  x: number
  y: number
  made: boolean
  points: 2 | 3
  teamId?: string
  playerId?: string
  text?: string
  period?: number
  clock?: string
}

export type Zone = 'Restricted area' | 'Paint' | 'Mid-range' | 'Corner 3' | 'Above-break 3'
export const ZONES: Zone[] = ['Restricted area', 'Paint', 'Mid-range', 'Corner 3', 'Above-break 3']

const BASKET = { x: 25, y: 0 }

export function distance(s: Pick<Shot, 'x' | 'y'>) {
  return Math.hypot(s.x - BASKET.x, s.y - BASKET.y)
}

export function zoneOf(s: Shot): Zone {
  if (s.points === 3) return s.y < 9 ? 'Corner 3' : 'Above-break 3'
  if (distance(s) <= 4.5) return 'Restricted area'
  if (Math.abs(s.x - 25) <= 8 && s.y <= 14) return 'Paint'
  return 'Mid-range'
}

export function zoneSplits(shots: Shot[]) {
  return ZONES.map((zone) => {
    const z = shots.filter((s) => zoneOf(s) === zone)
    const made = z.filter((s) => s.made).length
    return { zone, made, att: z.length, pct: z.length ? made / z.length : NaN, share: shots.length ? z.length / shots.length : 0 }
  })
}

interface RawPlay {
  shootingPlay?: boolean
  pointsAttempted?: number
  coordinate?: { x: number; y: number }
  scoringPlay?: boolean
  team?: { id: string }
  participants?: { athlete: { id: string } }[]
  text?: string
  period?: { number: number }
  clock?: { displayValue: string }
}

/** Field-goal attempts from ESPN plays (free throws carry junk coordinates). */
export function shotsFromPlays(plays: RawPlay[]): Shot[] {
  const out: Shot[] = []
  for (const p of plays) {
    if (!p.shootingPlay || !p.coordinate) continue
    if (p.pointsAttempted !== 2 && p.pointsAttempted !== 3) continue
    const { x, y } = p.coordinate
    if (x < -5 || x > 55 || y < -5 || y > 94) continue
    out.push({
      x,
      y,
      made: !!p.scoringPlay,
      points: p.pointsAttempted,
      teamId: p.team?.id,
      playerId: p.participants?.[0]?.athlete.id,
      text: p.text,
      period: p.period?.number,
      clock: p.clock?.displayValue,
    })
  }
  return out
}
