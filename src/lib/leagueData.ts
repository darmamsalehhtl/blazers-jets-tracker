// League-wide player data for the "vs League" scatter plots (scripts/build-data.mjs).

interface Base {
  /** ESPN athlete id (null when nflverse couldn't map it) */
  id: string | null
  name: string
  team: string
}

export interface NflPasserRow extends Base {
  db: number
  epa: number | null
  totalEpa: number | null
  success: number | null
  cpoe: number | null
  adot: number | null
  sackRate: number | null
  intRate: number | null
}
export interface NflReceiverRow extends Base {
  tgt: number
  rec: number
  yds: number
  tgtPerGame: number | null
  epa: number | null
  totalEpa: number | null
  success: number | null
  catchRate: number | null
  adot: number | null
  yac: number | null
  ypt: number | null
}
export interface NflRusherRow extends Base {
  car: number
  yds: number
  epa: number | null
  totalEpa: number | null
  success: number | null
  ypc: number | null
  explosive: number | null
}
export interface NflDefenderRow extends Base {
  pos: string
  gp: number
  tackles: number
  sacks: number
  tfl: number
  pd: number
  ints: number
  ff: number
}

export interface NflLeague {
  available: boolean
  error?: string
  updatedAt: string
  season: number
  weeks: number
  min: { dropbacks: number; targets: number; carries: number; tackles: number }
  passing: NflPasserRow[]
  receiving: NflReceiverRow[]
  rushing: NflRusherRow[]
  defense: NflDefenderRow[]
}

export interface NbaPlayerRow extends Base {
  pos: string
  gp: number
  mpg: number | null
  ppg: number | null
  rpg: number | null
  apg: number | null
  spg: number | null
  bpg: number | null
  tpg: number | null
  tpaPg: number | null
  fgaPg: number | null
  ts: number | null
  efg: number | null
  fgPct: number | null
  tpPct: number | null
  ftPct: number | null
  tpaRate: number | null
  ftr: number | null
  astTo: number | null
  pts36: number | null
  reb36: number | null
  ast36: number | null
  stl36: number | null
  blk36: number | null
  fga36: number | null
}

export interface NbaLeague {
  available: boolean
  error?: string
  updatedAt: string
  season: number
  seasonLabel: string
  isCurrent: boolean
  minGames: number
  players: NbaPlayerRow[]
}
