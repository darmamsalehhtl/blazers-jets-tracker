# Spec Delta

## Purpose

Lets the user browse the tracker without learning how finished Jets and Blazers games ended: a global spoiler switch that hides scores and anything else that reveals results, with a way to reveal a single game.

## ADDED Requirements

### Requirement: Spoiler toggle
Every screen SHALL show a spoiler toggle in the header. It SHALL be off by default, meaning results are hidden. The user's choice SHALL be remembered on the device across visits. Changing it SHALL take effect immediately on the current screen without a reload. The toggle SHALL show its current state and be reachable by keyboard and screen readers.

#### Scenario: First visit
- **WHEN** the user opens the tracker for the first time
- **THEN** the spoiler toggle is off and no final scores are shown

#### Scenario: Turning spoilers on
- **WHEN** the user switches the toggle on while viewing the Jets schedule
- **THEN** the scores and W/L of finished games appear right away

#### Scenario: Choice remembered
- **WHEN** the user turns spoilers on, closes the tab, and opens the tracker again
- **THEN** spoilers are still on

#### Scenario: Storage unavailable
- **WHEN** the browser blocks local storage (for example in private mode)
- **THEN** the toggle still works for the current visit and starts off on the next one

### Requirement: Finished games without a result
While spoilers are off, every finished game that has not been revealed SHALL be shown as played, with its date, opponent, home/away, and a "Final" status. Its score and W/L SHALL NOT be shown, and nothing else in its row, such as styling of the winner, SHALL indicate the winner. This SHALL apply wherever games are listed: the team cards on the home screen, the team schedule, the team overview, the Live tab, and the season series on a game's info.

#### Scenario: Schedule row
- **WHEN** spoilers are off and the user opens the Jets schedule
- **THEN** a finished game shows "Wk 6 · @ Bills · Final" with no score, no W/L, and no green or red marking

#### Scenario: Live tab after the final whistle
- **WHEN** spoilers are off and an NBA game on the Live tab finishes
- **THEN** its chip shows the two teams and "Final" but no score, and neither team is dimmed as the loser

#### Scenario: Upcoming games unchanged
- **WHEN** spoilers are off
- **THEN** upcoming games show their date, time, and TV channel as before

### Requirement: Live games always show the score
Games in progress SHALL show their live score, clock, and all live game details regardless of the spoiler setting. Once a game is final, it SHALL follow the finished-game rules.

#### Scenario: Watching live
- **WHEN** spoilers are off and the Blazers are playing right now
- **THEN** the home screen shows the live game with its score, box score, and play-by-play

#### Scenario: Game ends
- **WHEN** spoilers are off and the live game being viewed goes final
- **THEN** its score and result are hidden like any other finished game

### Requirement: Finished game page
While spoilers are off and the game is not revealed, a finished game's page SHALL show the matchup (teams, date, venue), a "Final" status without the score, and a "Show score" control. It SHALL NOT show the win probability chart, game leaders, box score, team stats, play-by-play or drives, shot chart, or analytics until the game is revealed or spoilers are turned on.

#### Scenario: Opening a past game
- **WHEN** spoilers are off and the user opens last week's Jets game
- **THEN** the page shows both teams and "Final" with a "Show score" button, and no score, box score, or win probability

### Requirement: Reveal a single game
Each hidden finished game SHALL offer a "Show score" control. Revealing a game SHALL show that game's score, result, and full game page everywhere in the app, while the spoiler toggle stays off and other games stay hidden. Revealed games SHALL be remembered on the device. Turning spoilers on and off again SHALL NOT forget revealed games.

#### Scenario: Reveal from the schedule
- **WHEN** spoilers are off and the user taps "Show score" on one schedule row
- **THEN** that row shows its W/L and score, and every other finished game stays hidden

#### Scenario: Revealed everywhere
- **WHEN** the user has revealed the Blazers' last game on the schedule
- **THEN** the home screen team card and that game's page also show its score

#### Scenario: Reveal does not open the game
- **WHEN** the user taps "Show score" on a schedule row
- **THEN** the score is revealed in place and the game page does not open

### Requirement: Other results hidden
While spoilers are off, the app SHALL hide all of the following:
- team and opponent win-loss records, including the team page header, team cards, opponent records, and home/away records
- the standings tab
- per-game result lists and per-game charts (results list, points by game, net rating by game)
- players' game-by-game logs and "last 5 games"
- team news headlines

Each hidden section SHALL be replaced by a short note that it is hidden while spoilers are off, with a control that turns spoilers on.

#### Scenario: Team header
- **WHEN** spoilers are off and the user opens the Blazers page
- **THEN** the header shows the team without its win-loss record

#### Scenario: Standings tab
- **WHEN** spoilers are off and the user opens the Standings tab
- **THEN** a note says the standings are hidden while spoilers are off, with a button to show spoilers

#### Scenario: Player game log
- **WHEN** spoilers are off and the user opens a player's Game log tab
- **THEN** no game-by-game rows are shown, only the hidden note with a button to show spoilers

### Requirement: Season totals stay visible
The spoiler setting SHALL NOT hide season totals and averages (team stats, player season stats and splits, career stats, advanced and efficiency stats, vs League scatter plots), the roster, the Draft tab, the MVP race, player search, or upcoming games.

#### Scenario: Season stats
- **WHEN** spoilers are off and the user opens the Jets Stats tab
- **THEN** the season team stats are shown as usual

#### Scenario: MVP race
- **WHEN** spoilers are off and the user opens the MVP tab
- **THEN** the MVP race is shown unchanged

### Requirement: Works on phone and laptop, light and dark
The spoiler toggle, the hidden-score markers, the "Show score" controls, and the hidden-section notes SHALL be usable at about 390px width and on a laptop, in light and dark mode, without horizontal page scroll. The header SHALL still fit all its navigation items on a phone.

#### Scenario: Phone header
- **WHEN** the tracker is opened on a 390px phone
- **THEN** the header shows all tabs, the spoiler toggle, and the theme toggle without scrolling sideways
