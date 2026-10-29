# Tasks

## 1. Shared injury label

- [x] 1.1 Add an exported `injuryLabel(details)` helper to `src/lib/summary.ts`. It joins side, type and detail, removes duplicates, and drops empty or "Not Specified" parts. Switch the Injuries card in `src/components/game/GameInfo.tsx` to use it. Verify that `npm run build` and `npm run lint` pass and that the Info tab of a finished Blazers game (e.g. event 401909880) shows the same injury lines as before. Commit ("Share the injury label between game views").

## 2. Injured players in Did not play

- [ ] 2.1 In `BoxScore` (`src/components/game/BoxScore.tsx`), for NBA games, compute the selected team's injured players: entries from `s.injuries` for `tp.team.id` whose athlete id is in none of that team's box-score groups (design Decision 1). Pass them to the first `NbaGroup`. In `NbaGroup`, show the card when `dnp.length || injured.length`. Render injured rows after the coach's decision rows: the name button opens the player, a muted second line shows the injury label and "Est. return <short date>" when present, and `StatusPill` sits on the right. Below the rows, add the muted current-report note when there are injured rows. Verify in the dev server on 401909880 (POR @ LAL): POR lists Potter, Carlson and Hansen as coach's decisions, then Youngblood and Sharpe as injured. Robert Williams III, who played, is not listed. Switching to LAL shows Carr and Thiero as injured, and Doncic is not listed. Run `npm run build` and `npm run lint`. Commit ("Show injured players under Did not play").
- [ ] 2.2 Check the card at 390 px and on a laptop, in light and dark mode: no horizontal scroll, the pill doesn't squash the name, and long injury labels wrap. Also check that a Jets box score is unchanged. Fix anything found and commit if needed ("Fit injured rows on phones").

## 3. Docs

- [ ] 3.1 If the README or any in-app help describes the box score's Did not play list, mention that injured players show there with their injury and estimated return. Verify the wording matches the shipped UI. Commit ("Document injured players in the box score") or skip the task if nothing describes it.
