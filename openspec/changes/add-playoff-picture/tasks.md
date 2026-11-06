# Tasks

## 1. Data

- [x] 1.1 Add `src/lib/playoffs.ts` with `PLAYOFF_RULES` for the NFL and NBA (seeds, play-in, byes, division leaders, first-round pairings, round names), the clincher-code label table, and helpers: sort a conference by `playoffseed`, games back between two entries (ties as half), tier of a seed (in / play-in / out), and projected first-round matchups. Verify with a scratch esbuild script: 5-6 vs 7-4 gives 2 GB, 20-10 vs 17-13 gives a 3-game lead, NFL pairings are 2v7/3v6/4v5 with a 1-seed bye, NBA seed 9 is play-in. `npm run build` passes. Commit ("Add playoff rules and seeding helpers").
- [x] 1.2 Add `buildPlayoffs` to `scripts/build-data.mjs` (design Decision 3), registered as `playoffs`:
  - NFL `remaining` from the nflverse schedule
  - NBA `remaining` from the 30 ESPN team schedules
  - NFL `postseason` from scoreboard weeks 1–5 of `seasontype=3`
  - NBA `postseason` from one scoreboard request per day of the play-in/playoff window taken from `leagues[0].calendar`
  - `available`/`error` per league

  Update the file list in the script's header comment. Verify with `ONLY=playoffs node scripts/build-data.mjs`: `public/data/playoffs.json` has 32 NFL and 30 NBA teams in `remaining`, the Jets' remaining opponents match their schedule, and the NBA `postseason` holds the 2025-26 play-in and series games with seeds and series wins. Commit ("Precompute remaining schedules and postseason games").
- [x] 1.3 Add the `PlayoffsData` types and a strength-of-schedule helper to `src/lib/playoffs.ts`: drop remaining games whose date has passed, then average the opponents' live win %. Verify with the scratch script against a sample of `playoffs.json`. Commit ("Compute remaining strength of schedule").

## 2. Page and navigation

- [x] 2.1 Add the `playoffs` route in `src/App.tsx` and a stub `src/pages/PlayoffsPage.tsx` with the NFL/NBA switch in `?league=` (same as the MVP page). Add a Playoffs `NavLink` in `src/components/Layout.tsx` between Draft and MVP, and make Draft icon-only below `sm` with `aria-label`/`title`. In the browser at 360, 375 and 390 px, check that the header does not overflow and every tab is visible. Commit ("Add Playoffs tab").
- [x] 2.2 Decide the phase from the current scoreboard's `season.type` (design Decision 4). Verify in the browser: NFL shows the seeding placeholder now; the NBA phase is right for the current date. Commit ("Pick seeding or bracket by season phase").

## 3. Seeding view

- [x] 3.1 Build `src/components/playoffs/Seeding.tsx`: per conference, rows by seed with logo, abbreviation, record, PCT, GB/lead, games left, remaining SOS and clinch mark. Add cut lines after the last playoff seed (and after seed 10 in the NBA), division-leader and bye marks for the NFL, and a legend. Seed/team/record/GB stay fixed and the other columns scroll inside the table on phones. Verify in the browser against ESPN's standings for both leagues, at 390 px and on a laptop, in light and dark mode. Commit ("Show playoff seeding per conference").
- [x] 3.2 Add the projected matchups per conference (NFL bye plus 3 Wild Card games; NBA 2 play-in games plus 4 series with TBD opponents) and highlight the Jets/Blazers rows with the one-line summary above the conferences. Verify that the summary's seed and GB match the table for both teams. Commit ("Show projected matchups and where our teams stand").
- [x] 3.3 Handle loading, errors (with retry) and a missing `playoffs.json` (dashes for games left and SOS), and show an `Updated` time. Verify by blocking the data file and the standings URL in DevTools. Commit ("Handle missing playoff data").

## 4. Bracket view

- [x] 4.1 Add bracket building to `src/lib/playoffs.ts`: group games into NFL rounds and NBA series by team pair, read round and conference from the note (date order as fallback), take series wins from `competitions[0].series`, overlay current-scoreboard events by id, and fill undetermined slots with placeholders from `PLAYOFF_RULES`. Verify with the scratch script on the 2025-26 NBA and 2025 NFL postseason from `playoffs.json`: rounds, series scores and the champion are correct. Commit ("Build playoff brackets from postseason games").
- [x] 4.2 Build `src/components/playoffs/Bracket.tsx`: rounds stacked with a round picker on phones and columns per conference from `sm` up, NBA play-in first, series expandable to their games, Jets/Blazers games linking to the game page, the NFL bye shown, and a "Final seeding" toggle that shows the seeding view. Verify the NBA view (offseason → 2025-26 bracket labeled "2025-26") at 390 px and on a laptop in both themes. Commit ("Show the playoff bracket").
- [x] 4.3 Poll the scoreboard with `LIVE_MS` while a postseason game is live and show live scores in the bracket. Verify by pointing the overlay at a past postseason date's scoreboard in dev: a game's score and state come from the overlay. Commit ("Update live playoff games in the bracket").

## 5. Spoilers

- [x] 5.1 Gate the seeding view and the bracket behind `useSpoilers()` with `SpoilerNote`, and list live postseason games with their score above the note. Verify in the browser: with spoilers off, no seed, record, GB, clinch mark or series score is visible on either league; turning spoilers on shows them right away. Commit ("Hide the playoff picture while spoilers are off").

## 6. Integration

- [x] 6.1 Run `npm run lint` and `npm run build`. Click through Home → Playoffs → NBA → a Blazers bracket game and back at 390 px and on a laptop, light and dark, spoilers on and off. Check that the other tabs (Live, Draft, MVP, Calendar) behave as before. Push to `main` and check the deployed page after CI builds `playoffs.json`.

## 7. Bracket layout (review feedback)

- [x] 7.1 Redraw `src/components/playoffs/Bracket.tsx` as a real bracket tree (design Decision 5, revised): mirrored halves with the final in the middle from `lg` up, round titles, SVG connectors, compact matchup cards with seeds under the abbreviations and a winner marker, the NFL bye card in the Wild Card column, and a games panel under the tree for the selected matchup (a live series selected by default). Verify against the 2025-26 NBA and 2025 NFL brackets at 1280 px in light and dark mode: every card's centre lines up with its connector. Commit ("Draw the playoffs as a bracket tree").
- [ ] 7.2 Draw the NBA play-in as a tree per conference (7 v 8 and 9 v 10 into the 8th-seed game) under the main bracket, and below `lg` show one conference half at a time with a West/East switch and the final below. Verify at 390 and 768 px that there's no horizontal page scroll, and that the live test (Task 4.3 setup) still shows the live score. Commit ("Show the play-in tree and a one-conference bracket on phones").
