# Tasks

## 1. Roster table

- [x] 1.1 In `src/components/team/TeamRoster.tsx`, add the Salary and Yrs left columns for every league instead of only the NBA. College stays on NFL rosters, after Yrs left, and the Status column stays last. Players without contract data keep showing "–" and sort as zero. Update the README line "roster, including NBA salaries" to cover both teams. Commit ("Show salaries and contract years on the Jets roster").

## 2. Verify

- [x] 2.1 Check in Playwright on the Jets and Blazers Roster tabs, at 390 px dark and 1200 px light:
  - the column order is Player, Pos, Age, Ht, Wt, Exp, Salary, Yrs left, College, Status for the Jets, and unchanged for the Blazers
  - Garrett Wilson's salary matches ESPN
  - sorting the defense by Salary puts the best-paid first and players without data last
  - practice-squad players without data show "–"
  - the page doesn't scroll sideways and there are no console errors

  Push and confirm the deploy passes.
