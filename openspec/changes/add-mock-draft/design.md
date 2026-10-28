# Design

## Context

- `src/pages/DraftPage.tsx` builds the live order in the browser. It reads `draft.json` (opponents and traded picks) and polls ESPN standings, then runs `draftTeams` → `draftOrder` → `draftBoard` in `src/lib/draft.ts`. Each `DraftPick` has `owner` (or `undefined` with `candidates` when the sources disagree), `original`, `round`, `pick` and `overall`.
- ESPN's core API has the 2027 board at `sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2027/draft/athletes`. It's paged, and each item is a `$ref`. Checked on 2026-10-28: there are 50 prospects, CORS is open, and the 2026 board ended with 689.
  - Each prospect has an `OVR RK` (overall) and a `POS RK` attribute, a position, height and weight, a college `logo.href`, a college `$ref` (name lives at `/v2/colleges/{id}`), `analysis[]` with a `predraft` scouting text, and a player-card link.
- ESPN has team depth charts at `site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{id}/depthcharts`. They're grouped by formation, and slot keys are things like `qb`, `lt`, `lde`, `lcb` and `fs`. The athletes there have no age. Ages come from the team roster, which `leagueRosters` already fetches for every team.
- The build's single play-by-play pass (`buildJets`, shared through `once()`) already accumulates offense and defense per team with `passEpa` and `rushEpa`. Only `offEpa` and `defEpa` leave it today.
- nflverse publishes `draft_picks/draft_picks.csv` with season, round, team and position. The build already maps nflverse team names to ESPN abbreviations.
- Spoiler mode exempts the Draft tab. The mock shows no results beyond the order the tab already shows.

## Goals / Non-Goals

**Goals:**
- Make picks that look sensible to a fan: a pick shouldn't be a big reach, a team shouldn't double up on a position, and a team that just drafted a QB shouldn't take another.
- Make the pick logic small, deterministic and readable, with every weight in one constant, the same way `MVP_WEIGHTS` works.
- Keep the expensive work in the data build. The browser only simulates.

**Non-Goals:**
- Trades during the mock, randomness, or several mock versions.
- Free agency, contracts or cap space. There's no reliable free source.
- Compensatory picks. The order doesn't have them either.
- An NBA mock draft.

## Decisions

### 1. Build computes inputs, browser simulates

`mock-draft.json` carries `{ available, draftYear, prospectCount, prospects[], needs{} }`. The browser runs the simulation on the live `draftBoard` output.

**Rejected:** simulating in the build. The order changes with every ESPN standings poll, but the build only runs every 3 hours, so a build-made mock would show a different order from the one on the same page.

**Rejected:** fetching prospects in the browser. That's 50 to 700 `$ref` requests on each visit.

### 2. Prospects

- Page through `draft/athletes?limit=100&page=N`, then fetch each `$ref` with `pool(…, 8)`. Fetch each college once, deduped by id.
- Keep these fields:
  - `id`, `name`, `pos`, `group`
  - `rank` (OVR RK) and `posRank`
  - `college` and `collegeLogo`
  - `height` and `weight` as display strings
  - `note` (the first `predraft` analysis, cut at about 400 characters on a sentence boundary)
  - `url` (the player card)
- Sort by rank. Unranked prospects go after the ranked ones in ESPN's order.
- With zero prospects, the builder throws, so the file records `available:false` and the error.

### 3. Position groups

ESPN positions map to 12 groups: QB, RB (RB, FB), WR, TE, OT (OT, T), IOL (G, OG, C, OL), EDGE (DE, EDGE, OLB), DT (DT, NT, DL), LB (LB, ILB, MLB), CB, S (S, FS, SS), and ST (PK, K, P, LS).

- On a pro roster, `OLB` is mapped by depth-chart slot instead: `lolb`/`rolb` count as EDGE and `wlb`/`slb` count as LB.
- An unmapped prospect position is logged and kept under its raw label with need 0. It never crashes.

### 4. Team needs (build)

`needs[ESPN abbr][group]` is a value from 0 to 1, plus `top: group[]` for the 3 largest. It's computed from three signals, with weights in `NEED_WEIGHTS`.

**Unit play (0.4).** This is the percentile of the worst unit among the 32 teams:
- pass offense EPA/play: QB, WR, TE, OT
- rush offense: RB, IOL
- pass defense allowed: CB, S, EDGE
- rush defense allowed: DT, LB

`once()` exposes `teamUnits` (pass and rush EPA for each side) through `leagueInput`, so play-by-play is still read once.

When play-by-play is missing, for example before week 1, this weight is spread over the other two signals.

**Starters (0.35).** The depth chart's first formation is taken for each side. Slot keys map to groups, and the starter count per group is:

| Group | Starters |
| --- | --- |
| QB | 1 |
| RB | 1 |
| WR | 3 |
| TE | 1 |
| OT | 2 |
| IOL | 3 |
| EDGE | 2 |
| DT | 2 |
| LB | 2 |
| CB | 3 |
| S | 2 |

