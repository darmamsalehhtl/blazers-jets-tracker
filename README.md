# Blazers + Jets Tracker

A personal, real-time stats app for the **Portland Trail Blazers** and the **New York Jets**.
It works on phone and laptop and can be installed to your home screen.

**Live:** https://darmamsalehhtl.github.io/blazers-jets-tracker/

## What it does

- **Home screen:** if the Jets or Blazers are playing, it opens that game automatically (the Jets win if both are on). Otherwise you get a team picker with each team's next and last game.
- **Live games** refresh every 20 seconds and include:
  - scoreboard, line score, down and distance with a field-position strip (NFL), and a win-probability chart
  - box scores, a team stat comparison, game leaders, and play-by-play or a drive chart
  - a shot chart with zone splits (NBA)
  - live analytics: offensive/defensive rating, four factors and biggest run (NBA); success rate, explosive plays, red-zone and third-down efficiency (NFL)
  - odds, injuries, officials and venue info
- **Team pages:**
  - overview with recent form, a scoring trend chart and division standings
  - full schedule for any season
  - 100–286 team stats, each with its **league rank**
  - every player's season stats, sortable
  - roster, including NBA salaries
  - standings and news
- **Advanced:**
  - **Jets:** EPA/play, success rate, PROE, CPOE and more, ranked against all 32 teams; an offense-vs-defense EPA chart for every team; the biggest win-probability swings; per-player EPA with league ranks (from [nflverse](https://github.com/nflverse/nflverse-data)).
  - **Blazers:** pace, offensive/defensive/net rating, four factors, clutch record, a season shot chart, and per-player usage, TS%, AST% and REB%, all computed from every box score of the season.
- **Player pages:** bio, season stats with league ranks, a game-by-game chart, the full game log, every split, career totals, and advanced stats.
- **vs League tab** (on each team page): 25 scatter plots where every dot is a player in the league and your team's players are highlighted, e.g. QB EPA vs CPOE, receiver depth vs YAC, NBA scoring volume vs true shooting, three-point volume vs accuracy, steals vs blocks.
- **Live tab:** every NFL and NBA game in progress, with full stats for whichever one you pick.
- **Player search** (on each team page): find any current NFL player from the Jets page or NBA player from the Blazers page, by name (accents and case don't matter). Results show each player's MVP rank; their page shows all stats plus their MVP standing ("#31 of 88", or "Not ranked" with the reason).
- **MVP tab:** who would win NFL and NBA MVP if the season ended today: a top 10 per league from a transparent score (production, efficiency, team record, availability incl. the NBA 65-game rule), with Jets/Blazers players highlighted.
- **Draft tab:** next NFL draft order if the season ended today (record, then strength of schedule), all 7 rounds, with traded picks and the Jets' picks up top.
- **Watch on NBA.com:** every finished NBA game page links straight to that game on NBA.com (highlights and the League Pass replay). If NBA.com's game id isn't known, it opens NBA.com's games for that day instead. With spoilers off it warns that NBA.com shows the final score.
- **Spoiler mode** (eye button in the header, off by default): finished games show only that they were played, with no score or W/L, and records, standings, game logs and news are hidden too. Tap "Show score" to reveal a single game; live games always show their score. The choice and revealed games are remembered on the device.
- Light/dark mode toggle.

## How it works

- Static site (Vite + React + TypeScript + Tailwind) hosted on GitHub Pages.
- Live data comes straight from ESPN's public JSON endpoints in the browser. They send open CORS headers, so no server is needed.
- `scripts/build-data.mjs` generates the season-analytics JSON. GitHub Actions runs it on every push and every 3 hours, then redeploys. Draft-order inputs (the season schedule from nflverse and traded picks parsed from Wikipedia) come from the same script; `scripts/draft-trades-snapshot.json` is the fallback if Wikipedia can't be read. The MVP race (`mvp.json`) is scored there too: weighted z-scores of production, efficiency and team record (weights and their backtest in `MVP_WEIGHTS`). The same run writes `players-nfl.json` / `players-nba.json`, every rostered player with their MVP standing or not-ranked reason, which powers the player search. `nba-games.json` maps every NBA game to its NBA.com game page (from NBA.com's public schedule feed), for the "Watch on NBA.com" link on finished games.

## Run locally

```sh
npm install
node scripts/build-data.mjs   # optional: season analytics into public/data/
npm run dev
```

## Planning changes with OpenSpec

The repo uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for spec-driven changes. Project constraints live in `openspec/config.yaml`; specs in `openspec/specs/`, proposed changes in `openspec/changes/`. In Claude Code:

- `/opsx:propose "idea"` – write a proposal, design and task list for a change
- `/opsx:apply` – implement the tasks
- `/opsx:archive` – merge the change into the specs once it's done

`npx @fission-ai/openspec list` shows active changes.

## Notes

- ESPN's endpoints are unofficial and could change without notice. All of that code lives in `src/lib/espn.ts`.
- GitHub turns off scheduled workflows in repos with no activity for 60 days. If the advanced data stops updating, push a commit or run the **Deploy** workflow manually from the Actions tab.
