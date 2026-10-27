# nba-watch-link Specification

## Purpose

Takes the user from a finished NBA game in the tracker straight to that game on NBA.com, where its highlights and League Pass replay are.

## Requirements

### Requirement: Watch link on finished NBA games
The page of every finished NBA game SHALL show a "Watch on NBA.com" link. This applies to Blazers games and to other NBA games opened from the Live tab. The link SHALL open in a new browser tab. It SHALL NOT be shown for upcoming or live games, or for NFL games.

#### Scenario: Finished Blazers game
- **WHEN** the user opens the page of the Blazers' finished game against the Kings
- **THEN** a "Watch on NBA.com" link is shown, and tapping it opens that game on NBA.com in a new tab

#### Scenario: Live game
- **WHEN** the user opens an NBA game that is in progress
- **THEN** no NBA.com watch link is shown

#### Scenario: NFL game
- **WHEN** the user opens a finished Jets game
- **THEN** no NBA.com watch link is shown

### Requirement: Direct link to the game
When NBA.com's identifier for the game is known, the link SHALL point to that game's own page on NBA.com, identified by the game's date, its away team, and its home team. Team abbreviations that differ between ESPN and NBA.com (for example GS/GSW, NY/NYK, SA/SAS, NO/NOP, UTAH/UTA, WSH/WAS) SHALL still match.

#### Scenario: Known game
- **WHEN** the user opens the finished Kings @ Blazers game and NBA.com's identifier for it is known
- **THEN** the link opens `https://www.nba.com/game/sac-vs-por-<NBA game id>`

#### Scenario: Different abbreviations
- **WHEN** the user opens a finished Warriors @ Knicks game
- **THEN** the link opens the NBA.com page of that game, even though ESPN calls the teams GS and NY

### Requirement: Fallback to the day's games
When NBA.com's identifier for the game cannot be found, the link SHALL open NBA.com's games page for the game's date (US Eastern time), and its label SHALL say that it opens the day's games, not the game itself.

#### Scenario: Identifier unavailable
- **WHEN** NBA.com's schedule could not be loaded and the user opens a finished game played on October 24
- **THEN** the link reads "Find it on NBA.com" and opens `https://www.nba.com/games?date=2026-10-24`

#### Scenario: Late tip-off
- **WHEN** a game tipped off at 10:30 PM Eastern on October 24 (October 25 in UTC)
- **THEN** the fallback opens the games page for October 24

### Requirement: Spoiler mode
With spoilers off and the game's score still hidden, the link SHALL still be shown, together with a short warning that NBA.com shows the final score. The link itself SHALL NOT reveal the score. Once the game's score is shown, the warning SHALL NOT be shown.

#### Scenario: Hidden game
- **WHEN** spoilers are off and the user opens a finished Blazers game they haven't revealed
- **THEN** the page shows the "Watch on NBA.com" link with a note that NBA.com shows the final score, and still no score

#### Scenario: Revealed game
- **WHEN** the user has revealed the game or turned spoilers on
- **THEN** the link is shown without the warning

### Requirement: Works on phone and laptop, light and dark
The link SHALL be usable at about 390px width and on a laptop, in light and dark mode, without horizontal page scroll. It SHALL be easy to tap on a phone.

#### Scenario: Phone
- **WHEN** a finished NBA game is opened on a 390px phone in dark mode
- **THEN** the watch link is fully visible, readable, and tappable without horizontal scrolling