The score is the share of those slots that are empty or held by a player past the position's age cliff. The cliffs are RB 27, WR/CB 29, QB 35 and 31 for everything else, using roster `age`.

**Recent picks (−).** This subtracts 0.5 for each round 1 pick and 0.25 for each round 2 pick the team made in that group in the last 3 drafts. A round 1 QB in that window caps QB need at 0.1.

The result is clamped to [0, 1]. ST is always 0.

If a team's depth chart or roster fails, that team's starter signal is spread like the unit signal. The team is listed in `missingTeams`.

### 5. Pick logic (`src/lib/mockDraft.ts`)

Picks go in `overall` order over a mutable copy of the needs. For the team on the clock (`owner`, or `original.abbr` when `owner` is undefined, flagged `uncertain`):

- `value(r) = exp(-(r - 1) / 24)`, the board value of overall rank `r`.
- `score = value(r) × posValue(group, need) × (1 + 0.6 × need[group])`.
- `posValue` sets how much each position is worth:

  | Group | posValue |
  | --- | --- |
  | QB | 1.15, only when QB need ≥ 0.3, otherwise 1.0 |
  | EDGE | 1.08 |
  | OT | 1.06 |
  | CB | 1.04 |
  | WR | 1.03 |
  | DT | 1.0 |
  | S | 0.95 |
  | TE | 0.94 |
  | IOL | 0.94 |
  | LB | 0.92 |
  | RB | 0.9 |
  | ST | 0.4 |

  The QB premium is tied to need so that a team without a QB need doesn't take one just for being a QB.
- **Reach limit:** a prospect can only be picked if `r ≤ bestAvailableRank + max(6, ceil(0.35 × overall))`. ST prospects are excluded before round 5.
- The highest score wins. A tie goes to the better rank.
- **After a pick:** `need[group] *= 0.3`, or `*= 0.1` for QB.
- The output per pick is `{ prospect, fills: group | null, uncertain }`.
  - `fills` is set when the group was among the team's original top 3 needs.
  - A pick with no prospects left gets `prospect: null`.
- The whole thing is a pure function, memoized on `(picks, data)`, so a reload with the same inputs gives the same mock.

Two checks against the spec:
- **Close call:** a CB 3 ranks below the best available, at need 1 versus 0, scores `0.88 × 1.6 ≈ 1.41` against 1. The CB wins.
- **Big reach:** at pick 5, a WR ranked 40th fails the reach limit, since 40 is more than 5 + 6.

### 6. UI

- `DraftPage` reads `useDataFile<MockDraftData>('mock-draft')`.
- `PickRow` becomes a button-like row with `aria-expanded`:
  - First line: the team, as today.
  - Second line: the college logo (16 px), the prospect's name in bold, then `WR · Ohio State`.
  - The record/SOS column on the right stays, and on phones its SOS line is dropped so the row fits.
- The expanded panel inside the `<li>` shows:
  - `#6 on ESPN's board · CB2`
  - height and weight
  - the note
  - "Top needs: CB, OT, WR"
  - "Fills the Jets' top need", or "Best available"
  - an "ESPN player card" link (`target=_blank`)
- Several rows can be open at once. Open state is local and isn't put in the URL.
- A `null` prospect row says "ESPN's board (50 prospects) doesn't reach this pick yet".
- An uncertain owner shows "uncertain" next to the player line.
- The Jets picks card adds the prospect's short name and position under each pick.
- If mock data is unavailable, a one-line notice above the round tabs says so, and the rows show only today's content.
- The footnote gains one sentence on how the mock works and that the board comes from ESPN.

## Risks / Trade-offs

- **[ESPN's board is short until spring (50 now)]** → The spec says picks are filled only as far as the board goes, with a clear note. It grows by itself.
- **[Need weights are subjective]** → The weights live in one constant, and a task sanity-checks the round 1 output and the needs for all 32 teams before shipping.
- **[Depth charts vary (3-4 vs 4-3, nickel packages)]** → Only the first formation per side is used, slots are mapped by key, and unknown keys are ignored.
- **[ESPN positions may use EDGE, DE or OLB inconsistently]** → They're all mapped to EDGE for prospects, and unmapped labels are logged without failing.
- **[Build cost]** → The build makes about 64 roster and depth-chart requests plus up to about 700 prospect requests, at a concurrency of 8. That's acceptable every 3 hours. Rosters are fetched once and shared with the player search builder if they run in the same build.
- **[nflverse draft file renamed or moved]** → The recent-picks signal is then skipped and logged, and needs still work.

## Migration Plan

This is purely additive: a new data file and new UI on an existing page. CI runs the new builder automatically. To roll back, revert the commits. A missing `mock-draft.json` already shows the order-only view with a notice.
