# Tasks

## 1. Data build: mock-draft.json

- [x] 1.1 In `scripts/build-data.mjs`, expose `teamUnits` (each team's offense and defense `passEpa`/`rushEpa`) from `buildJets` through `leagueInput`, and check that `nyj.json` is unchanged. Commit ("Expose team pass and rush EPA to the data build").
- [x] 1.2 Add `mockProspects(draftYear)`. It pages through ESPN's draft athletes, resolves `$ref`s with `pool(…, 8)`, and fetches colleges deduped by id. It maps positions to the 12 groups (design 3), keeps the fields from design 2, and logs unmapped positions. Run `ONLY=mock-draft` and check the 50 prospects (ranks 1–50, groups set, notes cut on sentences). Commit ("Fetch ESPN's draft prospect board").
- [x] 1.3 Add `teamNeeds()` per design 4 with `NEED_WEIGHTS`, built from three signals:
  - unit percentiles from `teamUnits`
  - depth-chart starters (first formation per side, with slot→group mapping, starter counts and age cliffs, joined with roster ages)
  - nflverse `draft_picks.csv` (round 1 and 2 picks in the last 3 drafts, team names mapped to ESPN abbreviations, and the round 1 QB cap)

  Each signal must fail on its own: spread its weight and list the affected teams in `missingTeams`.
- [x] 1.4 Register the `mock-draft` builder. It writes `{ available, draftYear, prospectCount, prospects, needs, missingTeams }` and throws when there are no prospects. Update the build header comment and the README data-files list. Print every team's top 3 needs and check that they're plausible. For example, a team with a recent round 1 QB has no QB need, and the worst pass defenses list CB, S or EDGE. Commit ("Build team needs and the mock draft data file").

## 2. Pick logic

- [x] 2.1 Create `src/lib/mockDraft.ts`. It holds the `MockDraftData`, `Prospect` and `MockPick` types, the group constants, `posValue`, the reach limit, the ST rule before round 5, need decay after a pick, the `uncertain` owner fallback, `fills`, and `null` once the board runs out. It's a pure `mockDraft(picks, data)` with every weight in one constant.

  Check it with a scratch script against the built data and the current order:
  - no prospect is picked twice
  - the design's close-call and big-reach examples hold
  - a team with two round 1 picks doesn't double up on QB
  - the same inputs give the same output

  Commit ("Add the mock draft pick logic").

## 3. Draft tab UI

- [ ] 3.1 In `DraftPage.tsx`, load `mock-draft` and memoize `mockDraft(board.picks, data)`. `PickRow` gets the prospect line (college logo, name, `POS · College`), the "uncertain" mark and the "board doesn't reach this pick yet" state. It expands into a details panel (`aria-expanded`) with rank, position rank, size, note, top needs, why the pick fits, and the ESPN player-card link. On phones, drop the SOS line. Commit ("Show mocked players on every draft pick").
- [ ] 3.2 Add each mocked prospect's name and position under the pick number on the Jets picks card. Add the unavailable-data notice (the order still works) and the footnote sentence on how the mock works. Commit ("Show the Jets' mocked players and mock draft notes").
- [ ] 3.3 Verify in Playwright at 390 px dark and 1200 px light, with no horizontal overflow and no console errors:
  - round 1 is fully filled with no duplicates
  - expanding and collapsing a Jets pick shows the right details
  - round 2 shows the "board doesn't reach" state after the 50th prospect
  - reloading gives the same mock
  - with `mock-draft.json` replaced by `{"available":false}`, the order-only view shows with the notice

  Add the feature to the README feature list. Commit ("Document the mock draft").

## 4. Integration check

- [ ] 4.1 Push and confirm the Deploy workflow passes. Check the deployed `data/mock-draft.json` (prospect count, needs for 32 teams, `missingTeams`), then open the live Draft tab and confirm the Jets' round 1 pick shows a mocked player. Report the Jets' mocked picks to the user.

## Workflow follow-up

- Archive the change with `/opsx:archive` once the user has looked at the live mock draft.
