# Tasks

## 1. Full MVP standings in the build

- [ ] 1.1 Make the MVP builders also return `standings` (ESPN id → rank, score, gap, atRisk) for the whole pool and the per-player volumes needed for reasons (NFL dropbacks/touches by ESPN id, NBA games/team games/minutes). Memoize the MVP computation so other builders can reuse it. Verify that `ONLY=mvp node scripts/build-data.mjs` writes an identical `mvp.json` apart from `updatedAt` (diff against a copy made beforehand), and that the logged standings count equals `poolSize`.
- [ ] 1.2 Commit ("Expose full MVP standings from the data build").

## 2. Player index

- [ ] 2.1 Add a roster loader for all 32 NFL and 30 NBA teams (concurrency 8, handles flat and grouped `athletes`, retries a failed team and records missing teams in the header). Verify by logging per-league player counts (NFL > 1,500, NBA > 400) and that the Jets and Blazers rosters match their team pages.
- [ ] 2.2 Add the `players` builder that writes `players-nfl.json` and `players-nba.json`. Each player carries `mvp` as a standing or a `reason`, using design decision 3's order and the name + team fallback for unmapped NFL players. Each league fails independently, and when MVP data is missing every row gets "MVP data unavailable". Verify that every row has a standing or a non-empty reason, and that ranks 1–10 equal the `mvp.json` top 10 (same names, scores, and order).
- [ ] 2.3 Spot-check reasons with the build log for one example of each: NFL defender, QB below the dropback minimum (number shown), NBA under 25 mpg (minutes shown), NBA 65-game exclusion if any, and a no-games player. Log the count of unmatched ranked NFL players.
- [ ] 2.4 Document both files in the `build-data.mjs` header and the README's "How it works". Commit ("Build NFL and NBA player search index with MVP standing").

## 3. Search on the team page

- [ ] 3.1 Add `src/lib/playerIndex.ts`: index types, name normalization (NFD, strip accents and punctuation, lowercase), and the matcher/ranker from design decision 4. Verify by running it in the dev console or a small script against the built index: "doncic" finds Luka Dončić, "josh al" finds Josh Allen and not other Joshes, "mahomes" finds Patrick Mahomes, and a single character returns nothing.
- [ ] 3.2 Build `src/components/PlayerSearch.tsx`:
  - combobox input with lazy index load on first focus
  - up to 8 results with headshot, name, position · team, and "MVP #rank" or "Not ranked"
  - "N more, keep typing" and "No player found"
  - arrow keys, Enter, Escape and outside-click handling
  - navigates to the player page and clears the input

  Render it above the tabs in `TeamPage.tsx` (NFL for Jets, NBA for Blazers). Verify in the browser at 390px and 1200px, light and dark mode: no horizontal scroll, and keyboard and tap both open a player.
- [ ] 3.3 Commit ("Add player search to the team pages").

## 4. Player page

- [ ] 4.1 Add the MVP standing card to `PlayerPage.tsx`:
  - ranked: "#rank of N", score, gap, and the 65-game risk tag
  - not ranked: the reason
  - unavailable: a short note

  It links to `/mvp?league=…`. Verify with a top-10 player (rank and score match the MVP page), a low-ranked eligible player, an NFL kicker, and an NBA bench player.
- [ ] 4.2 Change the back link to "← Back": `navigate(-1)` when there is in-app history, otherwise `/team/{key}`. Verify that searching from the Blazers page and going back returns to the Blazers page, and that a directly opened player URL goes back to its team page.
- [ ] 4.3 Add the search and MVP standing to the README feature list, run `npm run lint` and `npm run build`, and commit ("Show MVP standing and a real back link on player pages").

## 5. Integration check

- [ ] 5.1 Run the full `node scripts/build-data.mjs` and `npm run build`. Then, on the Jets page search "mahomes" and on the Blazers page "lebron", open each, check the stats and the MVP card, go back, and repeat once at 390px dark mode with no console errors. Push, and confirm that the Deploy workflow passes and that both `players-*.json` files are served on the live site.

## Workflow follow-up

- Archive the change with `/opsx:archive` once it is live and reviewed.
