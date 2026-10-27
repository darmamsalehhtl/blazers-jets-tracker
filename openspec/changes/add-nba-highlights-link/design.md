# Design

## Context

See proposal.md for the motivation and `specs/nba-watch-link/spec.md` for the behavior.

Current state:
- **The game page.** `GameView` renders every game page. It gets an ESPN summary whose `header.competitions[0]` holds the tip-off time (`date`, UTC), the two competitors with `homeAway` and `team.abbreviation` (ESPN codes), and `status.type.state`. The league comes from the team the page is opened under (`por` = NBA, including other NBA games opened from the Live tab).
- **Spoiler mode.** Since `add-spoiler-mode`, `GameView` has a hidden mode for finished games (`canShow`). The new link has to work in both modes.
- **NBA.com game pages** have the form `https://www.nba.com/game/{away}-vs-{home}-{gameId}`:
  - the tricodes are lowercase NBA.com codes
  - `gameId` is a 10-digit NBA.com id, e.g. `0022600012`
  - ESPN does not expose that id

  NBA.com's public schedule feed `https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json` lists every game of the season with `gameId`, `gameDateTimeUTC`, and both teams' `teamTricode` (≈5 MB uncompressed).
- **NBA.com can't be reached from the development machine.** Both the feed and the website return Akamai "Access Denied" there, in curl and in headless Chromium. Whether GitHub Actions runners and the user's browser can reach the feed (and whether it sends CORS headers) can only be confirmed after deploying.
- **The data build** (`scripts/build-data.mjs`) already writes per-file JSON with `available: false` plus an error when a builder fails, and the app reads these files with `useDataFile`.

## Goals / Non-Goals

**Goals:**
- One tap from a finished NBA game to its NBA.com page in the common case.
- Never a dead or wrong link: when the id is unknown, an honest fallback that is still one tap away from the game.

**Non-Goals:**
- Deep-linking into a specific video or the League Pass player. NBA.com's game page is where the user picks highlights or the replay, and its sub-URLs aren't stable or documented.
- Previous seasons' games beyond what the current schedule feed lists. Those use the day-page fallback.
- Checking League Pass login or entitlements.

## Decisions

### 1. Primary source: an id map built in CI (`nba-games.json`)
A new `nba-games` builder fetches the schedule feed once per build (every 3 h) and writes `{ season, games: { "<YYYY-MM-DD>|<AWAY>|<HOME>": "<away>-vs-<home>-<gameId>" } }`:
- The key uses **ESPN abbreviations** and the tip-off date in **US Eastern time**, so the client can build it straight from the ESPN summary.
- Only regular season, play-in, playoffs and preseason games with real teams are included. All-Star and TBD games are skipped.
- That is about 1,300 entries ≈ 55 KB (≈ 10 KB gzipped).

The build requests the feed honestly, with the project's normal user agent and no faked browser or `Referer` headers: it must not try to get around NBA.com's bot protection. If NBA.com refuses, the file is written as `available: false` with the error, like any failing builder, and the rest of the build is unaffected.

- *Alternative:* fetching the schedule only in the browser. Rejected as the primary source: 5 MB on a phone for one link, and CORS is unknown.
- *Alternative:* computing the id. Rejected: ids are sequential by NBA scheduling order, which can't be derived from ESPN data.

### 2. Secondary source: the same feed fetched in the browser, lazily
Only when `nba-games.json` is unavailable, `nbaLink.ts` fetches the schedule feed in the browser:
- once per visit, memoized
- only when a finished NBA game page is open

It builds the same map in memory. If the fetch fails (CORS, Akamai, offline), resolution falls through to the day page. This covers the case where CI is blocked but the user's browser isn't.

### 3. Fallback: NBA.com's games page for the day
`https://www.nba.com/games?date=YYYY-MM-DD`, using the Eastern-time date of tip-off (`Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })`). The link label becomes "Find it on NBA.com" so the user knows one more tap is needed.

### 4. Team code mapping
NBA.com → ESPN: `GSW→GS, NOP→NO, NYK→NY, SAS→SA, UTA→UTAH, WAS→WSH`. All other tricodes are identical. The map lives in the builder and in `nbaLink.ts` (the browser fallback needs it too). Any feed tricode that isn't one of the 30 known ESPN codes after mapping is logged by the build, so a new mismatch shows up in the CI log.

### 5. `NbaWatchLink` component and placement
- It is a full-width, card-styled anchor (`target="_blank" rel="noreferrer"`) with an external-link icon, placed directly under the scoreboard, before the tabs, in `GameView`.
- It shows only when `team.league === 'nba'` and the state is `post`.
- While resolving, it renders the fallback link immediately and upgrades the `href` and label when the direct path is known, so it is never blank or missing.
- In hidden mode, a one-line muted note "NBA.com shows the final score" sits under the label. The note is not rendered once the game is shown.

## Risks / Trade-offs

- **[NBA.com blocks both GitHub Actions and the browser]** → The day-page fallback still works. That is one extra tap and no worse than today. The build log and the `available: false` file make the cause visible. The final task checks the deployed file and reports which path is live.
- **[Feed format changes]** → The builder validates the fields it uses and fails cleanly (file marked unavailable), so the app falls back. Nothing else in the build depends on it.
- **[Wrong game matched (e.g. doubleheader-like edge cases, postponed games moved to another day)]** → The key includes both teams and the Eastern date. Postponed games get a new date in both ESPN and NBA.com after rescheduling. A mismatch only produces a missing key, which leads to the fallback, never a wrong game.
- **[Spoiler exposure]** → NBA.com itself shows the score. The warning makes that explicit, and the link text never contains a result.

## Migration Plan

Additive: one new data file, one component and one lib module. Rollback is reverting the commits. The stale data file is harmless.

## Open Questions

- Does NBA.com's feed reach GitHub Actions runners or the user's browser? This is answered by the deploy check in the tasks. It changes only which path the link uses, not the design.
