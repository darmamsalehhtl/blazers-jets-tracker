# Proposal

## Why

The Blazers' Roster tab shows each player's salary and years left on his contract, but the Jets' Roster tab doesn't, even though ESPN's NFL roster data has the same contract fields. The roster table only adds the contract columns for NBA teams. NFL teams get a College column in their place.

## What Changes

- The Jets' Roster tab gets the same **Salary** and **Yrs left** columns as the Blazers', both sortable. College stays, after the contract columns.
- Players without contract data show "–" and sort last when sorting by salary.
- The Payroll tile is already computed from the same data, so it stays as it is.
- No new data sources, build step or dependencies.

## Capabilities

### New Capabilities
- `roster-contracts`: contract information (salary and years left) on team roster tables, for both NFL and NBA teams.

### Modified Capabilities
None. No existing spec covers the roster tab.

## Impact

- `src/components/team/TeamRoster.tsx` adds the contract columns for every league and keeps College for the NFL.
- `README.md` changes the roster feature line, if it mentions NBA-only contracts.
