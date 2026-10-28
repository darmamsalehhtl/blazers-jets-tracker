# Spec Delta

## Purpose

Shows what each rostered player is paid and how long his contract runs, on the Roster tab of every tracked team, NFL and NBA alike.

## ADDED Requirements

### Requirement: Contract columns on every roster
The Roster tab of every tracked team, NFL and NBA, SHALL show a Salary column (this season's salary in millions of dollars) and a Yrs left column for each player. Yrs left SHALL count the seasons left on the contract including the current one, the same way in both leagues.

#### Scenario: Jets roster
- **WHEN** the user opens the Jets' Roster tab
- **THEN** every roster group (offense, defense, special teams, injured reserve, practice squad) shows Salary and Yrs left columns, for example "$23.3M" and "6" for Garrett Wilson, who is signed through 2031

#### Scenario: Contract ending this season
- **WHEN** a Jets player's contract runs through the current season
- **THEN** his Yrs left shows 1, the same as an expiring contract on the Blazers' roster, not 0

#### Scenario: Blazers roster unchanged
- **WHEN** the user opens the Blazers' Roster tab
- **THEN** the Salary and Yrs left columns show as before

### Requirement: Sorting by contract
The Salary and Yrs left columns SHALL be sortable like the other roster columns. A player without contract data SHALL show "–" and sort as zero.

#### Scenario: Highest paid first
- **WHEN** the user sorts the Jets' defense by Salary, highest first
- **THEN** the best-paid defender is first and players without contract data are last

#### Scenario: Missing contract
- **WHEN** a practice-squad player has no contract data
- **THEN** his Salary and Yrs left cells show "–"

### Requirement: College stays on NFL rosters
NFL rosters SHALL keep the College column, shown after the contract columns.

#### Scenario: Column order
- **WHEN** the user opens the Jets' Roster tab
- **THEN** the columns are Player, Pos, Age, Ht, Wt, Exp, Salary, Yrs left, College, Status

### Requirement: Works on every screen
The wider NFL roster table SHALL scroll inside its card on a phone about 390 px wide, without scrolling the page sideways, in light and dark mode.

#### Scenario: Phone
- **WHEN** the user opens the Jets' Roster tab on a 390 px wide phone
- **THEN** the table scrolls sideways inside its card and the page itself does not
