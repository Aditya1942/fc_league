# Spec: FC League v1 — friends' football league tracker

Labels: `ready-for-agent`

## Problem Statement

A group of friends plays a football (EA FC style) league among themselves: every friend plays every other friend, like a real league. Right now there is no single place to see the fixtures, results, the live table, or what happened in past seasons. Results get lost in chats, the table is calculated by hand, and nobody can look back at old seasons or head-to-head records. Most of the group checks things on their phones.

## Solution

A mobile-first React web app, hosted on Firebase, modeled on football apps like AllFootball, with a strict claymorphism visual style. Each friend is a **Player** who acts as a club in the league. One **League** holds many **Seasons**; each Season has a set of participating Players and an auto-generated round-robin set of **Matches** grouped into **Matchdays**. Anyone with the link can browse the current table, upcoming fixtures, results, match details, player profiles and full history of past seasons. Only an **Admin** (signed in) can create and change data: leagues, players, seasons, fixtures, and results.

### Glossary

- **League** — the competition container (e.g. "FC League"). Has many Seasons and Players.
- **Player** — a friend; acts as a club (name, club name, short code, crest color/emoji). Belongs to a League, reused across Seasons.
- **Season** — one run of the league (e.g. "Season 3"). Status: `draft` → `active` → `completed`. Has participants, a format and points rules.
- **Participant** — a Player taking part in a given Season.
- **Matchday** — a round of fixtures; each participant plays at most once per Matchday.
- **Match** — one game between a home and away Participant in a Season. Status: `scheduled`, `played`, `postponed`, `void`.
- **Standings** (the table) — derived from played Matches; never hand-edited.
- **Form** — last 5 results of a Participant as W/D/L chips.
- **Head-to-head (H2H)** — all-time record between two Players.
- **Admin** — signed-in user allowed to write. Everyone else is a **Viewer** (read-only, no sign-in needed).

## User Stories

### Viewer — home & navigation
1. As a viewer, I want the app to open on a home screen showing the active season, so that I immediately see what matters now.
2. As a viewer, I want to see the next upcoming matches on the home screen, so that I know who plays next.
3. As a viewer, I want to see the latest results on the home screen, so that I catch up quickly.
4. As a viewer, I want a compact top-of-table preview on home, so that I see who is leading without opening the full table.
5. As a viewer, I want a bottom tab bar (Home, Matches, Table, History, Players), so that I can navigate with one thumb on my phone.
6. As a viewer, I want to open the app without signing in, so that friends can just share a link.
7. As a viewer, I want the app to be installable to my home screen, so that it feels like a native app.
8. As a viewer, I want data to update live when the admin enters a result, so that I don't need to refresh.
9. As a viewer, I want the app to still show the last loaded data when my connection is bad, so that I can check the table anywhere.
10. As a viewer, I want a clear empty state when no season is active, so that I understand nothing is wrong.

### Viewer — matches / fixtures
11. As a viewer, I want to see all matches of a season grouped by matchday, so that it reads like a real league calendar.
12. As a viewer, I want a horizontally swipeable matchday selector that defaults to the current matchday, so that I can jump between rounds quickly.
13. As a viewer, I want to filter matches by Upcoming / Results / All, so that I can find what I need.
14. As a viewer, I want to filter matches by a specific player, so that I can see only my fixtures.
15. As a viewer, I want each match card to show both players' crests, names, score or kickoff date/time, and status, so that I can scan quickly.
16. As a viewer, I want postponed and void matches to be clearly labelled, so that I'm not confused by missing results.
17. As a viewer, I want to tap a match card to open match details, so that I can see more information.

