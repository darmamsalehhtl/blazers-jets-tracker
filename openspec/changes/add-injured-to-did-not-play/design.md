# Design

## Context

- `BoxScore` (`src/components/game/BoxScore.tsx`) renders one `NbaGroup` per stat group of the selected team. `NbaGroup` builds `dnp` from `g.athletes` (rows with `didNotPlay` or no stats) and shows them in the "Did not play" card with `a.reason ?? 'DNP'`.
- I checked live ESPN summaries (e.g. events 401909841 PHX @ POR, 401909880 POR @ LAL). Only coach's decisions appear in `boxscore.players[].statistics[].athletes`. Injured players are left out of the box score entirely.
- The same response has `injuries: InjuryGroup[]` (one per team, already typed in `src/lib/summary.ts`), with `status`, `athlete`, and `details { type, location, detail, side, returnDate }`.
- The `injuries` block is ESPN's **current** team report, not a game-day snapshot. For the 10/22 PHX game it returned entries dated 10/27–10/29.
- `GameInfo.tsx` already renders this data: it builds the label inline (`[side, type, detail]`, deduped, without "Not Specified") and uses `StatusPill`.

## Goals / Non-Goals

**Goals:**
- Add injured players to the existing DNP card using data that is already fetched.
- Reuse the injury label and status pill from the Info tab so both places look the same.

**Non-Goals:**
- Game-day injury accuracy (no historical injury source in ESPN's public APIs, see Risks).
- Any change to NFL box scores or to the Info tab's Injuries card beyond extracting the shared helper.

## Decisions

1. **Match by athlete id, exclude anyone in the box score.** Build a set of every athlete id across the selected team's box-score groups, then take that team's `InjuryGroup` (matched on `team.id`) entries whose id is not in the set. This keeps players who played (they are in the box score) and coach's decisions (already listed) from showing up twice. Matching by name was rejected because ids are stable and names vary between endpoints.

2. **Compute in `BoxScore`, pass to the first NBA group only.** NBA has one stat group per team, but the injured list belongs to the team, not the group. So `BoxScore` computes `injured` for `tp.team.id` and passes it to `NbaGroup` (index 0). The card's show condition becomes `dnp.length > 0 || injured.length > 0`.

3. **Extract `injuryLabel(details)` into a shared helper.** Move the inline label logic from `GameInfo.tsx` into a small exported function (in `src/lib/summary.ts`, next to `InjuryGroup`), and use it in both places. `StatusPill` is already exported from `GameInfo.tsx` and is imported as is.

4. **Row layout.** Name button on the left with the injury label and "Est. return <date>" as a muted second line. `StatusPill` on the right, where coach's decisions show their reason text. The date uses the same short format as elsewhere (`toLocaleDateString`, e.g. with `{ month: 'short', day: 'numeric' }`). Under 390 px the second line wraps and the pill stays `shrink-0`.

5. **Notice text.** A muted `text-[11px]` line at the bottom of the card, e.g. "Injury info is ESPN's current report and may differ from game day." Shown only when `injured.length > 0`.

## Risks / Trade-offs

- [The injury report is current, not from game day] For an older game, a player who was out then but has since returned won't be listed, and a return date may already be in the past. → Show the notice (spec requirement). No public historical source was found, so we accept this.
- [Players who aren't on the roster or the report, e.g. G League assignments or personal reasons] They will still be missing. → Out of scope. The card shows only what ESPN reports.
- [Return dates are ESPN estimates and change often] → Label them "Est. return".
- [Live games] The DNP card already appears during live games, and injured players show there too. That is correct, since the report is current.
