# Design

## Context

See proposal.md for the motivation, `specs/player-search/spec.md` for the search, and `specs/mvp-race/spec.md` for the MVP additions.

Current state that shapes the approach:
- `PlayerPage` (`/player/:team/:athleteId`) already works for any athlete in the league of `:team` (it fetches ESPN athlete endpoints by id). Its back link is hard-wired to `/team/{key}?tab=roster`.
- The MVP builder in `scripts/build-data.mjs` (`buildMvpNfl`, `buildMvpNba`) already computes a fully sorted pool (`out`) but only writes the top 10 and the best Jets/Blazers player. NFL players are keyed by nflverse gsis id and mapped to ESPN ids via `idMap`; NBA rows already use ESPN ids.
- ESPN team roster endpoints (`/teams/{id}/roster`) list every rostered player (NFL ~80 per team including practice squad/IR, NBA ~17). They return either a flat or a position-grouped `athletes` array.
- ESPN's search API (`site.web.api.espn.com/apis/common/v3/search`) allows CORS, but it returns retired players and needs a request per keystroke.

## Goals / Non-Goals

**Goals:**
- Instant, accent-insensitive search over every current player of the league, usable on a phone.
- One source of truth for MVP standing: the same build run produces the MVP page and every player's standing, so ranks always agree.

**Non-Goals:**
- Searching across both leagues at once, or searching teams, coaches, or historical players.
- Changing how the MVP score or eligibility works.
- Live updates of standings between builds (still every 3 hours).

## Decisions

### 1. Prebuilt per-league player index instead of ESPN live search
The build writes `public/data/players-nfl.json` and `public/data/players-nba.json`, built from all 32 / 30 ESPN team rosters (concurrency 8). Each row is compact:

```
{ id, name, pos, team, mvp: { rank, score, gap, atRisk? } | { reason } }
```

plus a header `{ available, season, ranked: N, leader, updatedAt }`. The size is roughly 2,600 NFL rows ≈ 150 KB (≈ 35 KB gzipped) and 520 NBA rows ≈ 30 KB.

- *Alternative:* the ESPN search API. Rejected: it returns retired and free-agent players (the spec excludes them), needs a network round trip per keystroke (the spec requires none), and gives no MVP standing.

### 2. MVP standing comes from the same ranking run
- `buildMvpNfl`/`buildMvpNba` additionally return `standings: Map<espnId, {rank, score, gap, atRisk}>` and the per-player volume figures used for reasons.
- A new `players` builder awaits the memoized MVP result (like `once()` for play-by-play), so `mvp.json` and `players-*.json` come from one computation.
- If the MVP part fails, the index is still written with every player's `mvp` set to `{ reason: 'MVP data unavailable' }`, and the header records the error.
- The file split keeps `mvp.json` small for the MVP page; only search and player pages load the index.

### 3. Not-ranked reasons, decided at build time
Checks are applied in this order, and the first that applies wins.

**NFL** (position from the ESPN roster):
1. Not QB/RB/FB/WR/TE → "Defenders, linemen and specialists aren't ranked"
2. No regular-season offensive plays → "No games this season"
3. QB below the dropback minimum → "Not enough dropbacks yet (41 of 84)"
4. RB/WR/TE below the touch minimum → "Not enough touches yet (20 of 56)"

Volumes come from the play-by-play accumulators via the gsis→ESPN map.

**NBA:**
1. No games → "No games this season"
2. Missed more than 17 team games → "Can't reach 65 games anymore"
3. Under 25 minutes per game → "Fewer than 25 minutes per game (18.3)"

A player who passes every check but is still missing from the pool (e.g. a team or position mismatch) gets the reason "Not in the MVP pool", so no player is left without a reason.

### 4. Matching on the client
- The name is normalized with Unicode NFD, combining marks are stripped, it is lowercased, and `.`, `'` and `-` are removed. The same is done to the query.
- Every query token must be a prefix of some name token, or the whole query a prefix of the joined name. That covers the spec examples: "josh al" matches Josh Allen, "doncic" matches Dončić.
- Results are scored in tiers:
  1. full-name prefix
  2. first query token is a prefix of the last name
  3. other matches

  Ties are broken by ranked before unranked, then by rank, then by name. Show 8; when more exist, show "N more, keep typing".
- Results appear from 2 characters on. Rows are memoized per query.

### 5. `PlayerSearch` component (ARIA combobox)
- `src/components/PlayerSearch.tsx` takes the league and team key and is rendered in `TeamPage` above `Tabs`.
- It uses `role="combobox"` with an `aria-activedescendant` listbox. Arrow keys move the selection, Enter opens it, and Escape or tapping outside closes the list.
- Choosing a player navigates to `/player/{teamKey}/{id}` and clears the input.
- The results panel is an absolutely positioned dropdown at full container width, so it can't cause horizontal scroll.
- The index is loaded lazily on first focus of the input, so the team page doesn't pay the cost up front.

### 6. Player page: MVP standing card and a real back link
- **Standing card:** `PlayerPage` loads the same index for its league (cached by `useDataFile`) and shows the card next to the bio header.
  - Ranked player: "#rank of N · score · −gap", plus the at-risk tag where it applies.
  - Unranked player: "Not ranked: reason".
  - Data unavailable: a short "unavailable" note.
  - The card links to `/mvp?league=…`.
- **Back link:** it becomes "← Back". When React Router's `location.key !== 'default'` it calls `navigate(-1)`; otherwise it links to `/team/{key}`.

## Risks / Trade-offs

- **ESPN roster shape varies between leagues** (flat vs grouped `athletes`) → handle both shapes. If any team fails, retry it, and record the missing teams in the header rather than failing the whole league.
- **Some nflverse players have no ESPN id mapping** → ranked players without a mapping can't attach to a roster row. Mitigation: fall back to a normalized name + team match. Unmatched players get "Not in the MVP pool". Log the count in the build so it can be spotted.
- **Roster changes between builds** (trades, cuts) → the index is at most 3 hours old. The player page itself still shows live ESPN data.
- **Index size on slow phone connections** → lazy load on first focus, served gzipped by GitHub Pages and cached by the existing NetworkFirst `/data/` rule.
- **Two files must agree** → both are written in the same build run from the same in-memory ranking. The integration task verifies that the top 10 in `mvp.json` match ranks 1–10 in the index.

## Migration Plan

Additive. New data files, a component, and a card. The only change to existing behavior is the player page's back link text and target. Rollback is reverting the commits.
