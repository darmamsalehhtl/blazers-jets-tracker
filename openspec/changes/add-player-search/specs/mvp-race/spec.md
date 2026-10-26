# Spec Delta

## ADDED Requirements

### Requirement: Every eligible player is ranked
The MVP race SHALL compute a rank, score, and gap to the leader for every player in the eligible candidate pool of each league, not only the top 10, using the same score as the MVP page. The total number of ranked players SHALL be known so a rank can be shown as "#rank of N".

#### Scenario: Low-ranked eligible player
- **WHEN** an eligible quarterback ranks 31st of 34
- **THEN** their MVP standing is "#31 of 34" with their score and gap to the leader

#### Scenario: Consistent with the MVP page
- **WHEN** a player is listed 4th on the MVP page
- **THEN** their MVP standing anywhere else in the app is also #4 with the same score

### Requirement: Not-ranked players show the reason
Every current player who is not in the eligible pool SHALL have the MVP standing "Not ranked" with a specific, plain-language reason. Where a volume minimum is missed, the reason SHALL include the player's number and the current minimum.

#### Scenario: NFL defender
- **WHEN** the MVP standing of an NFL linebacker is shown
- **THEN** it reads "Not ranked" with the reason that defenders, kickers and linemen aren't ranked

#### Scenario: NFL quarterback below the minimum
- **WHEN** a quarterback has 41 dropbacks and the minimum is 84
- **THEN** the reason says there aren't enough dropbacks yet and shows 41 of 84

#### Scenario: NBA low minutes
- **WHEN** an NBA player averages 18.3 minutes per game
- **THEN** the reason says fewer than 25 minutes per game and shows 18.3

#### Scenario: NBA 65-game rule
- **WHEN** an NBA player has missed more than 17 of their team's games
- **THEN** the reason says they can no longer reach 65 games

#### Scenario: No games yet
- **WHEN** a player has not played this season
- **THEN** the reason says they have no games this season

### Requirement: MVP standing on the player page
A player's page SHALL show their MVP standing for the league of the page: rank of N, score, and gap to the leader for ranked players (with the 65-game risk marker where it applies), or "Not ranked" with the reason. It SHALL link to the MVP page for that league.

#### Scenario: Ranked player page
- **WHEN** the user opens the page of a player ranked 12th of 140 in the NBA
- **THEN** the page shows "MVP race: #12 of 140" with score and gap, and a link to the NBA MVP page

#### Scenario: Not ranked player page
- **WHEN** the user opens the page of an NFL kicker
- **THEN** the page shows "Not ranked" with the reason

#### Scenario: MVP data unavailable
- **WHEN** the MVP data for the league could not be built
- **THEN** the player page shows the rest of its content normally and states that the MVP standing is unavailable
