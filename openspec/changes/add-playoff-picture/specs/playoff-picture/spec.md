# Spec Delta

## Purpose

Shows the current NFL and NBA playoff picture: during the regular season, who would make the playoffs if the season ended today and how close the Jets and Blazers are; during the postseason, the bracket with live games.

## ADDED Requirements

### Requirement: Playoffs page in the main navigation
The app SHALL provide a Playoffs page reachable from the main navigation on every screen, with a switch between NFL and NBA. The selected league SHALL be reflected in the URL so a link opens the same view. The NFL SHALL be the default view.

#### Scenario: Open the Playoffs page
- **WHEN** the user taps "Playoffs" in the main navigation
- **THEN** the NFL playoff picture is shown

#### Scenario: Switch league
- **WHEN** the user selects "NBA" on the Playoffs page
- **THEN** the NBA playoff picture is shown and the URL identifies the NBA view

#### Scenario: Navigation fits on a phone
- **WHEN** the app is viewed at a width of about 390px
- **THEN** all main navigation items, including Playoffs, the spoiler toggle and the theme toggle, are visible without horizontal page scroll

### Requirement: Phase follows the league calendar
For each league the page SHALL show the seeding view while the regular season is in progress, and the bracket view from the first postseason game (NBA: the first play-in game) until the next regular season starts. During the preseason and offseason the page SHALL show the bracket of the most recent postseason, labeled with its season. During the postseason the final regular-season seeding SHALL remain reachable from the bracket view.

#### Scenario: Regular season
- **WHEN** the NFL regular season is in progress
- **THEN** the NFL view shows the seeding "if the season ended today"

#### Scenario: Play-in has started
- **WHEN** the first NBA play-in game has started
- **THEN** the NBA view shows the bracket, starting with the play-in

#### Scenario: Offseason
- **WHEN** the NBA season is over and the next regular season has not started
- **THEN** the NBA view shows the last postseason's completed bracket, labeled with that season (for example "2025-26")

### Requirement: Seeding per conference
In the seeding view each conference (AFC/NFC, East/West) SHALL list all of its teams in ESPN's current seed order, with seed number, logo, abbreviation, win-loss record (ties for the NFL) and win percentage. Teams in a playoff spot SHALL be visually separated from teams outside by a cut line. NFL: seeds 1–7 are in, seeds 1–4 are marked as division leaders, and seed 1 is marked as having the first-round bye. NBA: seeds 1–6 are in the playoffs, seeds 7–10 are in the play-in with a second cut line below seed 10, and the rest are out. The sources' seed order SHALL be used as-is; ties are not re-broken by the app.

#### Scenario: NFL conference
- **WHEN** the NFL seeding view is shown
- **THEN** the AFC and the NFC each list 16 teams, a line follows seed 7, seeds 1–4 carry a division-leader mark and seed 1 a bye mark

#### Scenario: NBA conference
- **WHEN** the NBA seeding view is shown
- **THEN** the East and the West each list 15 teams, with a line after seed 6 and another after seed 10, and seeds 7–10 labeled as play-in

#### Scenario: Phone layout
- **WHEN** a conference is viewed at about 390px width
- **THEN** seed, team, record and games back are visible without horizontal page scroll; further columns may scroll inside the table

### Requirement: Race to the cut line
Each team row in the seeding view SHALL show:
- games back: for a team outside the playoff spots, how many games it trails the last playoff seed; for an NBA team below the play-in, also how many it trails seed 10; for a team inside, how many games it leads the first team outside its tier
- games left in the regular season
- remaining strength of schedule: the average current win percentage of its remaining regular-season opponents, with repeats counted
- the clinch or elimination status reported by ESPN (for example clinched division, clinched playoff spot, clinched bye / top seed, clinched play-in, eliminated), with a legend explaining each mark

Games back SHALL be computed as ((leader wins − team wins) + (team losses − leader losses)) / 2, counting ties as half a win and half a loss.

#### Scenario: Team outside
- **WHEN** the Jets are seed 9 at 5-6 and seed 7 is 7-4
- **THEN** the Jets' row shows 2 games back

