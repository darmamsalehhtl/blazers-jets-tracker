# Tasks

## 1. NFL inputs from play-by-play

- [ ] 1.1 Extend `collectPlayers` in `scripts/build-data.mjs` with pass yards, pass TD, interceptions, rush and receiving yards and TD, fumbles lost, and games played per player (regular season only). Verify with `ONLY=nyj,nfl-league node scripts/build-data.mjs`: both files are produced, and their content is unchanged apart from `updatedAt` (diff against a copy made beforehand).
- [ ] 1.2 Read positions from nflverse `players.csv` (already streamed for the id map) and compute team records from `games.csv`. Verify by logging Jets QB totals and the Jets record, and comparing them with ESPN for the same week.
- [ ] 1.3 Commit ("Collect NFL MVP inputs from play-by-play").

## 2. MVP scoring in the build

- [ ] 2.1 Add the `mvp` builder (reusing the single play-by-play pass via `once()`) and write `public/data/mvp.json` with `nfl` and `nba` sections, each wrapped so one league failing records `available: false` with an error while the other still builds. Verify by forcing an error in one league and checking that the other league's section is intact.
- [ ] 2.2 Implement the NFL score from design.md decision 4 (z-scores, weights, −0.8 non-QB adjustment), the pools and minimums from decision 5, the `reason` field, and the `smallSample` flag (before week 4). Verify by checking that the top 10 holds plausible QBs and that every listed player meets the dropback/touch minimum.
- [ ] 2.3 Implement the NBA score (Game Score approximation, points over league-average TS, team win % from ESPN standings), the 65-game eligibility with `atRisk`, and `smallSample` (teams under 10 games). Verify that no listed player has missed more than 17 team games and that at-risk players are flagged.
- [ ] 2.4 Add the `ours` summary per league: best Jets or Blazers candidate with full rank, or a "none qualifies" flag. Verify against the full sorted list in the build log.
- [ ] 2.5 Sanity-check the weights on last season (`NFL_SEASON=2025` and the NBA 2025-26 season): the actual MVP must finish top 3 in each league, and a 2,000-yard-rusher-type season must be able to reach the NFL top 10. Adjust weights in one place if needed and record the result in a code comment next to the weights.
- [ ] 2.6 Document `mvp.json` in the header comment of `build-data.mjs` and in the README's "How it works". Commit ("Compute NFL and NBA MVP race in the data build").

## 3. MVP page

- [ ] 3.1 Add `src/lib/mvp.ts` with the `mvp.json` types. Verify with `npm run build`, which typechecks.
- [ ] 3.2 Build `src/pages/MvpPage.tsx`:
  - NFL/NBA switch stored in `?league=`, defaulting to NFL
  - ranked rows with face, name, team, score, gap to leader, team record, key stats and reason
  - at-risk marker
  - Jets/Blazers highlight, plus the "best ranked" or "none qualifies" line below the list
  - methodology note, small-sample note, "updated …", and a per-league error state

  Verify in the browser at 1200px and 390px, light and dark mode.
- [ ] 3.3 Add the `/mvp` route in `src/App.tsx` and an "MVP" nav link in `Layout.tsx`. Below `sm`, the nav drops team logos and uses `px-2` so all five items fit. Verify with a 390px screenshot of the nav on every page (no horizontal scroll, every item visible).
- [ ] 3.4 Add the MVP page to the README feature list. Run `npm run lint`, then commit ("Add MVP page with NFL and NBA MVP race").

## 4. Integration check

- [ ] 4.1 Run the full `node scripts/build-data.mjs` and `npm run build`, open `/mvp` for both leagues with no console errors, switch leagues, and tap through a candidate's face to their player page. Then push, and confirm that the Deploy workflow passes and that `mvp.json` is served on the live site.

## Workflow follow-up

- Archive the change with `/opsx:archive` once the MVP page is live and reviewed.
