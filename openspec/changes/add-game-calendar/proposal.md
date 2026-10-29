# Proposal

## Why

The tracker shows what's live now (Live tab) and each team's own schedule, but there's no way to look up a given day: "what happened in the league last Tuesday?" or "who plays on Saturday?". A calendar lets the user pick any date and see every NFL and NBA game on it, with full stats one tap away.

## What Changes

- New **Calendar** tab (`#/calendar`) in the header nav.
- A month grid that opens on today. Prev/next month buttons and a "Today" button move around, and any month in the past or future can be shown.
- Days with a Jets or Blazers game are marked on the grid with the opponent's logo, so the user can spot their teams' games at a glance. Results on the grid follow spoiler mode.
- Tapping a date lists **every NFL and NBA game** played or scheduled that day, with Jets and Blazers games pinned first and starred, then NFL, then NBA.
  - Finished games show the final score, which spoiler mode hides.
  - Live games show the live score.
  - Upcoming games show the start time and TV channel.
- Tapping a game opens its full stats underneath, the same game view the Live tab uses: box score, player stats, plays, team comparison, analytics and shot chart.
- The selected date and game are in the URL, so reload, back and shared links work.
- If the selected day is today and a game is live, the day's list refreshes every 20 seconds.

## Capabilities

### New Capabilities
- `game-calendar`: Browsing NFL and NBA games by date: the month grid, the day's game list, and opening a game's stats from it.

### Modified Capabilities
<!-- None. Spoiler mode already requires new score-showing UI to respect it; the calendar follows that rule without changing spoiler-mode's requirements. -->

## Impact

- New page and route (`src/pages/CalendarPage.tsx`, `src/App.tsx`), a nav entry in `src/components/Layout.tsx`, and a date-scoped scoreboard URL in `src/lib/espn.ts`.
- Reuses `GameView`, `usePoll`, the team schedule endpoint and the spoiler helpers. There is no new build-data step and no new dependency.
- Data: ESPN's public scoreboard with `?dates=YYYYMMDD`, about 15–100 KB per league per day, fetched in the browser. There's no change to GitHub Actions or the hosting.
- README: mention the Calendar tab.