### Viewer — match detail
18. As a viewer, I want a match detail page with a sticky scoreboard header and swipeable tabs (Overview, Stats, H2H), so that the result is obvious and details are organised.
19. As a viewer, I want to see when the match was played, which matchday and season it belongs to, so that I have context.
20. As a viewer, I want to see optional details (goal scorers with minutes, in-game team each player used, possession, shots, shots on target, man of the match, notes), so that the match feels like a real football record.
21. As a viewer, I want to see the head-to-head record of the two players on the match page, so that I know the rivalry history.
22. As a viewer, I want to see each player's form going into the match, so that I can judge who was in better shape.

### Viewer — standings table
23. As a viewer, I want a league table with position, player/club, P, W, D, L, GF, GA, GD, Pts, so that I see the standings like in a real league.
24. As a viewer, I want a form column showing the last 5 results as colored W/D/L chips, so that I see momentum.
25. As a viewer, I want the table to show #, Club, P, GD, Pts on a phone with # and Club pinned while W, D, L, GF, GA scroll sideways, so that it's readable on mobile.
26. As a viewer, I want ties broken consistently (points, goal difference, goals for, head-to-head points, then name), so that the order is fair and predictable.
27. As a viewer, I want a colored left stripe for zones (champion, last place) with a legend under the table, so that the table is visually informative.
28. As a viewer, I want to tap a row to open that player's profile, so that I can dig deeper.
29. As a viewer, I want to view the table for any season (current or past), so that I can compare.
30. As a viewer, I want home-only and away-only table views, so that I can see who performs better at home.

### Viewer — players (clubs)
31. As a viewer, I want a list of all players in the league with their crest and club name, so that I know everyone.
32. As a viewer, I want a player profile showing current season position, stats and form, so that I see how they are doing.
33. As a viewer, I want a player profile showing all-time stats (seasons played, titles, P/W/D/L, GF/GA, win %), so that I see their career.
34. As a viewer, I want the player profile to list their season-by-season finishing positions, so that I see their history.
35. As a viewer, I want to see a player's upcoming matches and recent results on their profile, so that I can follow them.
36. As a viewer, I want to compare two players head-to-head (wins, draws, losses, goals, all matches between them), so that we can settle arguments.
37. As a viewer, I want to see biggest win and longest winning/unbeaten streak per player, so that the profile has fun records.

### Viewer — history
38. As a viewer, I want a History page listing all past seasons with champion and runner-up, so that I see the honours list.
39. As a viewer, I want to open a past season and see its final table, so that I can relive it.
40. As a viewer, I want to see all matches of a past season grouped by matchday, so that I can find old results.
41. As a viewer, I want season stat leaders (most goals scored, best defence, most wins, biggest win), so that each season has highlights.
42. As a viewer, I want an all-time league table across all seasons, so that I see who is best overall.
43. As a viewer, I want a trophy cabinet / honours list per player, so that titles are celebrated.

### Admin — auth & access
44. As an admin, I want to sign in with email and password, so that only I can change data.
45. As an admin, I want admin controls (add/edit/delete buttons, admin screens) to appear only when I'm signed in as an admin, so that viewers have a clean read-only UI.
46. As an admin, I want the database itself to reject writes from non-admins, so that nobody can tamper with results even with dev tools.
47. As an admin, I want to sign out, so that I can safely use a shared device.

### Admin — league & players
48. As an admin, I want to create and edit the league (name, logo emoji/color), so that the app is branded for our group.
49. As an admin, I want to add a player with name, club name, short code (2–4 chars), and crest color/emoji, so that each friend has a club identity.
50. As an admin, I want to edit a player's details, so that typos or rebrands can be fixed everywhere.
51. As an admin, I want to archive a player who left the group, so that they disappear from pickers but their history stays intact.
52. As an admin, I want to be prevented from deleting a player who has matches, so that history is not broken.

