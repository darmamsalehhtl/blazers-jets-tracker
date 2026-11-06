# Proposal

## Why

The tracker shows each team's division and conference standings, but not the question that matters from November on: if the season ended today, who is in, who plays whom, and how far are the Jets and Blazers from a spot? When the playoffs start, there is no place to follow the bracket either.

## What Changes

- New **Playoffs** page in the main navigation, with an NFL / NBA switch kept in the URL (same pattern as the MVP page).
- **Regular season**: the playoff picture "if the season ended today", per conference:
  - Seeds in order. NFL: seeds 1–7, with seeds 1–4 marked as division leaders and the 1 seed's bye. NBA: seeds 1–6 in, 7–10 in the play-in, the rest out.
  - A visible cut line under the last playoff seed (and under the last play-in seed in the NBA).
  - Clinched and eliminated markers from ESPN (division, playoff spot, bye / top seed, play-in, eliminated).
  - Games back of the last playoff spot (and of the play-in for NBA teams below it) for every team outside, and lead over the first team out for teams inside.
  - Games left and remaining strength of schedule (average win % of remaining opponents) for each team.
  - Projected first-round matchups from the current seeds (NBA play-in shown as 7 v 8 and 9 v 10).
  - The Jets and Blazers rows highlighted, with a one-line summary of where they stand.
- **Postseason** (from the first playoff or play-in game until the next regular season starts): a bracket per league. NFL: Wild Card, Divisional, Conference, Super Bowl games. NBA: play-in games, then best-of-7 series per round with series score. Live games show their score and refresh every 20 s.
- Spoiler mode: seeds, records, clinch markers, games back and finished bracket results are hidden while spoilers are off, replaced by the usual note with a button to show spoilers. Live games always show their score.
- The header gets one more entry; on phones the Draft tab becomes icon-only (like Calendar) so everything still fits at ~390 px.
- `scripts/build-data.mjs` gains a `playoffs` file: every team's remaining regular-season opponents and the current/last postseason's games, so the browser does not need dozens of schedule requests.

Out of scope: playoff probabilities / simulations, a "what if" picker for upcoming games, full tiebreaker explanations (ESPN's seed order is taken as-is).

## Capabilities

### New Capabilities
- `playoff-picture`: the Playoffs page — regular-season seeding and race per conference, projected matchups, and the postseason bracket for the NFL and NBA.

### Modified Capabilities
- `spoiler-mode`: the "Other results hidden" list gains the Playoffs page's seeding and bracket results.

## Impact

- New: `src/pages/PlayoffsPage.tsx`, `src/lib/playoffs.ts`, playoff components under `src/components/playoffs/`.
- Changed: `src/App.tsx` (route `/playoffs`), `src/components/Layout.tsx` (nav entry, Draft icon on phones), `src/lib/standings.ts` (shared helpers if needed).
- Build: `scripts/build-data.mjs` gets `buildPlayoffs` writing `public/data/playoffs.json`; CI already runs the script on push and every 3 hours.
- Data: ESPN standings (`level=2`, already used) and scoreboard (for live postseason games); no new external sources.
