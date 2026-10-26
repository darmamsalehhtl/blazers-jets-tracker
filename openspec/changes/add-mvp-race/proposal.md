# Proposal

## Why

The tracker shows where Jets and Blazers players stand against the league (vs League scatter plots) but not who is actually leading the league. An "if the season ended today" MVP race for both the NFL and the NBA answers the most-asked award question in one place, and shows whether a Jets or Blazers player is in the conversation. Both seasons are now under way, so there is live data to rank.

## What Changes

- New top-level **MVP** page (`/mvp`) in the main navigation, with an NFL / NBA switch.
- For each league, a ranked MVP race (top 10) built from a transparent, data-driven **MVP score** that mirrors what voters reward: individual production and efficiency, team success, and availability.
  - **NBA:** per-game production, scoring efficiency, team win %, and games played, including the league's 65-game award eligibility rule (pro-rated to "on pace").
  - **NFL:** total EPA (passing + rushing, or receiving + rushing for skill players), headline stats (yards, touchdowns, turnovers), team win %, and a position adjustment because voters almost always pick quarterbacks.
- Each candidate row shows rank, face, team, score, gap to the leader, team record, key stats, and the main reason they rank where they do.
- Jets and Blazers players are highlighted. If none is in the top 10, the page still shows where the best one ranks.
- A short methodology note on the page explains the formula and its limits (an estimate, not a prediction of the real vote).
- Data is precomputed in CI (every push and every 3 hours) like the other league data, so the page loads quickly on a phone.

## Capabilities

### New Capabilities
- `mvp-race`: League-wide "if the season ended today" MVP standings for the NFL and NBA: candidate pool and eligibility, the scoring model, how it is presented, and how often it updates.

### Modified Capabilities
<!-- None: there are no existing specs in openspec/specs/ yet. -->

## Impact

- `scripts/build-data.mjs`: new `mvp` builder producing `public/data/mvp.json`. It reuses the league-wide inputs that already exist (nflverse play-by-play aggregates, ESPN byathlete stats) and adds ESPN standings for team win %.
- New `src/lib/mvp.ts` (types) and `src/pages/MvpPage.tsx`, plus a route in `src/App.tsx` and a nav link in `src/components/Layout.tsx`. The nav must still fit on a ~390px phone, which now has five items.
- No new dependencies, no backend, no change to existing pages.
- README and the CI build gain one more data file.
