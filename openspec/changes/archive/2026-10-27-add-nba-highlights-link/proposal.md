# Proposal

## Why

The user has NBA League Pass, where the highlights and full replays of every finished game live on NBA.com. Right now the tracker's game page has no way to get there: they have to search NBA.com for the game by hand.

## What Changes

- **"Watch on NBA.com" button.** The page of every finished NBA game (Blazers games and any other NBA game opened from the Live tab) gets this button. It opens that game's page on NBA.com in a new tab, where the highlights and the League Pass replay are.
- **The link goes straight to the game.** To link `nba.com/game/{away}-vs-{home}-{nbaGameId}` directly, the app needs NBA.com's own game ID, which ESPN does not provide. So:
  - The data build looks up NBA.com's game IDs for the season and writes a small lookup file.
  - If that file isn't available, the browser tries the NBA.com schedule itself.
  - If both fail, the button opens NBA.com's games page for that day (`nba.com/games?date=…`), and its label says so.
- **Spoiler mode:** with spoilers off and the score still hidden, the button is still shown, with a short warning that NBA.com shows the final score.
- **Not included:**
  - NFL games
  - upcoming and live games
  - embedding video in the app

## Capabilities

### New Capabilities
- `nba-watch-link`: the link from a finished NBA game to its NBA.com game page (highlights and League Pass replay), how the NBA.com game is identified, the fallback, and how it behaves in spoiler mode.

### Modified Capabilities

None. The `spoiler-mode` requirements stay as they are: the link is an addition to the hidden game page and shows no score itself. Its spoiler behavior is specified in the new capability.

## Impact

- **`scripts/build-data.mjs`:** a new `nba-games` builder that writes `public/data/nba-games.json`, a map from date and teams to the NBA.com game path. It is fetched from NBA.com's public schedule feed.
- **New:**
  - `src/lib/nbaLink.ts`: resolves an ESPN NBA event to an NBA.com URL, using the build file, then the browser fetch, then the day page.
  - a small `NbaWatchLink` component
- **Modified:** `GameView.tsx`, where the button is rendered for finished NBA games in both hidden and revealed mode.
- **New external dependency on NBA.com's schedule feed** (`cdn.nba.com`). It is unofficial. It can't be reached from the development machine (Akamai "Access Denied"), so whether it works from GitHub Actions and from the user's browser is only known after deploying. The day-page fallback keeps the button useful either way.
