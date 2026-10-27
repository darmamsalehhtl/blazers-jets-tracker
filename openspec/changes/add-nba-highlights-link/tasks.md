# Tasks

## 1. NBA.com game ids in the data build

- [x] 1.1 Add the `nba-games` builder to `scripts/build-data.mjs` (design decisions 1 and 4):
  - fetch the schedule feed with the project's normal user agent (no faked browser or `Referer` headers)
  - map tricodes to ESPN codes
  - key games by Eastern date, away and home
  - skip All-Star/TBD games
  - log unknown tricodes
  - validate the fields and fail cleanly

  Document it in the file's header comment and the README data list. Verify locally:
  - don't request NBA.com from this machine, which is blocked
  - the other files are not touched
  - `NBA_SCHEDULE_FILE=<fixture> ONLY=nba-games` with a small saved fixture in the feed's documented shape produces the expected keys, including the GSW→GS and NYK→NY cases and a 10:30 PM ET tip-off keyed to the Eastern date

  Commit ("Build NBA.com game id map").

## 2. Resolving the link in the app

- [x] 2.1 Add `src/lib/nbaLink.ts` (design decisions 2–4):
  - Eastern-date helper
  - ESPN key builder from a summary
  - resolution order: build file, then the lazy, memoized browser fetch of the feed, then the day page
  - returns `{ href, direct: boolean }`

  Verify with a small script against fixtures (the same feed fixture and an ESPN summary from the dev server):
  - a known game resolves to `https://www.nba.com/game/sac-vs-por-<id>`
  - an unknown game resolves to `https://www.nba.com/games?date=…` with `direct: false`
  - a 10:30 PM ET game uses the Eastern date

  Run `npm run lint` and `npm run build`. Commit ("Resolve NBA.com game links").
- [x] 2.2 Add `NbaWatchLink` and render it in `GameView` under the scoreboard for finished NBA games only (design decision 5):
  - "Watch on NBA.com" when the link is direct, "Find it on NBA.com" for the fallback
  - new tab
  - "NBA.com shows the final score" note only while the game is hidden

  Verify in Playwright at 390 px dark and 1200 px light, with no horizontal overflow and no console errors:
  - a finished Blazers game shows the link (with the note while spoilers are off, without it after "Show score")
  - a finished Jets game and an upcoming NBA game show no link
  - with the feed request mocked to a fixture, the `href` is the direct game URL
  - with it failing, the `href` is the day page

  Add the feature to the README feature list. Commit ("Link finished NBA games to NBA.com").

## 3. Integration check

- [ ] 3.1 Push, and confirm the Deploy workflow passes. Then check the deployed `data/nba-games.json` and record in the change's design.md Open Questions whether CI could reach NBA.com (available + game count) or not (error).
  - **If it is available:** open a finished Blazers game on the live site and confirm the link's `href` is the direct NBA.com game URL with the right teams and date.
  - **If not:** confirm the live link falls back to the correct day page.

  Report which path the user will get.

## Workflow follow-up

- Archive the change with `/opsx:archive` once it is live and the user has tried the link with League Pass.