### Admin — seasons
53. As an admin, I want to create a season with a name, start date, participants, number of legs (single or double round-robin), and points rules (default 3/1/0), so that each season can be configured.
54. As an admin, I want the app to auto-generate all fixtures as a round-robin split into matchdays, so that I don't schedule by hand.
55. As an admin, I want home/away balanced in the generated fixtures (and reversed in the second leg), so that it's fair.
56. As an admin, I want to preview and regenerate fixtures while the season is in draft, so that I can reshuffle before starting.
57. As an admin, I want to optionally set planned dates per matchday or per match, so that upcoming matches show dates.
58. As an admin, I want to start (activate) a season, so that it becomes the current season shown on home.
59. As an admin, I want only one active season per league at a time, so that "current season" is unambiguous.
60. As an admin, I want to complete a season, which freezes its final table and records the champion, so that history is preserved.
61. As an admin, I want to be warned if I complete a season with unplayed matches, and choose to void them, so that the final table is explicit.
62. As an admin, I want to reopen a completed season if I made a mistake, so that I can correct it.
63. As an admin, I want to delete a draft season, so that I can clean up mistakes.

### Admin — matches & results
64. As an admin, I want to enter a result (home goals, away goals) from the match card in a couple of taps, so that results get in quickly right after a game.
65. As an admin, I want to optionally add match details (scorers with minutes, in-game teams used, possession, shots, shots on target, MOTM, notes), so that records are richer.
66. As an admin, I want to edit a result after saving, so that I can fix mistakes.
67. As an admin, I want to clear a result back to scheduled, so that a wrongly-entered game can be undone.
68. As an admin, I want to mark a match postponed or void, so that the table reflects reality.
69. As an admin, I want to reschedule a match date, so that upcoming matches stay accurate.
70. As an admin, I want to add an extra (manual) match to a season, so that I can handle replays or special cases.
71. As an admin, I want invalid input blocked (negative scores, same player both sides, non-participants), so that data stays clean.

## Implementation Decisions

### Stack
- Keep the existing scaffold: Vite + React 19, JavaScript (JSX), Firebase Web SDK v12, Firebase Auth (email/password), Firestore Standard `(default)` in `asia-south2`, Firebase Hosting, emulators for dev, oxlint.
- Add: client-side router (React Router) for deep-linkable pages; Vitest for unit tests; `@firebase/rules-unit-testing` for security-rules tests against the emulator. No UI component library — hand-built claymorphism components.
- No Cloud Functions (stay on the free Spark plan). All derived data computed client-side.
- Installable PWA (manifest + icons); Firestore persistent local cache enabled for offline reads.

### Architecture / modules
- **League engine (pure, deep module, no Firebase/React imports)** — the core of the app and the main test seam. Interface:
  - `generateFixtures(participantIds, { legs, seed? })` → list of `{ matchday, homeId, awayId }` using the circle method; handles odd participant counts with a bye; balances home/away; second leg mirrors the first with home/away swapped.
  - `computeStandings(matches, participantIds, { pointsWin, pointsDraw, pointsLoss, venue? })` → ordered rows `{ playerId, position, played, won, drawn, lost, goalsFor, goalsAgainst, goalDiff, points, form }`. Only `played` matches count. Tie-break order: points → goal difference → goals for → head-to-head points among tied players → name. `venue` = `all | home | away`.
  - `computeForm(matches, playerId, n = 5)` → recent W/D/L list, newest first.
  - `headToHead(matches, playerAId, playerBId)` → wins/draws/losses/goals and the match list.
  - `playerCareer(matchesAcrossSeasons, seasons, playerId)` → all-time totals, titles, per-season finishes, biggest win, longest win/unbeaten streak.
  - `seasonLeaders(matches, standings)` → most goals, best defence, most wins, biggest win.
  - `allTimeTable(matchesAcrossSeasons)` → aggregated standings across seasons.
  - `currentMatchday(matches, now)` → matchday to focus by default.
