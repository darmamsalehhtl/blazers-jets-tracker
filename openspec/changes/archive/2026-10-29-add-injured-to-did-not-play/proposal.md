# Proposal

## Why

The "Did not play" card under an NBA box score only lists players ESPN puts in the box score, which in practice means coach's decisions. Injured players are left out of ESPN's box score entirely, so the card hides the main reason most players miss a game. ESPN's game summary already returns each team's injury report next to the box score, so the app can fill the gap without a new request.

## What Changes

- The NBA "Did not play" card also lists injured players from the summary's injury report who are not in that team's box score.
- Each injured row shows the injury (side, body part, detail, e.g. "Right Knee Surgery"), a status pill (Out, Day-To-Day, ...) and ESPN's estimated return date when there is one.
- Coach's decision rows stay as they are. Injured players are listed after them.
- A short note on the card explains that the injury info is ESPN's current report, not a snapshot from game day.
- The card now also appears when a team had no coach's decisions but did have injured players.

Out of scope: NFL box scores (inactives work differently there), historical injury reports from game day, and changes to the existing "Injuries" card on the game info tab.

## Capabilities

### New Capabilities
- `nba-did-not-play`: what the "Did not play" list under an NBA box score shows, covering coach's decisions and injured players with their injury and expected return.

### Modified Capabilities

(none)

## Impact

- `src/components/game/BoxScore.tsx`: `NbaGroup` gets the team's injury entries and renders them in the DNP card.
- `src/components/game/GameInfo.tsx`: the existing injury-label formatting and `StatusPill` are reused (formatting moves to a small shared helper).
- No new ESPN endpoints. The data is in the `injuries` field of the `summary` response already fetched and typed (`InjuryGroup` in `src/lib/summary.ts`).
- No spoiler impact. Injuries are not scores, results, records or standings.
