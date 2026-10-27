# player-search Specification

## Purpose

Lets the user find any current NFL or NBA player from the Jets or Blazers team page and open that player's page with all their stats and MVP standing.

## Requirements

### Requirement: Search box on the team page
Each team page SHALL show a player search box above its tabs. The Jets page SHALL search current NFL players and the Blazers page SHALL search current NBA players.

#### Scenario: Jets page searches the NFL
- **WHEN** the user types "mahomes" on the Jets page
- **THEN** Patrick Mahomes (KC) appears in the results

#### Scenario: Blazers page searches the NBA
- **WHEN** the user types "lebron" on the Blazers page
- **THEN** LeBron James appears in the results and no NFL players do

### Requirement: All current players are searchable
The search SHALL cover every player on a current roster of every team in the league, at every position, including players who have not played yet this season. It SHALL NOT include retired or free-agent players.

#### Scenario: Backup with no stats
- **WHEN** the user searches for a backup who is on a roster but has not played this season
- **THEN** the player appears in the results

#### Scenario: Retired player
- **WHEN** the user searches for a player who is no longer on any roster
- **THEN** that player does not appear in the results

### Requirement: Forgiving name matching
Matching SHALL ignore case and accents. Results SHALL include players whose first name, last name, or full name starts with what was typed, with every typed word matching. Results SHALL appear after at least 2 typed characters.

#### Scenario: Accents ignored
- **WHEN** the user types "doncic" on the Blazers page
- **THEN** Luka Dončić appears in the results

#### Scenario: Multiple words
- **WHEN** the user types "josh al" on the Jets page
- **THEN** Josh Allen appears and players named Josh without a last name starting with "al" do not

#### Scenario: Too short
- **WHEN** the user has typed one character
- **THEN** no results list is shown

### Requirement: Result list content and order
Each result SHALL show the player's headshot, name, position, team, and MVP standing (rank or "Not ranked"). Results SHALL be ordered by match quality and then by MVP standing, with ranked players before unranked ones. At most 8 results SHALL be shown at once, with a note when more exist.

#### Scenario: Result row
- **WHEN** a ranked player appears in the results
- **THEN** their row shows headshot, name, position · team, and "MVP #rank"

#### Scenario: No match
- **WHEN** the typed text matches no current player
- **THEN** the list says no player was found

### Requirement: Opening a player
Selecting a result SHALL open that player's page, with the stats and the MVP standing for the searched league. It SHALL work by tap or click and by keyboard (arrow keys and Enter), and SHALL clear and close the search.

#### Scenario: Tap a result
- **WHEN** the user taps a result
- **THEN** the player's page opens and the search box is cleared

#### Scenario: Keyboard
- **WHEN** the user presses the down arrow and then Enter
- **THEN** the first result's player page opens

#### Scenario: Escape closes
- **WHEN** the results are open and the user presses Escape or taps outside
- **THEN** the results list closes

### Requirement: Back from a searched player
The player page's back link SHALL return the user to the page they came from. When there is no previous page in the app (opened from a direct link), it SHALL go to the team page of the player's league.

#### Scenario: Back to the search origin
- **WHEN** the user opens a player from the Blazers page search and taps back
- **THEN** the Blazers page is shown again

### Requirement: Fast, offline-capable search on phone and laptop
Typing SHALL NOT trigger a network request per keystroke. The player list SHALL load once per visit and be refreshed with the regular data build. The search box and results SHALL be usable at about 390px width and on a laptop, in light and dark mode, without horizontal scroll.

#### Scenario: Typing on a phone
- **WHEN** the user types a name on a phone
- **THEN** results update as they type without waiting for the network, and the list fits the screen width
