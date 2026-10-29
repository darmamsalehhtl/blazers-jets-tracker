# Design

## Context

- **Live tab precedent.** `LivePage` already lists league-wide games from ESPN's scoreboard (`useAllGames`) and opens the picked game in `GameView`. `GameView` takes `teamKey` and `eventId`, and works for any game in that league, not only Jets or Blazers games.
- **Team schedules.** `urls.schedule(team, seasonType, season)` returns one team's whole season. `TeamSchedule` uses it with the spoiler-aware `useGameResult`.
- **Header space.** The header already holds the logo, five tabs, the spoiler toggle and the theme toggle, and on a phone it barely fits. The code comment in `Layout.tsx` notes this.
- **What ESPN's scoreboard accepts** (checked on 2026-10-29):
  - `?dates=YYYYMMDD` works for either league, at about 15 KB for one NFL game and up to about 100 KB for a full NBA night. Dates are US Eastern game days: the Oct 27 NBA slate runs from 23:30Z to 03:00Z the next day.
  - `?dates=YYYYMMDD-YYYYMMDD` ranges currently return HTTP 400.
  - `?dates=YYYYMM` returns a whole month, but an NBA month is about 3 MB (155 events, and it needs `limit`).
- **Team schedule `season` parameter:**
  - NBA uses the year the season ends: `season=2027` is 2026-27.
  - NFL uses the year it starts: `season=2026` runs Sep 2026 to Jan 2027.
  - The default type is the regular season, and `seasontype=3` gives the postseason.

## Goals / Non-Goals

**Goals:**
- Show any month and day cheaply. The phone should only download what the user actually looks at.
- Reuse `GameView` for the stats so the calendar gets the box score, plays, analytics and shot chart for free.

**Non-Goals:**
- No game counts or league-wide markers on the grid: that would need about 3 MB per month for the NBA, or about 30 day fetches.
- No college or other leagues.
- No precomputed calendar data in `build-data.mjs`.
- No week view and no filters by league.

## Decisions

1. **Fetch only the selected day.** The day list comes from two scoreboard fetches, NFL and NBA, with `?dates=YYYYMMDD` for the selected day.
   - Alternative: fetch whole months with `dates=YYYYMM`, so every day on the grid could show a count. Rejected: about 3 MB per NBA month, plus the 100-event default limit.
   - Alternative: precompute a calendar index in CI. Rejected: it adds a build step for a small gain and would be up to 3 hours stale for today's games.

2. **Grid markers come from the two team schedules.** For the visible month, fetch each team's schedule for the season or seasons that overlap it:
   - NFL: the month's season is `y` for March–December and `y−1` for January–February. It has no games March–July, so those months skip the fetch.
   - NBA: the season is `y+1` for July–December and `y` otherwise. It has no games July–September, so those months skip the fetch.
   - Fetch the regular season and the postseason (types 2 and 3), plus the preseason (type 1) for August–September (NFL) and October (NBA).

   That's at most six small requests per season, and moving to a month in the same season reuses them because `usePoll` results are keyed by URL. The markers are cosmetic; if a schedule fails, the grid just has no markers.

3. **Day key = ESPN's game day, not the browser's local date.** `YYYYMMDD` for the scoreboard comes from the grid cell. Schedule events are bucketed into grid days by their US Eastern date (`Intl.DateTimeFormat` with `America/New_York`), so a 7 pm PT Blazers tip-off (02:00Z next day) lands on the same day as the scoreboard query. Start times in the list are shown in the user's own time zone.

4. **URL state: `#/calendar?d=YYYY-MM-DD&g=<eventId>`.**
   - Picking a date pushes a history entry, so the back button works. Picking a game replaces the current entry, as on the Live tab.
   - The month shown is derived from `d`. Prev/next only changes the visible month (`m=YYYY-MM`) and doesn't change the selection.
   - With no `d`, today's Eastern date is selected.
   - Changing the date clears `g`.

5. **List order and look.**
   - Order: our teams' games first (★), then NFL, then NBA, each by start time.
   - Each row shows the league label, both teams' logos and abbreviations, and the score or state.
   - Rows reuse the spoiler pieces: `canShow` decides whether to show the score, and `HiddenScore` offers to reveal it.
   - Tapping a row sets `g`, and `GameView` renders below the list with `key={eventId}`.
   - On a phone the list is a single column. On a laptop the grid sits beside the day list (`sm:grid-cols-[auto_1fr]`), and the game view goes full width below both.

6. **Polling.** `usePoll` runs on each day URL with an interval function:
   - `LIVE_MS` while any event that day is `in`
   - 60 s if a game starts within the hour
   - `IDLE_MS` for today otherwise
   - `null` (fetch once) for days whose games are all final, or past days with no games

7. **Nav entry.** Add a Calendar `NavLink` between MVP and the spoiler toggle. On phones it's a calendar icon with `aria-label="Calendar"`; from `sm` up it shows the text "Calendar". This keeps the phone header within 390 px. Fit is checked in Playwright, and if it still overflows, the gaps around the icon buttons are tightened.

8. **Shared helpers.**
   - `urls.scoreboard` gets an optional `dates` argument.
   - The league label and score-chip rendering stay local to `CalendarPage`, unless the Live tab's `GameChip` can be shared without changing how it looks. Decide that when implementing; it's not a behavior change.

## Risks / Trade-offs

- [ESPN's date semantics change or `dates` breaks] → The list shows the existing `ErrorBox` with a retry. The grid markers come from a different endpoint and still work.
- [Games past midnight Eastern, or the 2–3 a.m. ET window] → A day is always ESPN's game day, the same as the scoreboard. "Today" uses the Eastern date, so at 11:30 pm in Portland, "today" is already tomorrow's slate. That's acceptable, and the footnote says days follow ESPN's US Eastern game day.
- [Far past seasons] → ESPN serves old scoreboards and schedules, but some older games may lack a full box score. `GameView` already handles missing sections.
- [Header crowding] → The phone view is icon-only (Decision 7) and verified at 390 px.
- [Spoilers via grid markers] → W/L only through `canShow`. The opponent logo itself isn't a spoiler, since schedules are public.
