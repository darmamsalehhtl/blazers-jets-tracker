# Design

## Context

See proposal.md for the motivation and specs/mvp-race/spec.md for the requirements.

Relevant current state:
- `scripts/build-data.mjs` already streams nflverse play-by-play once (`buildJets`) and keeps league-wide passer, receiver and rusher accumulators (`collectPlayers`) plus a gsis→ESPN id map. These feed `nfl-league.json`.
- The same script reads ESPN's `byathlete` stats for every NBA player (`nba-league.json`) and loads the NFL schedule and results (`games.csv`) for the draft order.
- Pages read precomputed files with `useDataFile` (`src/lib/seasonData.ts`). Headshots come from the ESPN CDN by athlete id; `LeagueScatter.tsx` already builds square face URLs.
- The nav bar currently holds Live, Jets, Blazers and Draft plus the theme toggle, and is already tight at 390px.

## Goals / Non-Goals

**Goals:**
- A transparent, explainable score that tracks how voters actually behave (production, efficiency, winning, availability), computed the same way every 3 hours.
- One consistent data source per league, so every number in a row reflects the same point in the season.

**Non-Goals:**
- Predicting the end-of-season winner or a vote share/probability. The score answers "if it ended today".
- Defensive Player, Rookie of the Year or other awards.
- Fitting the weights statistically to historical voting. Weights are hand-set, documented, and easy to tune.
- Live (20s) updates. MVP standings move per game, not per play.

## Decisions

### 1. Precompute in CI as `public/data/mvp.json`
A new `mvp` builder in `build-data.mjs` writes `{ nfl: {...}, nba: {...}, updatedAt }`, where each league is `{ available, error?, season, through, smallSample, candidates[], ours? }`.
- Each league is built independently, so one failing still lets the other render (spec: Data unavailable).
- The `mvp` builder reuses the single Jets play-by-play pass (`once()`), the same way `nfl-league` does, so the large file isn't downloaded twice.
- *Alternative:* compute in the browser. Rejected: the NFL needs play-by-play (too big for a phone), and the NBA would need several ESPN calls per visit.

### 2. NFL: everything from nflverse
EPA, yards, touchdowns, interceptions, fumbles lost and games played all come from play-by-play. Team records come from `games.csv`. All numbers then line up as "through week N".
- *Alternative:* ESPN byathlete for counting stats plus nflverse EPA. Rejected because nflverse can trail ESPN by a few days, so one row would mix two different weeks.
- `collectPlayers` gains extra fields (pass yards, pass TD, rush/receiving TD, fumbles lost, games). They are additive, so `nyj.json` and `nfl-league.json` stay unchanged.
- Positions come from nflverse `players.csv`, which is already downloaded for the id map.

### 3. NBA: ESPN byathlete plus ESPN standings
Current-season regular-season totals come from `byathlete` (already used). Team win % and team games played come from ESPN standings.

### 4. Scores are weighted z-scores, displayed as 50 + 15·z
Each input is z-normalized against a reference pool of plausible candidates, then combined with fixed weights. Display score = `clamp(50 + 15 × composite, 0, 100)`, rounded to 1 decimal. The gap to the leader is the difference in display score.

- Reference pools:
  - NBA: players averaging 25+ minutes per game.
  - NFL: the qualified QB plus skill-player pool. Non-QBs are z-scored in the same pool, so their lower raw EPA already counts against them.
- **NBA** composite = 0.55·z(production) + 0.20·z(efficiency) + 0.25·z(team win %).
  - **Production:** Game Score per game, approximated as PTS + 0.4·FGM − 0.7·FGA − 0.4·(FTA−FTM) + 0.35·REB + STL + 0.7·AST + 0.7·BLK − 0.4·PF − TOV. The approximation is needed because byathlete doesn't split offensive and defensive rebounds.
  - **Efficiency:** points added over league-average shooting per game, 2·(TS − lgTS)·TSA, where lgTS comes from the totals of all players.
- **NFL** composite = 0.50·z(total EPA) + 0.20·z(production) + 0.30·z(team win %) − 0.8 for non-QBs.
  - **Total EPA:** dropback EPA (sacks and scrambles included) plus designed-run EPA for QBs; receiving plus rushing EPA for skill players.
  - **Production:** scrimmage yards + 20·TD − 45·(INT + fumbles lost).
  - **Why −0.8:** a QB has won 15 of the last 17 MVPs (12 of 13 since 2013), but a historic RB season, like a 2,000-yard rusher, should still reach the top 10. Check this against last season's data during implementation.
- The `reason` field names the factor with the largest weighted positive contribution, e.g. "Team record (12-2)", "Elite production", "Most efficient scorer", "Leads league in EPA".
- *Alternative:* rank by a single public metric (QBR or PER). Rejected: neither accounts for team success, which voters weight heavily.

### 5. Eligibility and pools
- **NBA 65-game rule:** let `T` be team games played and `g` player games.
  - **Excluded:** `T − g > 17`, since the player can no longer reach 65.
  - **At risk:** `g / T < 65 / 82`.
  - Early season (`T < 10`) shows the small-sample note.
- **NFL minimums:** QBs need 12·weeks dropbacks. RB/WR/TE need 8·weeks touches (carries + targets). Defenders and kickers are never ranked.
- The `ours` field holds the best Jets or Blazers candidate with their full rank when they are outside the top 10, or a "none qualifies" flag.

### 6. UI: `/mvp?league=nfl|nba`, defaulting to NFL
- **Default:** NFL, matching the app-wide "Jets first" rule.
- **Layout:** a list card like the Draft page. Each row shows the rank, a face (reusing the face URL helper), name and team, score with "−x.x" to the leader, a key-stat line and the reason. On phones, team record and secondary stats wrap onto a second line.
- **Highlight:** rows for our team get the team color tint and an inset bar, as on the Draft page.
- **Footer:** the methodology note, the small-sample note and "updated …".

### 7. Nav fits five items on phones
Below the `sm` breakpoint the nav drops the team logos and tightens the padding (`px-2`), keeping text labels. It is checked in the browser at 390px before committing.
- *Alternative:* a "More" menu. Rejected as heavier than needed for five short labels.

## Risks / Trade-offs

- [Hand-set weights can produce a surprising leader] → Show the reason per row and the methodology note, keep the weights in one place, and sanity-check against last season (the actual MVP should finish top 3) before shipping.
- [nflverse lags ESPN by a day or more] → Label NFL data "through week N". Freshness is then consistent, even if slightly behind the Live tab.
- [Early-season noise (NBA in its first weeks now)] → Small-sample note, the 25-mpg reference pool and the eligibility rules dampen outliers.
- [The ESPN byathlete or standings shape changes] → Each league fails independently with a visible message (spec requirement). The build logs the error.
- [Nav overflow on small phones] → Explicit 390px check, and labels without logos on phones.

## Migration Plan

Additive only: a new data file, page, route and nav link. Rollback means reverting the commits, and no other page depends on `mvp.json`.
