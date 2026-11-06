# Design

## Context

- Standings already come live from ESPN (`urls.standings(team, season, level)`, `src/lib/standings.ts`). With `level=2` ESPN returns one node per conference whose entries carry `playoffseed` (1–16 NFL, 1–15 NBA), `clincher`, `wins`, `losses`, `ties`, `winpercent` and `gamesbehind`. Checked on 2026-11-06: seeds are filled for every team in both leagues; `clincher` is empty this early. The entries are not sorted by seed, so we sort by `playoffseed`.
- ESPN's scoreboard marks NBA play-in games with `season.type = 5` and a note like "NBA Play-In - East - 7th Place vs 8th Place"; playoff games have `season.type = 3`, a note like "East 1st Round - Game 3" and `competitions[0].series` with per-team `wins` and a summary. NFL postseason games come from `scoreboard?seasontype=3&week=1..5&dates=<season>` with notes like "AFC Wild Card Playoffs". Date-range scoreboard queries over the whole postseason return 400, so the full postseason needs one request per day or week.
- The Draft tab already derives strength of schedule from `public/data/draft.json` (each team's 17 opponents from nflverse). There is no league-wide NBA schedule in the build yet.
- Pages that switch leagues use `?league=` (MVP page). Results-hiding uses `useSpoilers()`, `SpoilerNote`, `canShow`.

## Goals / Non-Goals

**Goals:**
- One page, two league views, all derived from data sources the app already uses plus one new precomputed file.
- Seeding stays fully live (standings poll); only slow-changing inputs (remaining schedules, past postseason games) are precomputed.
- League rules (number of seeds, play-in, bye, rounds) are data in one place so the views stay generic.

**Non-Goals:**
- Recomputing seeds or tiebreakers ourselves; ESPN's `playoffseed` is the source of truth.
- Playoff odds, magic numbers, or a "what if" picker.
- Per-player playoff stats on this page (game pages already have them).

## Decisions

### 1. League rules as a config table
`src/lib/playoffs.ts` holds a `PLAYOFF_RULES` record per league: `seeds` (NFL 7, NBA 6), `playIn` (NBA seeds 7–10, NFL none), `byes` (NFL 1), `divisionLeaders` (NFL 4), first-round pairings and round names. Seeding, cut lines, projected matchups and bracket placeholders all read from it.
*Alternative*: `if (nfl)` branches in each component. Rejected: four places would encode the same rules.

### 2. Seeding from live conference standings
The page polls `urls.standings(TEAMS.nyj | TEAMS.por, undefined, 2)` with `IDLE_MS`, sorts each conference by `playoffseed`, and computes games back with the formula from the spec, using the record of the relevant cut-line team (last playoff seed, seed 10, or first team outside the tier). Clinch codes map to labels in one table (`z`/`*` top seed or bye, `y` division, `x` playoff spot, `pi` play-in, `e` eliminated), with unknown codes shown raw so nothing disappears.
*Alternative*: precompute seeding in the build. Rejected: it would be up to 3 hours stale, and standings are already a cheap browser request.

### 3. New `playoffs.json` from the build script
`buildPlayoffs` in `scripts/build-data.mjs` writes, per league:
- `remaining`: each team's remaining regular-season opponents (abbreviations, repeats kept) with game dates. NFL from the already-loaded nflverse schedule (games without scores). NBA from ESPN's per-team schedule endpoint (30 requests, pooled).
- `postseason`: the current or most recent postseason's games (id, date, round, conference, state, teams with seeds and scores, series wins). NFL from the 5 postseason scoreboard weeks; NBA from one scoreboard request per day across the play-in/playoff window, whose dates come from the scoreboard's `leagues[0].calendar`.
- `season` / `seasonLabel` and `available`/`error` like the other data files.

The client drops remaining games whose date has passed (so the 3-hour lag only matters for postponed games) and computes strength of schedule from the live standings' win percentages.
*Alternative*: fetch 30–32 team schedules in the browser. Rejected: too many requests per page view, and the build already runs every 3 hours.

### 4. Phase from the live scoreboard
The current scoreboard (`urls.scoreboard(team)`, the same URL the Live tab polls, so `usePoll` shares it) gives `leagues[0].season.type`. Types 3 and 5 → bracket. Type 2 → seeding. Types 1 and 4 → bracket of the most recent postseason from `playoffs.json`. A "Final seeding" toggle on the bracket view shows the seeding component (live standings still return the finished regular season during the postseason).

### 5. Bracket = precomputed games + live overlay
The bracket is built from `playoffs.json` postseason games, then events from the current scoreboard with season type 3 or 5 replace or add games by id. When any of them is live, the scoreboard poll uses `LIVE_MS`. NBA games group into series by unordered team pair within the postseason; series score comes from `competitions[0].series` of the latest game. Round and conference are parsed from the game note, with the date order as fallback. Undetermined slots are filled from `PLAYOFF_RULES` pairings ("Winner of 4 v 5").
Layout (revised after review, modelled on a printed playoff bracket): a real tree. From `lg` up, the West (NFL: AFC) flows left to right and the East (NFL: NFC) is mirrored on the right, both meeting at the final in the middle, with round titles above each column and drawn connector lines between rounds. Below it, the NBA play-in is drawn as its own small tree per conference (7 v 8 and 9 v 10 feeding the 8th-seed game). The NFL's 1 seed sits in the Wild Card column as a bye card. Each matchup is a compact card: logo, abbreviation with the seed under it, series wins (or the game score), and a marker on the winner. Tapping a card opens its games in a panel under the tree, which a live series opens by default. Below `lg` the mirrored tree doesn't fit, so one conference half is shown at a time (West/East switch), flowing left to right, with the final card below. Columns use equal-height cards spaced with `justify-around`, so each card's centre sits between the two it comes from, and connectors are percentage-based SVG paths. No horizontal page scroll at any width.

### 6. Spoilers
With spoilers off the seeding view and the bracket are replaced by `SpoilerNote`; live postseason games are listed above the note with their scores (same rule as the Live tab). With spoilers on everything shows; finished games in the bracket do not need per-game reveal because the whole view is gated.
*Alternative*: per-game `canShow` in the bracket. Rejected: the matchups of later rounds reveal earlier winners anyway.

### 7. Navigation
Add a `Playoffs` `NavLink` between Draft and MVP. On phones, Draft and Playoffs become icons like Calendar (`DraftIcon`, `TrophyIcon`, keeping `aria-label`/`title`), and the 2 px gap between header items goes away. Measured: making only Draft icon-only still overflowed by 28–49 px at 360–390 px. The header switches to text labels at `md` (768 px) instead of `sm`, because at 640–767 px the full header overflowed (by 19 px even before this change). Checked from 360 to 1024 px with no overflow.

## Risks / Trade-offs

- [ESPN changes clincher codes or note wording] → unknown codes are shown raw; round parsing falls back to date order within the conference.
- [`playoffseed` lags a game by a few minutes, or differs from official tiebreakers] → accepted; the page states that seeds follow ESPN.
- [NBA postseason day-by-day requests (~60) slow the build] → only run during and after the postseason window; otherwise reuse last result. Pool with the existing `pool()` helper.
- [Remaining opponents stale for up to 3 hours] → date filter on the client; postponed games are rare.
- [Header crowding on small phones] → Draft becomes icon-only; check 360 px as well and shrink padding if needed.
- [No past postseason for the very first build] → `available: false` with an error; the page shows the seeding or an empty state.

## Migration Plan

No migration. The new data file is generated by CI on the next push; the page handles a missing file. Rollback is reverting the commits.

## Open Questions

- Exact ESPN clincher codes for NBA play-in (`pi`?) only show up in March; confirm then and adjust the label table.
