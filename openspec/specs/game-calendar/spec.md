# game-calendar Specification

## Purpose

Lets the user pick any date on a calendar and see every NFL and NBA game played or scheduled that day, with each game's full stats one tap away.

## Requirements

### Requirement: Calendar tab
The header navigation SHALL include a Calendar entry that opens the calendar page. The entry and the rest of the header SHALL fit on a 390 px wide phone without the page scrolling sideways.

#### Scenario: Open the calendar
- **WHEN** the user taps Calendar in the header
- **THEN** the calendar page opens showing the current month, with today highlighted and selected

#### Scenario: Phone width
- **WHEN** the site is viewed 390 px wide
- **THEN** every header entry, including Calendar, is visible and the page does not scroll sideways

### Requirement: Month navigation
The calendar SHALL show one month at a time as a grid of days, starting weeks on Sunday. The user SHALL be able to go to the previous or next month and back to today, with no limit on how far into the past or future they go.

#### Scenario: Previous month
- **WHEN** the user is viewing October 2026 and taps the previous-month button
- **THEN** the grid shows September 2026

#### Scenario: Back to today
- **WHEN** the user is viewing March 2025 and taps Today
- **THEN** the grid shows the current month and today is selected

### Requirement: Team game markers
Each day on which the Jets or the Blazers play SHALL be marked on the grid with that game's opponent logo. The marker SHALL show W or L for a finished game only when spoiler mode allows that game's result to be shown.

#### Scenario: Blazers game day
- **WHEN** the Blazers play the Kings on October 24
- **THEN** October 24 on the grid shows the Kings' logo

#### Scenario: Spoilers off
- **WHEN** spoilers are off and the Jets' finished game on October 26 hasn't been revealed
- **THEN** October 26 shows the opponent's logo but no W or L

### Requirement: Games on the selected date
Selecting a date SHALL list every NFL and NBA game on that date, as ESPN's scoreboard dates them (US Eastern game day). Jets and Blazers games SHALL come first and be starred, then the other NFL games, then the other NBA games, each group in start-time order. A date with no games SHALL say so.

#### Scenario: NBA night
- **WHEN** the user selects a date with 10 NBA games and no NFL games, one of them the Blazers'
- **THEN** 10 games are listed, the Blazers game first and starred

#### Scenario: Sunday in the fall
- **WHEN** the user selects a Sunday with 13 NFL games and 6 NBA games
- **THEN** 19 games are listed, with the NFL games before the NBA games, apart from a starred Jets or Blazers game at the top

#### Scenario: No games
- **WHEN** the user selects a day in July with no NFL or NBA games
- **THEN** the page says there are no NFL or NBA games that day

### Requirement: Game state in the list
Each listed game SHALL show its league and both teams. A finished game SHALL show its final score, unless spoiler mode hides it, in which case it SHALL offer to show that game's score. A live game SHALL show its live score and clock. An upcoming game SHALL show its start time in the user's time zone and its TV channel when known.

#### Scenario: Finished game, spoilers on
- **WHEN** spoilers are on and the user selects a past date
- **THEN** each finished game shows its final score

#### Scenario: Finished game, spoilers off
- **WHEN** spoilers are off and the user selects a past date
- **THEN** no final scores are shown, and each finished game offers to show its score

#### Scenario: Upcoming game
- **WHEN** the user selects next Saturday
- **THEN** each game shows its start time and its TV channel when ESPN lists one

### Requirement: Game stats from the calendar
Tapping a listed game SHALL show that game's full stats on the same page, as the Live tab shows them. For a finished game that's the box score with per-player stats, plays and team comparison; for an upcoming game it's what ESPN has before kickoff or tip-off. Spoiler mode SHALL apply to the game view as it does elsewhere.

#### Scenario: Finished NBA game
- **WHEN** the user selects a past date and taps a finished NBA game
- **THEN** that game's box score with per-player stats is shown below the list

#### Scenario: Other team's NFL game
- **WHEN** the user taps a finished NFL game that doesn't involve the Jets
- **THEN** that game's stats are shown, just as for a Jets game

### Requirement: Shareable calendar state
The selected date and the selected game SHALL be kept in the page URL, so reloading, going back, or opening a shared link shows the same date and game.

#### Scenario: Reload
- **WHEN** the user selects October 27, 2026, taps a game and reloads the page
- **THEN** October 27, 2026 is still selected, its month is shown, and the same game's stats are open

#### Scenario: Back button
- **WHEN** the user selects October 27 and then October 28, and presses back
- **THEN** October 27 is selected again

### Requirement: Live refresh
While the selected date has a game in progress, its game list SHALL refresh at the site's live interval (20 seconds). Dates with no game in progress SHALL NOT poll that often.

#### Scenario: Live game today
- **WHEN** today is selected and an NBA game is in progress
- **THEN** that game's score in the list updates within about 20 seconds of ESPN updating it

#### Scenario: Past date
- **WHEN** a past date with only finished games is selected
- **THEN** the list is not re-fetched every 20 seconds
