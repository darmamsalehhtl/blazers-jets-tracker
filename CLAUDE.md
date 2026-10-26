# CLAUDE.md

Personal real-time stats tracker for the New York Jets (NFL) and Portland Trail Blazers (NBA).
Live: https://darmamsalehhtl.github.io/blazers-jets-tracker/

## Commit a lot

- Commit early and often: one small, focused commit per logical step (a new hook, a component, a fix), not one big commit at the end.
- Push after each batch of commits. Every push to `main` deploys to GitHub Pages.
- Commit as the repo owner (`daryanmamsaleh <181450025+darmamsalehhtl@users.noreply.github.com>`, already set in the repo's git config).
- **Never** add Claude/AI attribution: no `Co-Authored-By` lines, no "Generated with Claude Code". The repo is public and Claude must not show up as a contributor.
- Commit messages: imperative, describe the user-visible change ("Add Draft tab with the live NFL draft order").

## Commands

- `npm run dev`: dev server (base path `/blazers-jets-tracker/`)
- `npm run build`: typecheck (`tsc -b`) and build
- `npm run lint`: oxlint
- `node scripts/build-data.mjs`: regenerate `public/data/*.json` (git-ignored; CI runs it on every push and every 3 hours). `ONLY=draft,nba-league` rebuilds just those files.

## Architecture

- Static Vite + React + TypeScript + Tailwind v4 site with HashRouter. No backend.
- Live data comes straight from ESPN's unofficial JSON APIs in the browser (they allow CORS). All URLs are in `src/lib/espn.ts`.
- Heavy or league-wide data (nflverse play-by-play, season analytics, league player stats, draft inputs) is precomputed by `scripts/build-data.mjs` into `public/data/` and read with `useDataFile` / `useSeasonData` (`src/lib/seasonData.ts`).
- Polling goes through `usePoll` (`src/lib/usePoll.ts`): results are keyed by URL, so a view never renders another view's data. Live games refresh every 20 s, and polling pauses when the tab is hidden.
- Teams are configured in `src/lib/teams.ts` (`nyj`, `por`). Keep code team-agnostic where it's cheap; more teams may come later. When both teams are live, the Jets take priority.

## Requirements to keep

- Every screen must work on a phone (~390 px) and a laptop, in light and dark mode (CSS tokens in `src/index.css`).
- Design: simple and modern. Stats as in-depth as possible.
- Verify UI changes in a browser before committing. ESPN returns 403 to headless Chrome unless you set a normal Chrome user agent and override the `sec-ch-ua` header.

## Planning

Larger features use OpenSpec (`openspec/`, project constraints in `openspec/config.yaml`): `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.
