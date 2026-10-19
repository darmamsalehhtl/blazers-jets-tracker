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
- **Live tab:** every NFL and NBA game in progress, with full stats for whichever one you pick.
- **Draft tab:** next NFL draft order if the season ended today (record, then strength of schedule), all 7 rounds, with traded picks and the Jets' picks up top.
- Light/dark mode toggle.

## How it works

- Static site (Vite + React + TypeScript + Tailwind) hosted on GitHub Pages.
- Live data comes straight from ESPN's public JSON endpoints in the browser. They send open CORS headers, so no server is needed.
- `scripts/build-data.mjs` generates the season-analytics JSON. GitHub Actions runs it on every push and every 3 hours, then redeploys. Draft-order inputs (the season schedule from nflverse and traded picks parsed from Wikipedia) come from the same script; `scripts/draft-trades-snapshot.json` is the fallback if Wikipedia can't be read.

## Run locally

```sh
npm install
node scripts/build-data.mjs   # optional: season analytics into public/data/
npm run dev
```

## Notes

- ESPN's endpoints are unofficial and could change without notice. All of that code lives in `src/lib/espn.ts`.
- GitHub turns off scheduled workflows in repos with no activity for 60 days. If the advanced data stops updating, push a commit or run the **Deploy** workflow manually from the Actions tab.
