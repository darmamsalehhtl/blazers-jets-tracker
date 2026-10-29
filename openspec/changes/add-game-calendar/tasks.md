# Tasks

## 1. Data and routing

- [ ] 1.1 Give `urls.scoreboard` in `src/lib/espn.ts` an optional `dates` argument (`YYYYMMDD`). Check that the Live tab's URL stays unchanged and that `npm run build` passes. Commit ("Allow scoreboard lookups by date").
- [ ] 1.2 Add `src/lib/calendar.ts` with:
  - Eastern-date helpers: today's Eastern date, an event's Eastern day key, `YYYYMMDD` and `YYYY-MM-DD` conversions
  - the month grid builder: Sunday-first weeks, including the padding days
  - the season-for-month rules for the NFL and NBA team schedules (design Decision 2)

  Verify with a scratch esbuild script:
  - an event at `2026-10-28T02:00Z` maps to 2026-10-27
  - October 2026 builds 5 weeks starting Sep 27
  - Feb 2027 maps to NFL season 2026 and NBA season 2027
  - July has no NFL or NBA season

  Commit ("Add calendar date helpers").
- [ ] 1.3 Add the `calendar` route in `src/App.tsx` and a Calendar `NavLink` in `src/components/Layout.tsx`: an icon on phones, text from `sm` up, with `aria-label`. In Playwright at 390 px, check that the header has no horizontal overflow and that every tab is visible. Commit ("Add Calendar tab").

## 2. Calendar page

- [ ] 2.1 Build `src/pages/CalendarPage.tsx`:
  - the month grid with prev, next and Today buttons
  - URL state `d`, `m` and `g` (a date pick pushes a history entry; a game pick replaces it)
  - today highlighted and the selected day marked

  Verify in the dev server: Today, prev and next work, and reload keeps the date. Commit ("Show a month calendar on the Calendar tab").
- [ ] 2.2 Fetch the Jets and Blazers schedules for the visible month's seasons and mark their game days with the opponent logo. Show W or L only when `canShow` allows it. Verify:
  - October 2026 shows the Blazers' games and the Jets' games on the right days
  - with spoilers off, no W or L appears

  Commit ("Mark Jets and Blazers games on the calendar").
- [ ] 2.3 List the selected day's NFL and NBA games from the two date-scoped scoreboards:
  - our teams first and starred, then NFL, then NBA, each by start time
  - final, live or upcoming state (the start time in the user's time zone, plus TV)
  - `HiddenScore` when spoilers hide a final
  - an empty state for days without games, and an `ErrorBox` with retry on failure
  - the polling intervals from design Decision 6

  Verify:
  - Oct 27, 2026 lists 4 NBA games
  - a Sunday in October lists NFL games before NBA games
  - a July day shows the empty state
  - with spoilers off, no finals are shown

  Commit ("List every NFL and NBA game on the picked date").
- [ ] 2.4 Open the tapped game's `GameView` below the list (`g` in the URL). Verify:
  - a finished NBA game shows its box score
  - a non-Jets NFL game shows its stats
  - reload keeps the same game open
  - changing the date clears it

  Commit ("Open a game's stats from the calendar").
- [ ] 2.5 Add a footnote explaining that days follow ESPN's US Eastern game day. Add the Calendar tab to the README's feature list and check that the README renders correctly. Commit ("Document the Calendar tab").

## 3. Verify

- [ ] 3.1 Playwright, at 390 px dark and 1200 px light, on `#/calendar`:
  - the scenarios in `specs/game-calendar/spec.md`: open on today, previous month, Today, team markers, the NBA night, a Sunday with both leagues, no games, spoilers on and off, an upcoming day, opening a game, reload, and back
  - no sideways page scroll
  - no console errors

  Run `npm run build` and `npm run lint`, push, and confirm the Deploy workflow passes and the live site's Calendar tab loads.

## Workflow follow-up

- Archive the change with `/opsx:archive` once verified.
