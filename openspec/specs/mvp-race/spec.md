# mvp-race Specification

## Purpose

Shows who would win the NFL and NBA MVP awards if the season ended today, using a transparent data-driven score, and where Jets and Blazers players stand in that race.

## Requirements

### Requirement: MVP page in the main navigation
The app SHALL provide an MVP page reachable from the main navigation on every screen, with a switch between NFL and NBA. The selected league SHALL be reflected in the URL so a link opens the same view.

#### Scenario: Open the MVP page
- **WHEN** the user taps "MVP" in the main navigation
- **THEN** the MVP race for the NFL is shown

#### Scenario: Switch league
- **WHEN** the user selects "NBA" on the MVP page
- **THEN** the NBA MVP race is shown and the URL identifies the NBA view

#### Scenario: Navigation fits on a phone
- **WHEN** the app is viewed at a width of about 390px
- **THEN** all main navigation items, including MVP, are visible without horizontal page scroll

### Requirement: Ranked top-10 MVP race per league
For each league the page SHALL list the 10 highest-scoring eligible candidates by MVP score, ranked from 1, using current-season regular-season data only.

#### Scenario: Ranked list
- **WHEN** the NBA race is shown and at least 10 candidates are eligible
- **THEN** exactly 10 candidates are listed in descending score order with ranks 1 to 10

#### Scenario: Playoff and preseason games excluded
- **WHEN** a player has preseason or playoff games
- **THEN** those games do not affect the player's MVP score

### Requirement: Candidate row content
Each candidate SHALL show rank, headshot, name, team, MVP score, gap to the leader, team record, the league-relevant key stats, and a short reason naming the factor that contributes most to their score.

#### Scenario: NFL quarterback row
- **WHEN** an NFL quarterback is listed
- **THEN** the row shows passing yards, passing touchdowns, interceptions, total EPA, and the team's record

#### Scenario: NBA row
- **WHEN** an NBA player is listed
- **THEN** the row shows points, rebounds and assists per game, true shooting %, games played, and the team's record

#### Scenario: Leader gap
- **WHEN** a candidate ranked below 1st is listed
- **THEN** the row shows how many score points they trail the leader by

### Requirement: NBA MVP score
The NBA score SHALL combine per-game box-score production, scoring efficiency relative to league average, and team win percentage, each normalized against the league's qualified players so the inputs are comparable.

#### Scenario: Team success matters
- **WHEN** two NBA players have identical individual stats and games played
- **THEN** the player whose team has the higher win percentage has the higher MVP score

#### Scenario: Efficiency matters
- **WHEN** two NBA players have identical stats except true shooting %
- **THEN** the more efficient player has the higher MVP score

### Requirement: NBA 65-game eligibility
NBA candidates SHALL be ranked only if they are on pace for the league's 65-game award minimum, pro-rated to games their team has played. Players who can no longer reach 65 games SHALL be excluded. Players just below pace SHALL be listed with an "at risk" marker.

#### Scenario: Can no longer qualify
- **WHEN** a player has missed more than 17 of their team's games
- **THEN** the player is not ranked in the NBA MVP race

#### Scenario: Below pace but still possible
- **WHEN** a player's games played are below 65/82 of their team's games played but they can still reach 65
- **THEN** the player may be ranked and is marked "at risk"

### Requirement: NFL MVP score
The NFL score SHALL combine total expected points added (passing plus rushing for quarterbacks; receiving plus rushing for other skill players), headline production (total yards, touchdowns, turnovers), and team win percentage. Non-quarterbacks SHALL receive a documented position adjustment that reflects voters' strong preference for quarterbacks.

#### Scenario: Team success matters
- **WHEN** two NFL quarterbacks have identical individual stats
- **THEN** the quarterback whose team has the higher win percentage has the higher MVP score

#### Scenario: Turnovers hurt
- **WHEN** two NFL quarterbacks differ only in interceptions thrown
- **THEN** the one with fewer interceptions has the higher MVP score

#### Scenario: Skill players can appear
- **WHEN** a running back or receiver has an exceptional season by total EPA and yards
- **THEN** they can appear in the top 10 despite the position adjustment

### Requirement: NFL candidate pool
The NFL race SHALL consider quarterbacks with a minimum number of dropbacks and running backs, wide receivers and tight ends with a minimum number of touches, with minimums that scale with the number of weeks played. Defensive players and kickers SHALL NOT be ranked.

#### Scenario: Low-volume player excluded
- **WHEN** a quarterback has fewer dropbacks than the current minimum
- **THEN** they are not ranked in the NFL MVP race

### Requirement: Jets and Blazers highlight
Candidates from the Jets (NFL) and Blazers (NBA) SHALL be visually highlighted. When none of them is in the top 10, the page SHALL show the best-ranked one with their actual rank below the list.

#### Scenario: Our player in the top 10
- **WHEN** a Jets player ranks in the NFL top 10
- **THEN** their row is highlighted in the Jets color

#### Scenario: Our best player outside the top 10
- **WHEN** no Blazers player ranks in the NBA top 10
- **THEN** the best-ranked Blazers player is shown below the list with their rank, score, and gap to the leader

#### Scenario: Our team has no eligible candidate
- **WHEN** no Jets player is eligible
- **THEN** the page states that no Jets player currently qualifies

### Requirement: Methodology and limits shown
The page SHALL explain in plain language what goes into each league's score and that it estimates who would win if the season ended today, not the actual vote.

#### Scenario: Methodology visible
- **WHEN** the user views either league's race
- **THEN** a short methodology note for that league is visible on the page

### Requirement: Freshness and early-season handling
MVP data SHALL refresh at least every 3 hours and the page SHALL show when it was last updated. Early in the season, when teams have played few games, the page SHALL say that the sample is small.

#### Scenario: Last updated
- **WHEN** the MVP page is shown
- **THEN** the time since the data was last updated is visible

#### Scenario: Early season
- **WHEN** NBA teams have played fewer than 10 games, or the NFL season is before week 4
- **THEN** a small-sample note is shown for that league

#### Scenario: Data unavailable
- **WHEN** the MVP data for a league could not be built
- **THEN** the page shows a clear message for that league instead of an empty or broken list, and the other league still works

### Requirement: Works on phone and laptop, light and dark
The MVP page SHALL be usable at about 390px width and on a laptop, in both light and dark mode, without horizontal page scroll.

#### Scenario: Phone dark mode
- **WHEN** the MVP page is opened on a phone in dark mode
- **THEN** all ranks, names, scores, and key stats are readable and nothing overflows horizontally

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
