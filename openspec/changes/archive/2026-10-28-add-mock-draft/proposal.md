# Proposal

## Why

The Draft tab already shows the live 2027 NFL draft order with traded picks, but only which team picks where, not who they might take. A mock draft that fills each pick with a player who fits that team makes the page useful all season: it answers "who could the Jets get at their spot?" and updates as the standings move.

## What Changes

- The Draft tab fills every pick in the current live order with a prospect from ESPN's 2027 big board, picked automatically by the computer. There is no interactive drafting, and the user never picks.
- Each team's pick is "best available, adjusted for need". It blends the prospect's ESPN rank with that team's roster needs and how valuable the position is, and it can't reach too far past the board. A team that just filled a position doesn't take that position again.
- Team needs come from public data: unit performance from nflverse play-by-play, starter age and depth from ESPN rosters and depth charts, and recent early-round picks from nflverse draft history. Each team's top needs are shown.
- Each pick row shows the player (name, position, college logo) under the team. Tapping a row shows ESPN's rank, size, a scouting note, and why the pick fits ("Top need: CB · #6 on ESPN's board").
- The Jets picks card lists the player mocked at each Jets pick.
- The mock is deterministic. It changes only when the draft order, the prospect board or the team needs change, not on every reload.
- Picks are filled only as far as ESPN's board reaches. ESPN has about 50 prospects in October, which covers round 1. Later picks show that the board doesn't reach them yet, and they fill in automatically as ESPN adds prospects.
- The data build writes a new file, `mock-draft.json`, with the prospects and team needs. If it fails, the draft order still works and a notice replaces the mock players.

## Capabilities

### New Capabilities
- `mock-draft`: the computer-generated mock draft on the Draft tab, including where the prospects and team needs come from, the pick logic, how picks are shown and explained, and what happens when data is missing.

### Modified Capabilities
None. Spoiler mode already exempts the Draft tab, and the mock draft reveals nothing beyond the draft order the tab already shows.

## Impact

- `scripts/build-data.mjs`: new `mock-draft` builder. It uses the ESPN core draft API (prospects and colleges), ESPN rosters and depth charts for all 32 teams, nflverse `draft_picks.csv`, and team pass and rush EPA from the existing play-by-play pass, so the play-by-play file is still read only once.
- New `src/lib/mockDraft.ts` with the pick simulation and need weights.
- `src/pages/DraftPage.tsx`: player line, expandable pick details, and players on the Jets picks card.
- `README.md` and the build header comment document `mock-draft.json`.
- No new dependencies and no backend. Everything stays on GitHub Pages and runs every 3 hours in CI.