- **Data access layer** — thin repository over Firestore: typed read hooks (live `onSnapshot`) and admin write commands (create/update season, save result, batch-create fixtures, complete season). The only module that knows Firestore paths. Uses batched writes for fixture creation and season completion.
- **Auth/role module** — exposes `{ user, isAdmin, signIn, signOut }`; `isAdmin` = signed in AND an `admins/{uid}` document exists.
- **UI** — pages: Home, Matches, Match Detail, Table, Players, Player Profile, Head-to-Head, History, Season Detail, Admin (League, Players, Seasons, Result entry), Sign-in. Admin actions shown inline (e.g. "Enter result" on a match card) only when `isAdmin`.
- **Clay design system** — a small set of tokens + primitives (Card, Button, Chip, Tabs/SegmentedControl, Sheet/Modal, Input, Stepper for scores, Avatar/Crest, Table row, Bottom nav, Matchday scroller).

### Firestore data model
Replaces the current `teams`/`matches` rules model entirely.

```
admins/{uid}                        { createdAt }            — created manually in console
leagues/{leagueId}                  { name, emoji, color, activeSeasonId|null, createdAt, updatedAt }
leagues/{leagueId}/players/{playerId}
                                    { name, clubName, shortCode, color, emoji, archived, createdAt, updatedAt }
leagues/{leagueId}/seasons/{seasonId}
                                    { name, number, status: draft|active|completed,
                                      participantIds[], legs: 1|2,
                                      points: { win, draw, loss },
                                      startDate, endDate|null,
                                      championId|null, finalStandings[]|null,   — snapshot written on completion
                                      createdAt, updatedAt }
leagues/{leagueId}/seasons/{seasonId}/matches/{matchId}
                                    { leagueId, seasonId, matchday, homeId, awayId, playerIds[homeId, awayId],
                                      status: scheduled|played|postponed|void,
                                      homeGoals|null, awayGoals|null, scheduledAt|null, playedAt|null,
                                      details: { scorers[{ side, name, minute }], homeTeamUsed, awayTeamUsed,
                                                 possession{home,away}, shots{home,away}, shotsOnTarget{home,away},
                                                 motm, notes } | null,
                                      createdAt, updatedAt }
```
- Standings are **never stored** for active seasons — always derived by the league engine from matches (no drift). On completion, the engine output is snapshotted into `finalStandings` + `championId` so the History list is a cheap single-collection read.
- `playerIds` array + collection-group query on `matches` (`array-contains`) powers player career and H2H across seasons; add the needed composite index.
- `leagues/{id}.activeSeasonId` points to the current season; enforced single active season by the season-activation write (batched).
- Single league supported in the UI v1 (first league auto-selected), but the model supports several.

### Security rules
- Public read (no sign-in) for `leagues/**`.
- Writes allowed only when `exists(/admins/{request.auth.uid})`.
- `admins` collection: readable only by the matching uid (so the client can check its own role); not writable from clients.
- Field validation kept from current rules style: allowed/required keys, string lengths, score ints 0–99, `homeId != awayId`, status enums, goals must be null unless `played`, server timestamps.
- Player delete denied by the UI when they have matches (rules allow admin delete; the UI enforces the archive path).

### UI / UX (AllFootball-inspired, mobile-first)
- Designed for 360–430px widths first; scales to tablet/desktop with a centered max-width column and side-rail nav on wide screens.
- Reference app: AllFootball. Borrowed patterns: bottom tab bar, collapsing top bar, league-style swipe tabs, matchday chip rail with current matchday centered + side chevrons, fixture rows grouped by date, sticky table header with pinned #/Club columns and sideways-scrolling stats, zone stripes + legend, sticky match scoreboard with Overview (goal timeline) / Stats (paired bars: possession, shots, on target) / H2H (meetings, each side's last five, current ranks) tabs, W/D/L form chips.
- Bottom tab bar with 5 tabs; sticky page headers; swipeable segmented tabs inside pages (e.g. Table: All / Home / Away; Matches: Upcoming / Results / All).
- Horizontal matchday chip scroller defaulting to `currentMatchday`.
- Match cards: crest bubbles, short codes, score pill or date pill, status chip.
- Form shown as W (green) / D (grey) / L (red) clay chips.
- Admin result entry via a bottom sheet with large +/– steppers for each side; optional details collapsed under "More details".
- Touch targets ≥ 44px; skeleton loaders while data loads.