#### Scenario: Team inside
- **WHEN** the Blazers are seed 5 at 20-10 and seed 7 is 17-13
- **THEN** the Blazers' row shows a 3-game lead over the play-in

#### Scenario: Clinched
- **WHEN** ESPN reports a team as having clinched its division
- **THEN** its row shows the division-clinched mark, explained in the legend

#### Scenario: Remaining data missing
- **WHEN** remaining schedules are unavailable
- **THEN** seeds, records, games back and clinch marks are still shown and games left / strength of schedule show a dash

### Requirement: Projected matchups
The seeding view SHALL show, per conference, the first-round matchups the current seeds would produce. NFL: 2 v 7, 3 v 6, 4 v 5, with seed 1 on a bye. NBA: play-in 7 v 8 and 9 v 10, and first-round series 1 v (8th seed TBD), 2 v (7th seed TBD), 3 v 6, 4 v 5.

#### Scenario: NFL projection
- **WHEN** the NFL seeding view is shown
- **THEN** each conference lists the bye team and the three projected Wild Card games with the higher seed as host

#### Scenario: NBA projection
- **WHEN** the NBA seeding view is shown
- **THEN** each conference lists the two play-in games and four first-round series, with the play-in-dependent opponents marked as to be decided

### Requirement: Our teams highlighted
The Jets row in the NFL view and the Blazers row in the NBA view SHALL be highlighted, and the view SHALL show a one-line summary of where that team stands (for example "Jets: 9th in the AFC, 2 games back of the 7th seed" or "Blazers: 5th in the West, in a playoff spot").

#### Scenario: Summary line
- **WHEN** the NBA seeding view is shown
- **THEN** a line above the conferences states the Blazers' seed, their tier (playoffs, play-in or out) and their games back or lead

### Requirement: Postseason bracket
The bracket view SHALL show each conference's path to the final and the final itself.
- NFL: Wild Card, Divisional and Conference rounds per conference and the Super Bowl, each game with seeds, teams, date or result, and the 1 seed's bye in the Wild Card round.
- NBA: the play-in games per conference, then each best-of-7 series per round (First Round, Conference Semifinals, Conference Finals, NBA Finals) with seeds, teams and series score, and the individual games of a series reachable from it.
Matchups that are not yet determined SHALL be shown as placeholders (for example "Winner of 4 v 5"). Each game SHALL link to its game page when it involves the Jets or Blazers.

#### Scenario: NBA series
- **WHEN** a first-round NBA series stands at 2-1
- **THEN** the series shows both teams with their seeds and "2-1", and opening it lists the three games played and any scheduled ones

#### Scenario: NFL bye
- **WHEN** the NFL Wild Card round is shown
- **THEN** each conference shows its 1 seed as on a bye

#### Scenario: Undetermined matchup
- **WHEN** the Divisional round has not been set
- **THEN** its slots show placeholders naming the games whose winners fill them

### Requirement: Live and fresh data
Seeds and records SHALL come from live standings and refresh while the page is open. During the postseason, games in progress SHALL show their live score and refresh every 20 seconds; polling SHALL pause while the tab is hidden. The page SHALL show when its data was last updated. If live data fails to load, the page SHALL show an error with a retry control; if only the precomputed data is missing, the page SHALL still show what live data allows.

#### Scenario: Live playoff game
- **WHEN** an NFL playoff game is in progress and the bracket is open
- **THEN** its score updates within about 20 seconds without a reload

#### Scenario: Standings request fails
- **WHEN** the standings request fails
- **THEN** an error with a retry button is shown instead of the seeding

### Requirement: Works on phone and laptop, light and dark
The Playoffs page SHALL be usable at about 390px width and on a laptop, in light and dark mode, without horizontal page scroll. On a phone the bracket SHALL be readable round by round without zooming.

#### Scenario: Phone bracket
- **WHEN** the NBA bracket is opened on a 390px phone in dark mode
- **THEN** every round is readable, with no horizontal page scroll and legible contrast
