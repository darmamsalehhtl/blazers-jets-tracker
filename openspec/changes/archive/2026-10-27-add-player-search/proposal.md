# Proposal

## Why

Player pages exist for every NFL and NBA player, but the only ways to reach one are through Jets/Blazers rosters, box scores, or the top-10 MVP list. There is no way to look up an arbitrary player, like a rival's quarterback or a trade target, and see their stats. The MVP race also only reveals the top 10 (plus the best Jets/Blazers player), so "where does player X stand?" can't be answered for anyone else.

## What Changes

- A **search box on the team page**, above the tabs. On the Jets page it searches all current NFL players; on the Blazers page it searches all current NBA players.
  - Results appear as you type: face, name, position · team, and the player's MVP standing.
  - Selecting a result opens that player's page, with all stats.
  - Matching ignores case and accents (e.g. "doncic" finds "Dončić").
  - Search works instantly and offline from a prebuilt list of current players.
- The **MVP race ranks every eligible player**, not just the top 10, and the rank is stored for each of them.
  - Players outside the eligible pool are shown as **"Not ranked"** with the specific reason. Examples: "Defenders aren't ranked", "Not enough dropbacks yet (41 of 84)", "Fewer than 25 minutes per game (18.3)", "Can't reach 65 games anymore".
- The **player page shows the player's MVP standing**: rank of N, score, gap to the leader, or "Not ranked" with the reason.
- The player page's back link returns to where the user came from instead of always pointing to the Jets/Blazers roster.

## Capabilities

### New Capabilities
- `player-search`: Finding any current NFL or NBA player from the team page (league chosen by the team), how results match and display, and opening the player's page.

### Modified Capabilities
- `mvp-race`: Adds requirements for a full ranking of every eligible player, a "Not ranked" reason for everyone else, and showing a player's MVP standing on their player page. Existing requirements (top-10 page, scoring, eligibility) are unchanged.

## Impact

- `scripts/build-data.mjs`:
  - New per-league player index (`players-nfl.json`, `players-nba.json`), built from ESPN team rosters, with each player's MVP rank/score/gap or not-ranked reason.
  - The MVP builder exposes its full ranked pool, plus the per-player volume numbers needed for not-ranked reasons.
- New search component on `src/pages/TeamPage.tsx`; MVP standing card and back-link change on `src/pages/PlayerPage.tsx`.
- No new dependencies and no backend. ESPN's live search API is deliberately not used (see design).
- README feature list and data-file docs.
