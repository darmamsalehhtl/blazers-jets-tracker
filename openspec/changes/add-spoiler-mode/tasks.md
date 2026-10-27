# Tasks

## 1. Spoiler state

- [x] 1.1 Add `src/lib/spoilers.ts` (design decision 1):
  - `SpoilerProvider` and `useSpoilers()` with `show`, `toggle`, `reveal(id)`, `canShow(event)`
  - `localStorage` keys `spoilers` and `revealedGames` (capped at 300) with try/catch fallback
  - default off

  Verify in the dev console that a fresh profile starts with `show === false`, that toggling and revealing survive a reload, and that blocking storage (throwing accessor) still lets the toggle work for the visit.
- [x] 1.2 Add the shared `HiddenScore`, `SpoilerNote`, and `useGameResult` pieces (design decision 2). Run `npm run lint` and `npm run build` and verify both pass. Commit ("Add spoiler state and hidden-score building blocks").

## 2. Header toggle

- [x] 2.1 Wrap the outlet in `SpoilerProvider` and add the eye / eye-off toggle before the theme button in `Layout.tsx` (`aria-pressed`, label "Show spoilers" / "Hide spoilers"; design decision 5). Verify in Playwright at 360, 390 and 1200 px, light and dark, that all nav tabs and both toggles are visible and the document has no horizontal overflow. Commit ("Add spoiler toggle to the header, off by default").

## 3. Hide results

- [x] 3.1 Game lists: hide the score and W/L of unrevealed finished games, with a "Show score" control that reveals in place without navigating (design decision 3). Covers `TeamCard`, `TeamSchedule`, `TeamOverview` (last game and results), `LivePage` chips, and the `GameInfo` season series. Verify with spoilers off that the Jets schedule shows finished games as "Final" without score or colors, that "Show score" on one row reveals only that row and doesn't open the game, and that the same game then shows its score on the Home team card. Commit ("Hide finished-game scores while spoilers are off").
- [x] 3.2 Finished game page: add a hidden mode to `GameView` and `Scoreboard`. It shows "Final" with no score, records or line score, plus a "Show score" button and only the Info tab without the series scores (design decision 4). Verify that opening a past Jets game and a past Blazers game with spoilers off shows no score, box score, win probability or leaders; that "Show score" reveals the full page; and that a live game (or a game mocked as `in`) still shows everything. Commit ("Hide finished game pages until revealed").
- [ ] 3.3 Records and whole sections (design decision 6):
  - omit records in the team page header, team card, row subtitles, opponent records, the scoreboard, the TeamOverview "Record" stat, and BlazersAdvanced home/away and its record subtitle
  - render `SpoilerNote` for Standings, News, the TeamOverview results list and points by game, BlazersAdvanced "Net rating by game", `PlayerGamelog`, and PlayerOverview "Game by game" / "Last 5 games"

  Verify each of these spots in the browser with spoilers off, and that "Show spoilers" in a note turns spoilers on everywhere. Also check that the Stats, Advanced (other cards), Players, vs League, Roster, Draft, MVP pages and player search look unchanged. Commit ("Hide records, standings, game logs and news while spoilers are off").
- [ ] 3.4 Re-run the audit search from the design (`scoreText`, `winner`, `recordText`, `recordSummary`, `standingSummary`, `gameResult`, `wins`) over `src/` and confirm each hit is either gated by the spoiler state or on the keep-visible list (live games, MVP, Draft, season totals). Fix any gaps and verify the search again.

## 4. Docs and integration check

- [ ] 4.1 Add spoiler mode to the README feature list and the CLAUDE.md requirements (new result displays must respect the spoiler state). Run `npm run lint` and `npm run build` and verify both pass. Commit ("Document spoiler mode").
- [ ] 4.2 End-to-end in Playwright, at 1200 px light and again at 390 px dark, with no console errors:
  1. Start from a fresh profile and check that no final score is visible on Home, the Jets and Blazers pages (all tabs), a past game, a player page, and the Live tab.
  2. Reveal one game, reload, and check that it is still revealed and others aren't.
  3. Toggle spoilers on and check that the scores, records and standings appear, then reload and check that they stay on.

  Push, and confirm that the Deploy workflow passes and that the live site starts with spoilers off.

## Workflow follow-up

- Archive the change with `/opsx:archive` once it is live and reviewed.