### Claymorphism (strict)
- Every surface is a "clay" element: large radius (20–32px on cards, full pill on buttons/chips), soft pastel fills, no hard borders.
- Shadow stack per element: outer soft drop shadow + inner light highlight (top-left) + inner dark shade (bottom-right) to look puffy/inflated.
- Pressed state: shadow inverts/shrinks (element looks pushed in).
- Soft pastel palette on a light tinted background; each Player's crest color used as a pastel clay bubble.
- Rounded, friendly typeface; generous spacing.
- Light theme only in v1.
- Starting tokens (from research, tune as needed): canvas `#E4E9F2`; pastel fills `#C5D4FF`, `#F6C6D0`, `#BFE6D0`, `#F8D7A8`, `#E0D0F8`; ink `#243040`, muted `#5E6B7A`; radii cards 32px / inner tiles 24px / icon wells 16px / pills 999px (nested radius = outer − padding); outer stack `8px 8px 16px rgba(163,177,198,.55), -8px -8px 16px #fff`; inset stack `inset 4px 4px 8px rgba(255,255,255,.7), inset -4px -4px 8px rgba(140,155,180,.25)`; button lip `0 6px 0 <darker clay>, 0 12px 20px rgba(100,120,160,.28)`; rim `2px solid rgba(255,255,255,.6)`; press = `translateY(4px)` + drop lip, keep insets.
- Implemented as CSS custom-property tokens (colors, radii, shadow stacks) + reusable primitives; no ad-hoc shadows in pages.

## Testing Decisions

- Good tests assert external behaviour through a module's public interface (inputs → outputs), never internal helpers or component internals. Tests should survive refactors.
- **Seam 1 (primary): League engine** — Vitest unit tests with plain match fixtures. Cover: fixture generation (every pair meets exactly once per leg; no participant twice in a matchday; odd counts with bye; home/away balance; second leg mirrored), standings (points/GD/GF calc, only `played` counted, every tie-break step incl. H2H, custom points rules, home/away views), form, head-to-head, career stats/streaks, season leaders, all-time table, current matchday.
- **Seam 2: Firestore security rules** — `@firebase/rules-unit-testing` against the emulator. Cover: anonymous read allowed; anonymous/non-admin writes denied; admin writes allowed; invalid payloads (bad scores, same home/away, goals on scheduled match, unknown fields) rejected; `admins` not client-writable.
- UI not unit-tested in v1; verified manually on mobile viewport against the emulators.
- No prior test art in the repo; these establish the conventions.

## Out of Scope

- Player (non-admin) accounts, self-reporting results, result approval flows.
- Knockout cups, playoffs, groups, multiple divisions, promotion/relegation.
- Push notifications, chat, comments, reactions.
- Live in-match updates / minute-by-minute events.
- Image uploads (crests are color + emoji/initials; no Cloud Storage).
- Cloud Functions, server-side aggregation, Blaze plan features.
- Dark theme; i18n.
- Multiple-league switcher UI (model supports it; UI uses one league).

## Further Notes

- Existing `firestore.rules` (teams/matches, any signed-in user can write) and its header comment are fully replaced by the model above.
- First admin is bootstrapped by creating the user in Firebase Auth and adding an `admins/{uid}` doc in the console (document in README). Emulator seed script should create an admin user, a league, ~6 players, one completed and one active season for dev.
- Interpreting the request "only admin can add/modify; users can only read": Admin = full create/update/delete; everyone else read-only.
- Work split suggestion for implementation: (1) league engine + tests, (2) rules + rules tests + seed, (3) clay design system, (4) viewer pages, (5) admin flows, (6) PWA/offline + deploy. Steps 1–3 are independent and can run in parallel sessions.
