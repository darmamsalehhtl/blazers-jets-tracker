# Design

## Context

See proposal.md for the motivation and `specs/spoiler-mode/spec.md` for the required behavior.

Current state that shapes the approach:
- **Results are rendered in many places.** Each place reads ESPN data directly, with no shared "result" component:
  - `scoreText(c.score)` plus a W/L computed from `winner` in `TeamCard.GameRow`, `TeamSchedule.ScheduleRow`, `TeamOverview` (results list, last game, points by game), `LivePage.GameChip/Row`, `Scoreboard.Side/LineScore`, and `GameInfo` (season series)
  - records from `recordText(c)` (team cards, schedule subtitle, scoreboard) and `recordSummary` (team page header, team card)
  - home/away W-L and "x-y record" in `BlazersAdvanced`, and its "Net rating by game" chart
  - player W/L and score in `PlayerGamelog` and `PlayerOverview` ("Game by game" chart, "Last 5 games")
- **The theme toggle** (`src/lib/theme.ts`, used in `Layout.tsx`) is the existing pattern for a header switch persisted in `localStorage` with a try/catch fallback. It is a plain hook, though. Spoiler state must be shared by many components, so a hook with its own `useState` per caller would get out of sync.
- **Header space on a phone is tight.** Five nav tabs plus the theme button already required hiding the team logos below `sm`.
- **Game state** is `comp.status.type.state` (`pre` / `in` / `post`) everywhere. The event id is available in every list and on the game page.

## Goals / Non-Goals

**Goals:**
- One source of truth for "may this game's result be shown?", so no screen can drift from the rule.
- Toggling or revealing updates every mounted screen immediately.
- No layout shift worth noticing. Hidden scores keep their slot width, so rows don't jump when revealed.

**Non-Goals:**
- Hiding results outside the app's own UI: ESPN links that open externally, the browser tab title, OS notifications (there are none).
- Hiding the implicit information in season totals (for example, PPG changing after a game) or in the Draft order and MVP race. These were kept visible by the user's choice.
- Syncing the setting across devices: there is no backend.

## Decisions

### 1. `SpoilerProvider` context in `src/lib/spoilers.ts`
State: `{ show: boolean, revealed: Set<string> }`, persisted to `localStorage` under `spoilers` (`"on"` / `"off"`) and `revealedGames` (a JSON array of event ids). It exposes:
- `useSpoilers()` → `{ show, toggle, reveal(id), canShow(event) }`
- `canShow(event)` = `show || state !== 'post' || revealed.has(id)`. Pre and live games are always "showable". Postponed and canceled games carry no result, so they are unaffected.
- `showResults` = `show`, for sections not tied to one game (records, standings, logs, news).

The provider wraps the router outlet in `Layout`.
- *Alternative:* a hook per component reading `localStorage` like `useTheme`. Rejected: separate instances wouldn't update each other on toggle.
- *Alternative:* a global CSS class that blurs `.score` elements. Rejected: it is easy to miss elements, values stay in the DOM and in screen reader output, and it can't stop W/L colors or winner dimming.

`revealedGames` is capped at the 300 most recent ids, so storage can't grow forever. The cap covers several seasons of both teams.

### 2. Shared UI pieces in `src/components/ui.tsx`
- **`HiddenScore`:** a neutral pill "Final · Show score" (or just the button where "Final" already appears). It reserves roughly the width of a score so rows don't jump. The button stops propagation, so it reveals in place.
- **`SpoilerNote`:** a section placeholder, "Hidden while spoilers are off", with a "Show spoilers" button that calls `toggle()`. It is sized like a small card, so tabs don't look broken.
- **`useGameResult(event, teamId)` helper:** returns `{ us, them, result, score }` or `null` when it can't be shown. Rows switch on that instead of each re-implementing the rule.

### 3. Rows that are links
Schedule rows, team card rows, and team overview rows are `<Link>` elements. A `<button>` inside an `<a>` is invalid HTML and would navigate on tap. These rows are restructured so the row is a flex container: the link covers the main area, and the reveal button is a sibling at the end. Live tab chips are already `<button>`s (they select a game), so their reveal control is a separate small button below the chip's rows, or the game panel's own "Show score".

### 4. Finished game page
`GameView` checks `canShow` once it has the summary:
- **Hidden:** it renders `Scoreboard` in a hidden mode (logos, abbreviations, "Final" instead of `st.detail`, since "Final/OT" would hint at a close game; no records, scores or line score) plus a "Show score" button. Below it is only the Info tab (venue, date, officials, without the season series scores). Win probability, leaders, and the other tabs are not rendered, so their data isn't even computed.
- **Live game going final while viewed:** the next poll flips `state` to `post`, and the page switches to hidden mode. That is consistent with the spec, and the button is right there.

### 5. Header toggle
An eye / eye-off icon button (36 px, same style as the theme button) placed just before it, with `aria-pressed` and the label "Show spoilers" / "Hide spoilers".

To keep it fitting at 390 px, the nav gap is reduced and the logo square shrinks on phones. Task 2 measures this explicitly.

- *Alternative:* moving the toggle into a settings menu. Rejected: it must be one tap and visible on every screen.

### 6. Sections hidden as a whole
Each of these renders `SpoilerNote` instead of its content when `!show`:
- Standings tab
- News tab
- `PlayerGamelog`
- `PlayerOverview` "Game by game" and "Last 5 games"
- `TeamOverview` results list and "Points by game"
- `BlazersAdvanced` "Net rating by game"

Records inside otherwise-visible content are simply omitted:
- team page header and team card `recordSummary` / `standingSummary`
- opponent records in rows
- the scoreboard record line
- the TeamOverview "Record" stat
- BlazersAdvanced home/away W-L and the "record" subtitle

Their surrounding stats (PPG, net rating, …) stay.

## Risks / Trade-offs

- **[A spoiler spot is missed in some component]** → The audit list in Context comes from searching for `scoreText`, `winner`, `recordText`, `recordSummary`, `gameResult`, `wins`. Task 3.4 repeats that search after implementation and checks every hit, and does a browser pass over every tab with spoilers off.
- **[Header overflow on small phones]** → Measure `scrollWidth` at 360 and 390 px in Playwright. If it overflows, shorten the brand area first. The tabs stay.
- **[Hidden by default may confuse the user on first visit ("where are the scores?")]** → Every hidden spot says "Show score" / "Hidden while spoilers are off". The header icon is the eye, as in most spoiler UIs.
- **[Revealed ids are per device]** → Acceptable for a personal app without login.
- **[Season averages still hint at results]** → Accepted by the user's scope choice and documented as a non-goal.

## Migration Plan

Additive and client-only. The first deploy defaults everyone (only the owner) to spoilers off. Rollback is reverting the commits. The stored keys are harmless if left behind.
