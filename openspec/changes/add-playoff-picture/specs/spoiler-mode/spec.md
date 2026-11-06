# Spec Delta

## MODIFIED Requirements

### Requirement: Other results hidden
While spoilers are off, the app SHALL hide all of the following:
- team and opponent win-loss records, including the team page header, team cards, opponent records, and home/away records
- the standings tab
- per-game result lists and per-game charts (results list, points by game, net rating by game)
- players' game-by-game logs and "last 5 games"
- team news headlines
- the Playoffs page: the seeding view (seeds, records, games back, clinch marks, projected matchups, our-team summary), the projected bracket, and the bracket (results, series scores, and matchups decided by finished games); games in progress on the bracket are still shown with their live score

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

#### Scenario: Playoffs page
- **WHEN** spoilers are off and the user opens the Playoffs page during the regular season
- **THEN** a note says the playoff picture is hidden while spoilers are off, with a button to show spoilers, and no seeds or records are shown

#### Scenario: Live playoff game with spoilers off
- **WHEN** spoilers are off and an NBA playoff game is in progress
- **THEN** the Playoffs page shows that game with its live score above the hidden-bracket note, without other series scores
