# FC League

A tracker for a private FIFA/FC league: players, seasons, fixtures, results and the league table. One admin records everything; everyone else views.

## Language

### People

**Admin**:
The only person who records fixtures, results and season changes.
_Avoid_: Owner, organiser

**Viewer**:
Anyone looking at the league without admin rights, signed in or not.
_Avoid_: User, guest

### Seasons

**Season**:
One round-robin competition between a fixed set of players, in one of three states: **Draft**, **Active** or **Completed**.

**Draft**:
A season still being set up. Its fixtures can be regenerated and it can be deleted.

**Active**:
The single season currently being played. Its name, points and start date can still be changed, and deleting it discards all its results.
_Avoid_: Current, live, ongoing

**Completed**:
A season whose table is frozen with a champion. It cannot be deleted; it can be reopened back to Active.
_Avoid_: Finished, archived, closed

**Matchday**:
A numbered round of fixtures within a season. The order of a season's matches.
_Avoid_: Round, gameweek

### Table

**Title spot**:
Position 1 in the table of a season that is not yet completed. Becomes **Champion** once the season is completed.
_Avoid_: Leader, top spot

**Qualification zone**:
Positions 2 to N in a season's table, where N is that season's **Qualification spots**. It is a display highlight only and has no effect on later seasons or competitions.
_Avoid_: Promotion zone, top N

**Qualification spots**:
The number N of top table positions that "qualify" in a season, counting the **Title spot**. Set per season.
_Avoid_: Qualifiers, cut-off

**Last place**:
The bottom position in a season's table.
_Avoid_: Relegation zone

**Form**:
A player's most recent results (W/D/L), up to five and only for matches played, ordered by season then matchday, oldest on the left and newest on the right.
_Avoid_: Streak, recent results
