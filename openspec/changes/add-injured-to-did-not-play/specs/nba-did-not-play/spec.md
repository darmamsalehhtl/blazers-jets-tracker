# Spec Delta

## Purpose

Shows, under an NBA game's box score, every player on the selected team who did not play, and why: coach's decisions and injuries, with the injury and the expected return when ESPN reports them.

## ADDED Requirements

### Requirement: Injured players in the Did not play list
For the team selected in an NBA box score, the "Did not play" card SHALL list every player on that team's injury report from the game's ESPN summary who does not appear in that team's box score. Players who appear in the box score SHALL NOT be listed again from the injury report, whether or not they played. Injured players SHALL be listed after the players ESPN's box score marks as not playing (such as coach's decisions). The coach's decision rows SHALL stay as they are today.

#### Scenario: Injured player missing from the box score
- **WHEN** the user opens a finished Blazers game whose box score has no entry for Shaedon Sharpe, and the game's injury report lists him as Out
- **THEN** the Blazers' "Did not play" card lists Shaedon Sharpe below the coach's decision players

#### Scenario: Injured player who played
- **WHEN** a player is on the injury report as Day-To-Day but has a box score line for the game
- **THEN** he is shown in Starters or Bench with his stats and is not added to "Did not play"

#### Scenario: Only injured players
- **WHEN** the selected team had no coach's decisions but has injured players missing from the box score
- **THEN** the "Did not play" card is shown, listing only the injured players

#### Scenario: Other team selected
- **WHEN** the user switches the box score to the opponent
- **THEN** the "Did not play" card lists the opponent's coach's decisions and the opponent's injured players

#### Scenario: Nobody missing
- **WHEN** the selected team has no coach's decisions and no injured players missing from the box score
- **THEN** no "Did not play" card is shown

### Requirement: Injury details on each injured row
Each injured row SHALL show the player's name (opening the player's page when tapped), his injury status as a pill (for example "Out" or "Day-To-Day"), and, when ESPN provides them, the injury description built from side, body part and detail (for example "Right Knee Surgery") and the estimated return date. Missing or "Not Specified" parts SHALL be left out instead of shown as blanks. Rows SHALL fit a 390 px wide screen without horizontal scrolling and SHALL be readable in light and dark mode.

#### Scenario: Full injury details
- **WHEN** the injury report lists Shaedon Sharpe as Out with a right knee surgery and a return date of March 2, 2027
- **THEN** his row shows "Out", "Right Knee Surgery" and the return date

#### Scenario: Partial details
- **WHEN** an injured player's entry has a body part ("Back") but no side, no detail and no return date
- **THEN** his row shows "Back" and the status pill, without an empty return date or "Not Specified"

#### Scenario: Open the player
- **WHEN** the user taps an injured player's name in the card
- **THEN** that player's page opens, as it does for coach's decision rows

### Requirement: Current-report notice
Whenever the "Did not play" card lists at least one injured player, it SHALL show a short note that the injury information comes from ESPN's current injury report and may not match the report on game day.

#### Scenario: Notice shown with injuries
- **WHEN** the card lists at least one injured player
- **THEN** a short muted note about the current injury report is shown in the card

#### Scenario: No notice without injuries
- **WHEN** the card lists only coach's decisions
- **THEN** no injury-report note is shown

### Requirement: NBA only
Injured players SHALL be added only to NBA box scores. NFL box scores SHALL stay unchanged.

#### Scenario: Jets game
- **WHEN** the user opens a finished Jets game's box score
- **THEN** no injured players are added to it
