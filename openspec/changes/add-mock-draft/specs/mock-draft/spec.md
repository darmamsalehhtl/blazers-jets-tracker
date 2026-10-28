# Spec Delta

## Purpose

Fills each pick of the live NFL draft order with a prospect the computer thinks fits that team, so the Draft tab shows who a team, especially the Jets, could take at its current spot.

## ADDED Requirements

### Requirement: Mock player on every pick
The Draft tab SHALL show a computer-chosen prospect on each pick of the live draft order, under the team that owns the pick. It SHALL show the prospect's name, position and college logo. The user SHALL NOT be asked to make any picks.

#### Scenario: Opening the Draft tab
- **WHEN** the user opens the Draft tab during the season
- **THEN** every round 1 pick shows the team that owns it and the prospect mocked to it, with name, position and college logo

#### Scenario: Traded pick
- **WHEN** a pick originally belonging to Dallas is owned by the Jets
- **THEN** the mocked prospect is chosen for the Jets' needs, not Dallas's

### Requirement: Each prospect is picked once
A prospect SHALL appear at most once in the mock draft. Picks SHALL be made in draft order, each from the prospects not yet taken.

#### Scenario: Top prospect taken early
- **WHEN** ESPN's No. 1 prospect is mocked to pick 1
- **THEN** that prospect does not appear at any later pick

### Requirement: Best available adjusted for need
Each pick SHALL go to the prospect with the best blend of ESPN board rank, that team's need at the prospect's position, and the position's value. A team SHALL NOT take a prospect ranked far below its pick while much better-ranked prospects are available. Kickers, punters and long snappers SHALL NOT be taken before round 5.

#### Scenario: Need breaks a close call
- **WHEN** the team on the clock has cornerback as its top need, and the best available cornerback is ranked within a few spots of the best available player overall
- **THEN** the team takes the cornerback

#### Scenario: No big reach
- **WHEN** the team at pick 5 has wide receiver as its top need, but the best available receiver is ranked 40th on the board
- **THEN** the team does not take that receiver at pick 5

### Requirement: Needs shrink once a position is filled
After a team takes a prospect, its need at that position SHALL drop, so it does not take a second player at the same position unless that player is clearly the best available.

#### Scenario: Two first-round picks
- **WHEN** a team owns two first-round picks and takes a quarterback with the first
- **THEN** it does not take another quarterback with the second unless he is far ahead of everyone else still available

### Requirement: Team needs from public data
Each team's need at each position SHALL come from public data: how its offensive or defensive unit has played this season, the age and depth of its starters, and the early-round picks it made at that position in recent drafts. A team that took a quarterback in round 1 in the last three drafts SHALL have little quarterback need.

#### Scenario: Recent first-round quarterback
- **WHEN** a team took a quarterback in the first round two drafts ago
- **THEN** its mocked first-round pick is not a quarterback unless he is far ahead of everyone else still available

#### Scenario: Weak pass defense
- **WHEN** a team has one of the worst pass defenses by EPA per play this season
- **THEN** cornerback, safety or edge rusher is among its top needs

### Requirement: Why the pick fits
Tapping a pick SHALL show the prospect's ESPN overall and position rank, height and weight, ESPN's scouting note when there is one, a link to the prospect's ESPN player card, and why the pick fits: the team's top needs and whether the pick fills one.

#### Scenario: Pick that fills a need
- **WHEN** the user taps the Jets' first-round pick, a cornerback ranked 6th on ESPN's board, and cornerback is the Jets' top need
- **THEN** the details show "#6 on ESPN's board", the cornerback position rank, size, the scouting note, and that the pick fills the Jets' top need

#### Scenario: Collapsing
- **WHEN** the user taps an open pick again
- **THEN** its details close

### Requirement: Jets picks show their players
The Jets picks summary on the Draft tab SHALL show the prospect mocked at each Jets pick next to the pick number.

#### Scenario: Jets summary
- **WHEN** the Jets own picks 4 and 37 and both are filled in the mock
- **THEN** the Jets picks summary shows both picks with their mocked prospects' names and positions

### Requirement: Mock follows the live order
The mock draft SHALL be built from the same live draft order the tab shows. It SHALL update when the standings, the prospect board or the team needs change. Opening or reloading the page with unchanged inputs SHALL show the same mock.

#### Scenario: Reload
- **WHEN** the user reloads the Draft tab and no game, prospect or need data has changed
- **THEN** every pick shows the same prospect as before

#### Scenario: Standings change
- **WHEN** a game result moves the Jets from pick 6 to pick 4
- **THEN** the mock is redone in the new order, and the Jets' mocked prospect may change

### Requirement: Board shorter than the draft
Picks SHALL be filled only while unpicked prospects remain on ESPN's board. Picks beyond that SHALL show that the board does not reach them yet, with the number of prospects on the board. They SHALL fill in automatically as ESPN adds prospects.

#### Scenario: Early season board
- **WHEN** ESPN's board has 50 prospects and the user opens round 2
- **THEN** the first 18 picks of round 2 have mocked prospects and the rest show that ESPN's 50-prospect board doesn't reach them yet

### Requirement: Mock data unavailable
If the prospect or need data can't be loaded, the Draft tab SHALL still show the live draft order as before, plus a short notice that the mock draft is unavailable. A pick whose owner is unclear SHALL be mocked using the original team's needs and marked as uncertain.

#### Scenario: Data build failed
- **WHEN** the mock draft data couldn't be built
- **THEN** the draft order, the round tabs and the Jets picks summary still work, and a notice says the mock draft is unavailable

### Requirement: Works on every screen
The mock draft SHALL work on a phone about 390 px wide and on a laptop, in light and dark mode, with no horizontal page scrolling.

#### Scenario: Phone in dark mode
- **WHEN** the user opens round 1 on a 390 px wide phone in dark mode
- **THEN** each pick row shows the team and the mocked prospect without overflowing, and the pick details open inside the row
