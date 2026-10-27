# Proposal

## Why

Games often can't be watched live, and opening the tracker to check stats instantly reveals final scores and results. A spoiler switch lets the user browse schedules, rosters, and season stats without learning how a finished game ended, until they choose to see it.

## What Changes

- **Spoiler toggle in the header** next to the theme button, available on every screen. It is **off by default** (results hidden), and the choice is remembered on this device.
- **With spoilers off, finished games show only that they were played** (date, opponent, home/away, "Final"), with no score and no W/L. This applies everywhere games are listed: team cards on Home, schedule, team overview, the Live tab's finished games, and the season series in game info.
- **With spoilers off, everything else that reveals results is hidden too:**
  - team and opponent records, standings, and home/away W-L
  - per-game result lists and charts (team results, points by game, net rating by game)
  - player game logs and "last 5 / game by game"
  - team news headlines
  - for a finished game's page: the scoreboard score, win probability, game leaders, box score, play-by-play/drives, shot chart, team stats, and analytics
- **Per-game reveal:** each hidden finished game has a "Show score" control. Revealing one game shows it everywhere in the app and is remembered, while the global toggle stays off.
- **Hidden sections** that aren't tied to a single game (records, standings, game logs, news) show a short "Hidden while spoilers are off" placeholder with a button that turns spoilers on.
- **Unchanged:**
  - live games in progress always show their score
  - upcoming games
  - season totals and averages (team stats, player season stats, advanced/efficiency stats, vs League scatter plots)
  - the MVP race
  - the Draft order

## Capabilities

### New Capabilities
- `spoiler-mode`: the global spoiler switch, its default and persistence, what is hidden while it is off, per-game reveal, and how hidden content is presented on phone and laptop.

### Modified Capabilities

None. The MVP race and player search behave as before. MVP rows still show team records, because the user chose to keep the MVP race fully visible.

## Impact

- **New:**
  - `src/lib/spoilers.ts`: spoiler state as a React context, saved in `localStorage`, plus the set of revealed game ids
  - small shared UI pieces in `src/components/ui.tsx`: a hidden-score marker, a "Show score" button, and a hidden-section placeholder
- **Modified components:**
  - `Layout.tsx`: toggle and provider
  - `TeamCard.tsx`
  - `TeamPage.tsx`: record in the header
  - `TeamSchedule.tsx`, `TeamOverview.tsx`, `TeamStandings.tsx`, `BlazersAdvanced.tsx`, `TeamNews.tsx`
  - `LivePage.tsx`
  - `GameView.tsx`, `Scoreboard.tsx`, `GameInfo.tsx`
  - `PlayerOverview.tsx`, `PlayerGamelog.tsx`
- No data-build, API, or dependency changes. It stays fully client-side on the static site.
