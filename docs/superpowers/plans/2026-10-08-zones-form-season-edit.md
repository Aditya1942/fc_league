# Qualification Zones, Form Order, and Season Edit/Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colour the top N table positions per season, show Form in matchday order with the newest result on the right, and let the Admin edit Active/Completed seasons and delete Active ones.

**Architecture:** The rules for ordering form and building table zones go into pure engine modules (`src/engine/time.js`, `src/engine/standings.js`, the new `src/engine/zones.js`), which have unit tests. Season-patch validation moves out of `src/data/writes.js` into a pure `src/data/validate.js` so it can be unit-tested without Firebase. `firestore.rules` gains an optional `qualificationSpots` field, relaxed freeze lists for active and completed seasons, and a one-batch delete for an active season. The admin UI wires these together.

**Tech Stack:** React 19 (JSX, no TypeScript), Vite, Firebase Firestore v12 web SDK, Vitest, `@firebase/rules-unit-testing`, oxlint.

**Spec:** `CONTEXT.md` (glossary) plus the decisions below. These came out of the grilling session on 2026-10-08 and the user confirmed them.

### Decisions (the spec)

1. **Results stay Admin-only.** The code already enforces this in `firestore.rules` and in `AdminMatchAction.jsx:363`. CI (`.github/workflows/firebase-hosting-merge.yml`) deploys **hosting only**, so the live rules can be stale. The only action is to deploy `firestore.rules` (Task 7).
2. **Qualification spots (N)** are set per season. They count position 1. Default 1, range 1 to (participants − 1). Seasons without the field are treated as 1.
3. **Zones** (only in the "All" table view):
   - Position 1: **gold**, labelled "Title spot", or "Champion" once Completed.
   - Positions 2..N: **green**, labelled "Qualification zone" (fixed text).
   - Last place: red.
   - No zone when the table has fewer than 2 rows.
4. **Form:**
   - Ordered by season number, then matchday. Within a matchday, by `playedAt`, then input order.
   - Displayed oldest→newest (newest on the **right**), up to 5 results, played matches only, no padding slots.
   - Completed seasons recompute form from their matches and ignore the stored `finalStandings[].form`.
5. **Active season:**
   - The Admin can edit name, points, start date and Qualification spots.
   - The Admin can delete it. This hard-deletes the season and all its matches and clears `league.activeSeasonId`. The Admin must type the season name exactly to confirm.
6. **Completed season:** can edit name and Qualification spots only. No delete.
7. **Draft season:** no UI change. Its delete moves to the shared `deleteSeason`.

## Global Constraints

- Code style matches the repo: single quotes, no semicolons, 2-space indent, plain `.js`/`.jsx`, named exports (pages use default exports).
- Unit tests: `npm test` (= `vitest run src`). Rules tests: `npm run test:rules`, which needs Java 21+ and starts the Firestore emulator on port 8080. Lint: `npm run lint`.
- Glossary terms in UI copy are exact: "Title spot", "Champion", "Qualification zone", "Last place", "Qualification spots".
- `firestore.rules` must stay under the 1000-expression limit. Keep the new checks O(1); no per-item loops.
- Never write to production Firestore from tests. Deploying rules (Task 7) needs explicit user confirmation.

## Review Focus

1. **Deleting a full-size Active season** (12 players, 2 legs = 132 matches plus extra added matches) must succeed in one batch under the rules' access-call limits. The rules test in Task 4 deletes an active season with 40 matches.
2. **Seasons created before this change** have no `qualificationSpots`. They must still render (N = 1) and still accept name edits. Tested in Task 3 (`qualificationSpotsOf`) and Task 4 (legacy doc update).
3. **Results entered out of matchday order** (MD5 saved before MD3, or a whole season entered at once) must still give form in matchday order. Tested in Task 1.
4. **A player with two matches on one matchday** (manual "Add match") must order by `playedAt`, then input order. Tested in Task 1.
5. **A 2-player season** has no room for a Qualification zone. N is clamped to 1, and the create form only allows 1. Tested in Task 3 (`tableZones`) and Task 5 (`normalizeQualificationSpots`).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `src/engine/time.js` | modify | add `compareFormOrder` |
| `src/engine/standings.js` | modify | `computeForm` uses form order, oldest→newest, `seasonOrder` option; add `seasonOrderOf` |
| `src/engine/zones.js` | **create** | `qualificationSpotsOf`, `tableZones` |
| `src/engine/index.js` | modify | export the new functions |
| `src/engine/standings.test.js` | modify | form tests |
| `src/engine/zones.test.js` | **create** | zone tests |
| `src/hooks/standings.js` | modify | completed seasons use the computed form |
| `src/hooks/standings.test.js` | **create** | test for the above |
| `src/pages/viewer/format.js` | modify | remove `tableZones` |
| `src/pages/viewer/TablePage.jsx`, `SeasonDetailPage.jsx` | modify | use engine `tableZones(rows, season)` |
| `src/pages/viewer/H2HPage.jsx`, `MatchDetailPage.jsx` | modify | form order |
| `src/ui/StandingsTable.jsx`, `src/index.css`, `src/ui/showcase.test.js` | modify | gold, green and red zone colours |
| `firestore.rules`, `tests/rules/firestore.test.js` | modify | rules for spots, edits and active delete |
| `src/data/documents.js` | modify | `qualificationSpots` on `seasonDoc` |
| `src/data/validate.js` | **create** | pure validators, `SEASON_EDITABLE`, `seasonPatch`, `normalizeQualificationSpots` |
| `src/data/validate.test.js` | **create** | tests |
| `src/data/writes.js`, `src/data/index.js` | modify | use `validate.js`; `deleteSeason` replaces `deleteDraftSeason` |
| `src/pages/admin/SeasonsAdmin.jsx` | modify | Qualification spots on create |
| `src/pages/admin/SeasonAdmin.jsx`, `AdminParts.jsx` | modify | edit sheet, active delete, completed table |

---

### Task 1: Form order in the engine

**Files:**
- Modify: `src/engine/time.js` (add after `compareOldest`, ~line 45)
- Modify: `src/engine/standings.js:1-9` (imports), `:107-118` (`computeForm`)
- Modify: `src/engine/index.js:2`
- Test: `src/engine/standings.test.js` (the `computeForm` describe block at ~274-329 and the home/away test at ~173-262)

**Interfaces:**
- Produces:
  - `compareFormOrder(a: {match, index}, b: {match, index}, seasonOrder?: Map<string, number>) => number`
  - `computeForm(matches, playerId, n = 5, options?: { seasonOrder?: Map<string, number> }) => ('W'|'D'|'L')[]`, oldest first and newest last
  - `seasonOrderOf(seasons: {id, number?}[]) => Map<string, number>`
  - All three are exported from `src/engine/index.js`.

- [ ] **Step 1: Rewrite the `computeForm` tests (they fail first)**

In `src/engine/standings.test.js`, change the import on line 2 to:

```js
import { allTimeTable, computeForm, computeStandings, seasonOrderOf } from './index.js'
```

Replace the whole `describe('computeForm', ...)` block with:

```js
describe('computeForm', () => {
  it('returns the last n results, oldest first and newest last, for that player only', () => {
    const matches = [
      match({ id: 'old', matchday: 1, homeId: 'a', awayId: 'b', homeGoals: 0, awayGoals: 1 }),
      match({ id: 'w', matchday: 2, homeId: 'c', awayId: 'a', homeGoals: 0, awayGoals: 2 }),
      match({ id: 'd', matchday: 3, homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 1 }),
      match({ id: 'l', matchday: 4, homeId: 'b', awayId: 'a', homeGoals: 3, awayGoals: 0 }),
      match({ id: 'other', matchday: 5, homeId: 'b', awayId: 'c', homeGoals: 5, awayGoals: 0 }),
      match({ id: 'skip', matchday: 6, homeId: 'a', awayId: 'c', homeGoals: 4, awayGoals: 0, status: 'void' }),
      match({ id: 'new', matchday: 7, homeId: 'a', awayId: 'c', homeGoals: 1, awayGoals: 0 }),
      match({ id: 'first', matchday: 0, homeId: 'a', awayId: 'c', homeGoals: 2, awayGoals: 0 }),
    ]

    expect(computeForm(matches, 'a')).toEqual(['L', 'W', 'D', 'L', 'W'])
    expect(computeForm(matches, 'a', 2)).toEqual(['L', 'W'])
    expect(computeForm(matches, 'a', 0)).toEqual([])
    expect(computeForm(matches, 'z')).toEqual([])
  })

  it('orders by matchday even when results were saved out of order', () => {
    const matches = [
      match({ matchday: 5, homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 0, playedAt: 1000 }),
      match({ matchday: 3, homeId: 'a', awayId: 'b', homeGoals: 0, awayGoals: 1, playedAt: 9000 }),
      match({ matchday: 4, homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 1, playedAt: 5000 }),
    ]

    expect(computeForm(matches, 'a')).toEqual(['L', 'D', 'W'])
  })

  it('breaks a shared matchday by playedAt (Date, millis, Timestamp-like), then input order', () => {
    const matches = [
      match({ matchday: 2, homeId: 'a', awayId: 'b', homeGoals: 0, awayGoals: 1, playedAt: 3000 }),
      match({ matchday: 2, homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 0, playedAt: { toDate: () => new Date(1000) } }),
      match({ matchday: 2, homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 1, playedAt: new Date(2000) }),
      match({ matchday: 2, homeId: 'b', awayId: 'a', homeGoals: 0, awayGoals: 1, playedAt: null }),
      match({ matchday: 2, homeId: 'b', awayId: 'a', homeGoals: 2, awayGoals: 1, playedAt: null }),
    ]

    expect(computeForm(matches, 'a')).toEqual(['W', 'D', 'L', 'W', 'L'])
  })

  it('orders across seasons by season number when given a season order', () => {
    const seasonOrder = seasonOrderOf([{ id: 'later', number: 2 }, { id: 'earlier', number: 1 }])
    const matches = [
      match({ seasonId: 'later', matchday: 1, homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 0 }),
      match({ seasonId: 'earlier', matchday: 9, homeId: 'a', awayId: 'b', homeGoals: 0, awayGoals: 1 }),
    ]

    expect(computeForm(matches, 'a', 5, { seasonOrder })).toEqual(['L', 'W'])
  })
})
```

In the `'builds home-only and away-only tables, including form'` test, every `form: [...]` with more than one entry must be reversed. The only one is `form: ['L', 'W']`, which becomes `form: ['W', 'L']`.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run src/engine/standings.test.js`
Expected: FAIL. `seasonOrderOf` is not exported, and the form arrays come out newest-first.

- [ ] **Step 3: Implement `compareFormOrder` in `src/engine/time.js`**

Add this directly after `compareOldest`:

```js
export function compareFormOrder(a, b, seasonOrder) {
  const leftSeason = seasonOrder?.get(a.match.seasonId) ?? 0
  const rightSeason = seasonOrder?.get(b.match.seasonId) ?? 0
  if (leftSeason !== rightSeason) return leftSeason - rightSeason
  const leftDay = a.match.matchday ?? 0
  const rightDay = b.match.matchday ?? 0
  if (leftDay !== rightDay) return leftDay - rightDay
  const left = toMillis(a.match.playedAt)
  const right = toMillis(b.match.playedAt)
  if (left != null && right != null && left !== right) return left - right
  if (left != null && right == null) return -1
  if (left == null && right != null) return 1
  return a.index - b.index
}
```

- [ ] **Step 4: Update `computeForm` and add `seasonOrderOf` in `src/engine/standings.js`**

In the import list, replace `compareOldest,` with `compareFormOrder,`. `compareOldest` is no longer used in this file.

Replace `computeForm` with:

```js
export function seasonOrderOf(seasons) {
  return new Map((seasons ?? []).map((season, index) => [season.id, season.number ?? index]))
}

export function computeForm(matches, playerId, n = 5, options = {}) {
  const limit = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 5
  if (limit === 0) return []
  const seasonOrder = options?.seasonOrder
  const played = []
  const list = Array.isArray(matches) ? matches : []
  list.forEach((match, index) => {
    if (!isPlayed(match)) return
    if (match.homeId !== playerId && match.awayId !== playerId) return
    played.push({ match, index })
  })
  played.sort((a, b) => compareFormOrder(a, b, seasonOrder))
  return played.slice(-limit).map(({ match }) => resultOf(match, playerId))
}
```

In `src/engine/index.js`, change line 2 to:

```js
export { allTimeTable, computeForm, computeStandings, seasonOrderOf } from './standings.js'
export { compareFormOrder } from './time.js'
```

- [ ] **Step 5: Run the engine tests and confirm they pass**

Run: `npx vitest run src/engine`
Expected: PASS for all files, including `records.test.js`.

- [ ] **Step 6: Commit**

```bash
git add src/engine/time.js src/engine/standings.js src/engine/index.js src/engine/standings.test.js
git commit -m "feat(engine): form in matchday order, newest last"
```

---

### Task 2: Form callers (H2H, match detail, completed seasons)

**Files:**
- Modify: `src/hooks/standings.js:43`
- Create: `src/hooks/standings.test.js`
- Modify: `src/pages/viewer/H2HPage.jsx:3,22,66,70`
- Modify: `src/pages/viewer/MatchDetailPage.jsx:5,23,39-45`

**Interfaces:**
- Consumes: `computeForm(matches, playerId, n, { seasonOrder })`, `seasonOrderOf(seasons)` and `compareFormOrder(a, b, seasonOrder)` from Task 1.
- Produces: `seasonStandings(season, matches, names, venue)`, which now always returns the computed `form`.

- [ ] **Step 1: Write the failing hook test**

Create `src/hooks/standings.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { seasonStandings } from './standings.js'

describe('seasonStandings', () => {
  it('recomputes form for a completed season instead of trusting the stored snapshot', () => {
    const season = {
      status: 'completed',
      participantIds: ['a', 'b'],
      points: { win: 3, draw: 1, loss: 0 },
      finalStandings: [
        { playerId: 'a', position: 1, played: 2, won: 1, drawn: 1, lost: 0, goalsFor: 3, goalsAgainst: 2, goalDiff: 1, points: 4, form: ['W', 'D'] },
        { playerId: 'b', position: 2, played: 2, won: 0, drawn: 1, lost: 1, goalsFor: 2, goalsAgainst: 3, goalDiff: -1, points: 1, form: ['L', 'D'] },
      ],
    }
    const matches = [
      { id: '1', seasonId: 's', matchday: 2, homeId: 'a', awayId: 'b', status: 'played', homeGoals: 2, awayGoals: 1, playedAt: 1000 },
      { id: '2', seasonId: 's', matchday: 1, homeId: 'b', awayId: 'a', status: 'played', homeGoals: 1, awayGoals: 1, playedAt: 2000 },
    ]

    const rows = seasonStandings(season, matches)

    expect(rows.map((row) => row.playerId)).toEqual(['a', 'b'])
    expect(rows[0].form).toEqual(['D', 'W'])
    expect(rows[1].form).toEqual(['D', 'L'])
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/hooks/standings.test.js`
Expected: FAIL. `rows[0].form` is `['W', 'D']`, the stored snapshot.

- [ ] **Step 3: Ignore the stored form**

In `src/hooks/standings.js`, replace the line

```js
        form: Array.isArray(row.form) && row.form.length ? row.form : computed.form ?? [],
```

with

```js
        form: computed.form ?? [],
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npx vitest run src/hooks/standings.test.js`
Expected: PASS

- [ ] **Step 5: H2H uses season order**

In `src/pages/viewer/H2HPage.jsx`:
- Change the import to `import { computeForm, headToHead, seasonOrderOf } from '../../engine/index.js'`.
- After the `meetings` line inside `Comparison`, add:

```js
  const seasonOrder = useMemo(() => seasonOrderOf(seasons), [seasons])
```

This must come before the `if (history.loading) return` early return so the hook order stays stable. Put it right after the `record` `useMemo`, and compute `meetings` after it if needed.

- Change both `computeForm(meetings, aId, 5)` and `computeForm(meetings, bId, 5)` to pass `{ seasonOrder }` as the 4th argument.

- [ ] **Step 6: Match detail "form going into the match" uses form order**

In `src/pages/viewer/MatchDetailPage.jsx`:
- Change line 5 to `import { compareFormOrder, computeForm, headToHead } from '../../engine/index.js'`.
- Replace `playedBefore` (lines 39-45) with:

```js
function playedBefore(candidate, match) {
  if (candidate.id === match.id || candidate.status !== 'played') return false
  return compareFormOrder({ match: candidate, index: 0 }, { match, index: 1 }) < 0
}
```

- If `matchMillis` is no longer referenced anywhere in the file, remove it from the `./format.js` import on line 23. `npm run lint` will flag it if not.

- [ ] **Step 7: Run all unit tests and lint**

Run: `npm test && npm run lint`
Expected: PASS, no lint errors.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/standings.js src/hooks/standings.test.js src/pages/viewer/H2HPage.jsx src/pages/viewer/MatchDetailPage.jsx
git commit -m "fix: form uses matchday order everywhere; completed seasons recompute form"
```

---

### Task 3: Qualification zone and table colours

**Files:**
- Create: `src/engine/zones.js`
- Create: `src/engine/zones.test.js`
- Modify: `src/engine/index.js`
- Modify: `src/pages/viewer/format.js:120-126` (delete `tableZones`)
- Modify: `src/pages/viewer/TablePage.jsx:12,42`
- Modify: `src/pages/viewer/SeasonDetailPage.jsx:18,134`
- Modify: `src/ui/StandingsTable.jsx:15-20` (`zoneColor`)
- Modify: `src/index.css:18`
- Test: `src/ui/showcase.test.js`

**Interfaces:**
- Produces:
  - `qualificationSpotsOf(season, rowCount?) => number`, an integer clamped to [1, max(1, count − 1)], where count is `rowCount`, or failing that `season.participantIds.length`.
  - `tableZones(rows, season) => { id: 'champion'|'qualify'|'last', label: string, positions: number[] }[]`
  - Both are exported from `src/engine/index.js`.

- [ ] **Step 1: Write the failing zone tests**

Create `src/engine/zones.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { qualificationSpotsOf, tableZones } from './index.js'

function rows(count) {
  return Array.from({ length: count }, (_, index) => ({ playerId: `p${index + 1}`, position: index + 1 }))
}

describe('qualificationSpotsOf', () => {
  it('defaults to 1 when the season has no value (legacy seasons)', () => {
    expect(qualificationSpotsOf({ participantIds: ['a', 'b', 'c', 'd'] })).toBe(1)
  })

  it('clamps to 1..count-1', () => {
    expect(qualificationSpotsOf({ qualificationSpots: 9, participantIds: ['a', 'b', 'c', 'd'] })).toBe(3)
    expect(qualificationSpotsOf({ qualificationSpots: 0 }, 4)).toBe(1)
    expect(qualificationSpotsOf({ qualificationSpots: 3 }, 2)).toBe(1)
  })
})

describe('tableZones', () => {
  it('marks title spot, positions 2..N as the qualification zone, and last place', () => {
    expect(tableZones(rows(6), { status: 'active', qualificationSpots: 4 })).toEqual([
      { id: 'champion', label: 'Title spot', positions: [1] },
      { id: 'qualify', label: 'Qualification zone', positions: [2, 3, 4] },
      { id: 'last', label: 'Last place', positions: [6] },
    ])
  })

  it('calls position 1 Champion once the season is completed', () => {
    expect(tableZones(rows(3), { status: 'completed' })[0]).toEqual({ id: 'champion', label: 'Champion', positions: [1] })
  })

  it('has no qualification zone when N is 1 or the season has two players', () => {
    expect(tableZones(rows(4), { status: 'active' }).map((zone) => zone.id)).toEqual(['champion', 'last'])
    expect(tableZones(rows(2), { status: 'active', qualificationSpots: 5 }).map((zone) => zone.id)).toEqual(['champion', 'last'])
  })

  it('never overlaps last place', () => {
    const zones = tableZones(rows(4), { status: 'active', qualificationSpots: 3 })
    expect(zones.find((zone) => zone.id === 'qualify').positions).toEqual([2, 3])
    expect(zones.find((zone) => zone.id === 'last').positions).toEqual([4])
  })

  it('returns no zones for tables with fewer than two rows', () => {
    expect(tableZones(rows(1), { status: 'active' })).toEqual([])
    expect(tableZones([], { status: 'active' })).toEqual([])
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run src/engine/zones.test.js`
Expected: FAIL. `qualificationSpotsOf` is not exported.

- [ ] **Step 3: Implement `src/engine/zones.js`**

```js
export function qualificationSpotsOf(season, rowCount) {
  const count = rowCount ?? season?.participantIds?.length ?? 0
  const max = Math.max(1, count - 1)
  const value = Number.isInteger(season?.qualificationSpots) ? season.qualificationSpots : 1
  return Math.min(Math.max(value, 1), max)
}

export function tableZones(rows, season) {
  if (!Array.isArray(rows) || rows.length < 2) return []
  const spots = qualificationSpotsOf(season, rows.length)
  const zones = [
    { id: 'champion', label: season?.status === 'completed' ? 'Champion' : 'Title spot', positions: [1] },
  ]
  if (spots >= 2) {
    zones.push({
      id: 'qualify',
      label: 'Qualification zone',
      positions: Array.from({ length: spots - 1 }, (_, index) => index + 2),
    })
  }
  zones.push({ id: 'last', label: 'Last place', positions: [rows.length] })
  return zones
}
```

Add to `src/engine/index.js`:

```js
export { qualificationSpotsOf, tableZones } from './zones.js'
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/engine/zones.test.js`
Expected: PASS

- [ ] **Step 5: Write a failing StandingsTable colour test**

In `src/ui/showcase.test.js`, add this after the existing `'standings show the club, points header, and zone legend'` test. Reuse the file's existing imports (`renderToStaticMarkup`, `createElement`, `StandingsTable`, `test`, `expect`) and add `import { tableZones } from '../engine/index.js'` at the top:

```js
test('standings colour title spot, qualification zone, and last place differently', () => {
  const rows = ['p1', 'p2', 'p3', 'p4'].map((playerId, index) => ({
    playerId,
    position: index + 1,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
    form: [],
  }))
  const html = renderToStaticMarkup(createElement(StandingsTable, {
    rows,
    players: {},
    zones: tableZones(rows, { status: 'active', qualificationSpots: 3 }),
  }))
  expect(html).toContain('var(--zone-champion)')
  expect(html).toContain('var(--zone-qualify)')
  expect(html).toContain('var(--zone-last)')
  expect(html).toContain('Qualification zone')
})
```

Run: `npx vitest run src/ui/showcase.test.js`
Expected: FAIL. `var(--zone-qualify)` is missing, because `zoneColor` maps everything that isn't `last` to champion.

- [ ] **Step 6: Map zone ids to colours**

In `src/ui/StandingsTable.jsx`, replace `zoneColor` with:

```js
const ZONE_COLORS = {
  champion: 'var(--zone-champion)',
  qualify: 'var(--zone-qualify)',
  last: 'var(--zone-last)',
}

function zoneColor(zone) {
  if (!zone) return undefined
  if (zone.color) return zone.color
  return ZONE_COLORS[zone.id] ?? ZONE_COLORS[zone.tone] ?? ZONE_COLORS.champion
}
```

In `src/index.css`, replace the `--zone-champion` line (18) with:

```css
  --zone-champion: color-mix(in srgb, var(--clay-peach) 40%, #b7791f);
  --zone-qualify: color-mix(in srgb, var(--clay-mint) 52%, #1d6b45);
```

Run: `npx vitest run src/ui/showcase.test.js`
Expected: PASS

- [ ] **Step 7: Switch the viewer pages to the engine `tableZones`**

- `src/pages/viewer/format.js`: delete the `tableZones` function (lines 120-126).
- `src/pages/viewer/TablePage.jsx`:
  - Delete `import { tableZones } from './format.js'`.
  - Add `import { tableZones } from '../../engine/index.js'`.
  - Change the zones prop to `zones={venue === 'all' ? tableZones(standings, season) : []}`.
- `src/pages/viewer/SeasonDetailPage.jsx`:
  - Remove `tableZones` from the `./format.js` import.
  - Add `import { tableZones } from '../../engine/index.js'`. If the file already imports from `../../engine/index.js`, add `tableZones` to that import instead.
  - Change line 134 to `zones={tableZones(standings, season)}`.

- [ ] **Step 8: Run everything**

Run: `npm test && npm run lint && npm run build`
Expected: PASS, no lint errors, build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/engine/zones.js src/engine/zones.test.js src/engine/index.js src/pages/viewer/format.js src/pages/viewer/TablePage.jsx src/pages/viewer/SeasonDetailPage.jsx src/ui/StandingsTable.jsx src/index.css src/ui/showcase.test.js
git commit -m "feat: gold title spot, green qualification zone per season"
```

---

### Task 4: Firestore rules for qualification spots, season edits and active delete

**Files:**
- Modify: `firestore.rules` (data-model comment ~42-65, ~80-81; `isValidSeasonShape` ~280-296; `validSeasonUpdate` ~329-342; `activeSeasonPointerOk` ~344-355; season `allow delete` ~526; match `allow delete` ~541-542)
- Modify: `src/data/documents.js` (`seasonDoc`)
- Test: `tests/rules/firestore.test.js`

**Interfaces:**
- Produces:
  - `seasonDoc({ ..., qualificationSpots = 1 })` writes the `qualificationSpots` field.
  - Rules accept an **active-season delete** only as one batch containing: every match delete, the season delete, and `leagues/{id}.activeSeasonId = null` (when the league points at it).

- [ ] **Step 1: Add `qualificationSpots` to `seasonDoc`**

In `src/data/documents.js`, add the parameter `qualificationSpots = 1,` after `startDate,` in `seasonDoc`'s destructuring. Add `qualificationSpots,` to the returned object after `points,`.

- [ ] **Step 2: Write the failing rules tests**

In `tests/rules/firestore.test.js`, add this helper below `standing()`:

```js
async function activateS1(db) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'leagues/lg/seasons/s1'), { status: 'active', updatedAt: serverTimestamp() })
  batch.update(doc(db, 'leagues/lg'), { activeSeasonId: 's1', updatedAt: serverTimestamp() })
  await assertSucceeds(batch.commit())
}

function emptyStandings() {
  return ['p1', 'p2'].map((playerId, index) => standing({
    playerId,
    position: index + 1,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    form: [],
  }))
}
```

Add these tests inside `describe('firestore rules', ...)`, before its closing `})`:

```js
  it('validates qualification spots and still accepts seasons without them', async () => {
    const db = await seedDraft()
    const base = { name: 'Season 3', number: 3, participantIds: ['p1', 'p2'], startDate: START }
    await assertFails(setDoc(doc(db, 'leagues/lg/seasons/s3'), seasonDoc({ ...base, qualificationSpots: 2 })))
    await assertFails(setDoc(doc(db, 'leagues/lg/seasons/s3'), seasonDoc({ ...base, qualificationSpots: 0 })))
    await assertSucceeds(setDoc(doc(db, 'leagues/lg/seasons/s3'), seasonDoc({ ...base, qualificationSpots: 1 })))

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const legacy = { ...seasonDoc(base), createdAt: Timestamp.now(), updatedAt: Timestamp.now() }
      delete legacy.qualificationSpots
      await setDoc(doc(dbOf(context), 'leagues/lg/seasons/legacy'), legacy)
    })
    await assertSucceeds(updateDoc(doc(db, 'leagues/lg/seasons/legacy'), {
      name: 'Legacy renamed',
      updatedAt: serverTimestamp(),
    }))
  }, 20000)

  it('edits an active season name, points, start date, and spots but not its setup', async () => {
    const db = await seedDraft()
    await activateS1(db)
    const seasonRef = doc(db, 'leagues/lg/seasons/s1')
    await assertSucceeds(updateDoc(seasonRef, {
      name: 'Renamed',
      points: { win: 2, draw: 1, loss: 0 },
      startDate: Timestamp.fromDate(new Date('2026-02-01T00:00:00Z')),
      qualificationSpots: 1,
      updatedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(seasonRef, { qualificationSpots: 2, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(seasonRef, { legs: 2, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(seasonRef, { participantIds: ['p2', 'p1'], updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(seasonRef, { number: 5, updatedAt: serverTimestamp() }))
  }, 20000)

  it('edits only the name and spots of a completed season and never deletes it', async () => {
    const db = await seedDraft()
    await activateS1(db)
    const seasonRef = doc(db, 'leagues/lg/seasons/s1')
    await assertSucceeds(updateDoc(seasonRef, {
      status: 'completed',
      championId: 'p1',
      finalStandings: emptyStandings(),
      endDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
    await assertSucceeds(updateDoc(doc(db, 'leagues/lg'), { activeSeasonId: null, updatedAt: serverTimestamp() }))

    await assertSucceeds(updateDoc(seasonRef, { name: 'Season One', qualificationSpots: 1, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(seasonRef, { points: { win: 2, draw: 1, loss: 0 }, updatedAt: serverTimestamp() }))
    await assertFails(updateDoc(seasonRef, {
      startDate: Timestamp.fromDate(new Date('2026-02-01T00:00:00Z')),
      updatedAt: serverTimestamp(),
    }))
    await assertFails(deleteDoc(seasonRef))
  }, 20000)

  it('deletes an active season and its 40 matches only in one batch that clears the pointer', async () => {
    const db = await seedDraft()
    const ids = Array.from({ length: 40 }, (_, index) => `m${index + 1}`)
    const seed = writeBatch(db)
    ids.forEach((id) => seed.set(doc(db, `leagues/lg/seasons/s1/matches/${id}`), scheduled()))
    await assertSucceeds(seed.commit())
    await activateS1(db)
    await assertSucceeds(updateDoc(doc(db, 'leagues/lg/seasons/s1/matches/m1'), {
      status: 'played',
      homeGoals: 1,
      awayGoals: 0,
      playedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))

    await assertFails(deleteDoc(doc(db, 'leagues/lg/seasons/s1/matches/m1')))
    await assertFails(deleteDoc(doc(db, 'leagues/lg/seasons/s1')))
    await assertFails(updateDoc(doc(db, 'leagues/lg'), { activeSeasonId: null, updatedAt: serverTimestamp() }))

    const wipe = writeBatch(db)
    ids.forEach((id) => wipe.delete(doc(db, `leagues/lg/seasons/s1/matches/${id}`)))
    wipe.delete(doc(db, 'leagues/lg/seasons/s1'))
    wipe.update(doc(db, 'leagues/lg'), { activeSeasonId: null, updatedAt: serverTimestamp() })
    await assertSucceeds(wipe.commit())

    expect((await getDoc(doc(db, 'leagues/lg'))).data().activeSeasonId).toBe(null)
    expect((await getDoc(doc(db, 'leagues/lg/seasons/s1'))).exists()).toBe(false)
  }, 30000)
```

- [ ] **Step 3: Run the rules tests and confirm the new ones fail**

Run: `npm run test:rules`
Expected:
- The 4 new tests FAIL. `keysExact` rejects `qualificationSpots`, active `points` and `startDate` are frozen, a completed name is frozen, and an active delete is denied.
- The existing tests also start failing, because `seasonDoc` now writes `qualificationSpots` and the old `keysExact` rejects it. That is expected until Step 4.

- [ ] **Step 4: Update `firestore.rules`**

(a) Data-model comment. Under `Collection: leagues/{leagueId}/seasons`, add after the `points:` line:

```
    //   - qualificationSpots: int, optional (1 to participants - 1; absent means 1)
```

Replace the transitions paragraph lines `// Setup fields freeze once the season leaves draft.` with:

```
    // Active seasons may change name, points, startDate, qualificationSpots.
    // Completed seasons may change name and qualificationSpots only.
    // Draft seasons can be deleted. Active seasons can be deleted only in one
    // batch that also deletes their matches and clears leagues.activeSeasonId.
```

Under matches, replace `// Deletes are allowed only while the parent season is draft.` with:

```
    // Deletes are allowed while the parent season is draft, or in the batch
    // that deletes the parent season.
```

(b) Add these two functions directly above `isValidSeasonShape`:

```
    function seasonKeysOk(data) {
      return data.keys().hasOnly([
          'name', 'number', 'status', 'participantIds', 'legs', 'points', 'qualificationSpots',
          'startDate', 'endDate', 'championId', 'finalStandings', 'createdAt', 'updatedAt'
        ])
        && data.keys().hasAll([
          'name', 'number', 'status', 'participantIds', 'legs', 'points',
          'startDate', 'endDate', 'championId', 'finalStandings', 'createdAt', 'updatedAt'
        ]);
    }

    // Seasons created before qualification zones have no field; the app reads that as 1.
    function qualificationOk(data) {
      return !('qualificationSpots' in data)
        || (data.qualificationSpots is int
            && data.qualificationSpots >= 1
            && data.qualificationSpots < data.participantIds.size());
    }
```

In `isValidSeasonShape`, replace the `keysExact(data, [ ... ])` call (the first condition) with `seasonKeysOk(data)`. Add `&& qualificationOk(data)` directly after `&& participantsOk(data.participantIds)`.

(c) In `validSeasonUpdate`, replace the `active → active` branch and the `completed → completed` branch with:

```
        || (prev == 'active' && next == 'active'
            && areImmutableFieldsUnchanged(['number', 'participantIds', 'legs', 'createdAt'])
            && snapshotFrozen())
```

```
        || (prev == 'completed' && next == 'completed'
            && areImmutableFieldsUnchanged([
              'number', 'participantIds', 'legs', 'points', 'startDate', 'createdAt'
            ])
            && snapshotFrozen());
```

(d) Add this above `activeSeasonPointerOk`:

```
    function inactiveAfter(leagueId, seasonId) {
      return !existsAfter(/databases/$(database)/documents/leagues/$(leagueId)/seasons/$(seasonId))
        || seasonDataAfter(leagueId, seasonId).status != 'active';
    }
```

In `activeSeasonPointerOk`, replace both occurrences of `seasonDataAfter(leagueId, prevId).status != 'active'` with `inactiveAfter(leagueId, prevId)`.

(e) Replace the season delete rule (`allow delete: if isAdmin() && resource.data.status == 'draft';`) with:

```
        // An active season can only go in the batch that clears the league's pointer to it.
        allow delete: if isAdmin()
          && (resource.data.status == 'draft'
              || (resource.data.status == 'active'
                  && getAfter(/databases/$(database)/documents/leagues/$(leagueId)).data.activeSeasonId != seasonId));
```

(f) Replace the match delete rule with:

```
          allow delete: if isAdmin()
            && (!existsAfter(/databases/$(database)/documents/leagues/$(leagueId)/seasons/$(seasonId))
                || seasonData(leagueId, seasonId).status == 'draft');
```

- [ ] **Step 5: Run the rules tests and confirm they all pass**

Run: `npm run test:rules`
Expected: PASS for every test, old and new.

If the 40-match batch fails with an access-call error, that is Review Focus #1. Report it and do not shrink the test. One fallback is to delete matches first, in one batch, with the season and pointer update in the same batch. This needs the match rule to read `getAfter(season)` rather than `existsAfter`. Stop and ask before changing the design.

- [ ] **Step 6: Run the unit tests (`seasonDoc` changed)**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add firestore.rules tests/rules/firestore.test.js src/data/documents.js
git commit -m "feat(rules): qualification spots, active/completed season edits, active season delete"
```

---

### Task 5: Data layer (validators, season patch, delete)

**Files:**
- Create: `src/data/validate.js`
- Create: `src/data/validate.test.js`
- Modify: `src/data/writes.js` (lines 15-16, 19-25, 43-62, 69-81, 83-102: move these functions out; `createSeason` ~249; `updateSeason` ~266-293; `deleteDraftSeason` ~408-425)
- Modify: `src/data/index.js`

**Interfaces:**
- Consumes: `seasonDoc({ qualificationSpots })` from Task 4.
- Produces:
  - `SEASON_EDITABLE: { draft: string[], active: string[], completed: string[] }`, exported from `src/data/index.js`
  - `seasonPatch(season: {status, participantIds}, patch) => object`, a validated Firestore patch without `updatedAt`. It throws on a blocked field or invalid value.
  - `normalizeQualificationSpots(value, participantCount) => number`
  - `updateSeason(leagueId, seasonId, patch) => Promise<void>`
  - `deleteSeason(leagueId, seasonId) => Promise<void>`, which replaces `deleteDraftSeason`
  - `createSeason(leagueId, { ..., qualificationSpots })`

- [ ] **Step 1: Write the failing validator tests**

Create `src/data/validate.test.js`:

```js
import { Timestamp } from 'firebase/firestore'
import { describe, expect, it } from 'vitest'
import { normalizeQualificationSpots, SEASON_EDITABLE, seasonPatch } from './validate.js'

const four = ['a', 'b', 'c', 'd']

describe('normalizeQualificationSpots', () => {
  it('accepts 1..participants-1', () => {
    expect(normalizeQualificationSpots(1, 4)).toBe(1)
    expect(normalizeQualificationSpots(3, 4)).toBe(3)
  })

  it('rejects out-of-range or non-integer values', () => {
    expect(() => normalizeQualificationSpots(4, 4)).toThrow('Qualification spots must be an integer from 1 to 3')
    expect(() => normalizeQualificationSpots(0, 4)).toThrow()
    expect(() => normalizeQualificationSpots(1.5, 4)).toThrow()
    expect(() => normalizeQualificationSpots(2, 2)).toThrow('from 1 to 1')
  })
})

describe('seasonPatch', () => {
  it('lets an active season change name, points, start date, and spots', () => {
    const patch = seasonPatch({ status: 'active', participantIds: four }, {
      name: '  Season 9 ',
      points: { win: 2, draw: 1, loss: 0 },
      startDate: new Date('2026-03-01T12:00:00Z'),
      qualificationSpots: 3,
    })
    expect(patch.name).toBe('Season 9')
    expect(patch.points).toEqual({ win: 2, draw: 1, loss: 0 })
    expect(patch.startDate).toBeInstanceOf(Timestamp)
    expect(patch.qualificationSpots).toBe(3)
  })

  it('blocks setup fields on an active season', () => {
    expect(() => seasonPatch({ status: 'active', participantIds: four }, { legs: 2 })).toThrow('legs')
    expect(() => seasonPatch({ status: 'active', participantIds: four }, { participantIds: ['a', 'b'] })).toThrow('participantIds')
  })

  it('lets a completed season change only name and spots', () => {
    expect(seasonPatch({ status: 'completed', participantIds: four }, { name: 'Old', qualificationSpots: 2 }))
      .toEqual({ name: 'Old', qualificationSpots: 2 })
    expect(() => seasonPatch({ status: 'completed', participantIds: four }, { points: { win: 3, draw: 1, loss: 0 } })).toThrow('points')
    expect(() => seasonPatch({ status: 'completed', participantIds: four }, { startDate: new Date() })).toThrow('startDate')
  })

  it('ignores null fields and rejects an empty patch', () => {
    expect(seasonPatch({ status: 'completed', participantIds: four }, { name: 'X', points: null })).toEqual({ name: 'X' })
    expect(() => seasonPatch({ status: 'active', participantIds: four }, {})).toThrow('Nothing to update')
  })

  it('keeps every field editable on a draft', () => {
    expect(SEASON_EDITABLE.draft).toEqual(['name', 'number', 'participantIds', 'legs', 'points', 'startDate', 'qualificationSpots'])
  })
})
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run src/data/validate.test.js`
Expected: FAIL. `./validate.js` does not exist.

- [ ] **Step 3: Create `src/data/validate.js`**

**Move** (cut, don't copy) these from `src/data/writes.js` into the new file, unchanged, and add `export` to each:
- `MIN_MS`
- `MAX_AHEAD_MS`
- `requiredText`
- `assertSeasonNumber`
- `assertLegs`
- `assertParticipantsList`
- `normalizePoints`
- `toTimestamp`
- `assertReasonable`

Then add the rest, so the file reads:

```js
import { Timestamp } from 'firebase/firestore'

export const MIN_MS = Date.UTC(2020, 0, 1)
export const MAX_AHEAD_MS = 800 * 24 * 60 * 60 * 1000

// ...the moved functions, each now `export function ...`...

export const SEASON_EDITABLE = {
  draft: ['name', 'number', 'participantIds', 'legs', 'points', 'startDate', 'qualificationSpots'],
  active: ['name', 'points', 'startDate', 'qualificationSpots'],
  completed: ['name', 'qualificationSpots'],
}

export function normalizeQualificationSpots(value, participantCount) {
  const max = Math.max(1, participantCount - 1)
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`Qualification spots must be an integer from 1 to ${max}`)
  }
  return value
}

export function seasonPatch(season, patch) {
  const editable = SEASON_EDITABLE[season.status] ?? []
  const blocked = Object.keys(patch).filter((key) => patch[key] != null && !editable.includes(key))
  if (blocked.length) {
    throw new Error(`Can't change ${blocked.join(', ')} on a ${season.status} season`)
  }
  const next = {}
  if (patch.name != null) next.name = requiredText(patch.name, 60, 'Season name')
  if (patch.number != null) {
    assertSeasonNumber(patch.number)
    next.number = patch.number
  }
  if (patch.participantIds != null) next.participantIds = assertParticipantsList(patch.participantIds)
  if (patch.legs != null) {
    assertLegs(patch.legs)
    next.legs = patch.legs
  }
  if (patch.points != null) next.points = normalizePoints(patch.points)
  if (patch.startDate != null) {
    const startDate = toTimestamp(patch.startDate)
    if (startDate == null) throw new Error('Start date is required')
    assertReasonable(startDate, 'Start date')
    next.startDate = startDate
  }
  if (patch.qualificationSpots != null) {
    const count = (next.participantIds ?? season.participantIds ?? []).length
    next.qualificationSpots = normalizeQualificationSpots(patch.qualificationSpots, count)
  }
  if (Object.keys(next).length === 0) throw new Error('Nothing to update')
  return next
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx vitest run src/data/validate.test.js`
Expected: PASS

- [ ] **Step 5: Rewire `writes.js`**

At the top of `src/data/writes.js`:
- Remove `Timestamp` from the `firebase/firestore` import if nothing else in the file uses it. Check with `grep -n Timestamp src/data/writes.js`.
- Add:

```js
import {
  assertLegs,
  assertParticipantsList,
  assertReasonable,
  assertSeasonNumber,
  normalizePoints,
  normalizeQualificationSpots,
  requiredText,
  seasonPatch,
  toTimestamp,
} from './validate.js'
```

In `createSeason`:
- Compute `const participantIds = assertParticipantsList(input.participantIds)` before `addDoc`.
- Pass these into `seasonDoc({...})`:

```js
    participantIds,
    qualificationSpots: normalizeQualificationSpots(input.qualificationSpots ?? 1, participantIds.length),
```

Replace `updateSeason` with:

```js
export async function updateSeason(leagueId, seasonId, patch) {
  const season = await requireSeason(leagueId, seasonId)
  await updateDoc(seasonRef(leagueId, seasonId), {
    ...seasonPatch(season, patch),
    updatedAt: serverTimestamp(),
  })
}
```

Replace `deleteDraftSeason` with:

```js
export async function deleteSeason(leagueId, seasonId) {
  const seasonSnap = await getDoc(seasonRef(leagueId, seasonId))
  if (!seasonSnap.exists()) return
  const status = seasonSnap.data().status
  if (status !== 'draft' && status !== 'active') throw new Error('A completed season cannot be deleted')
  const league = leagueRef(leagueId)
  const leagueSnap = await getDoc(league)
  const isCurrent = leagueSnap.data()?.activeSeasonId === seasonId
  const matches = await getDocs(collection(db, 'leagues', leagueId, 'seasons', seasonId, 'matches'))

  if (status === 'active') {
    // Rules only allow this as one batch: matches, season, and the league pointer together.
    if (matches.size > 498) throw new Error('Too many matches to delete in one go')
    const batch = writeBatch(db)
    matches.docs.forEach((match) => batch.delete(match.ref))
    batch.delete(seasonRef(leagueId, seasonId))
    if (isCurrent) batch.update(league, { activeSeasonId: null, updatedAt: serverTimestamp() })
    await batch.commit()
    return
  }

  if (isCurrent) {
    await updateDoc(league, {
      activeSeasonId: null,
      updatedAt: serverTimestamp(),
    })
  }
  await commitInBatches([
    ...matches.docs.map((match) => (batch) => batch.delete(match.ref)),
    (batch) => batch.delete(seasonRef(leagueId, seasonId)),
  ])
}
```

In `src/data/index.js`:
- Replace `deleteDraftSeason,` with `deleteSeason,`.
- Add the line `export { SEASON_EDITABLE } from './validate.js'`.

- [ ] **Step 6: Point the one caller at the new name**

In `src/pages/admin/SeasonAdmin.jsx`:
- Change the import `deleteDraftSeason` to `deleteSeason`.
- In `DraftPanel.onDelete`, call `deleteSeason(league.id, season.id)`.

- [ ] **Step 7: Run everything**

Run: `npm test && npm run lint && npm run build`
Expected: PASS. `grep -rn deleteDraftSeason src` prints nothing.

- [ ] **Step 8: Commit**

```bash
git add src/data/validate.js src/data/validate.test.js src/data/writes.js src/data/index.js src/pages/admin/SeasonAdmin.jsx
git commit -m "feat(data): status-aware season edits, qualification spots, active season delete"
```

---

### Task 6: Admin UI (create spots, edit sheet, active delete, completed table)

**Files:**
- Modify: `src/pages/admin/AdminParts.jsx:50-63` (`ConfirmSheet`)
- Modify: `src/pages/admin/SeasonsAdmin.jsx` (`CreateSeasonForm`)
- Modify: `src/pages/admin/SeasonAdmin.jsx` (imports, `SeasonSummary`, `DraftPanel` copy, `ActivePanel`, `CompletedPanel`, default export)

**Interfaces:**
- Consumes: `updateSeason` and `deleteSeason` (Task 5); `SEASON_EDITABLE` from `../../data/index.js` (Task 5); `qualificationSpotsOf` and `tableZones` from `../../engine/index.js` (Task 3); `seasonStandings` from `../../hooks/index.js` (Task 2).
- Produces: the `ConfirmSheet` prop `confirmDisabled?: boolean`.

There are no component tests in this repo for admin pages. Verify these steps manually in Step 7.

- [ ] **Step 1: Add `confirmDisabled` to `ConfirmSheet`**

In `src/pages/admin/AdminParts.jsx`, add `confirmDisabled = false` to the props of `ConfirmSheet`. Change the confirm button to `disabled={busy || confirmDisabled}`.

- [ ] **Step 2: Qualification spots on the create form**

In `src/pages/admin/SeasonsAdmin.jsx`, inside `CreateSeasonForm`:
- Add the state `const [spots, setSpots] = useState('1')`.
- Add `const maxSpots = Math.max(1, participantIds.length - 1)` below the state declarations.
- In `onSubmit`, add `qualificationSpots: parseIntIn(spots, 1, maxSpots, 'Qualification spots'),` to `input`.
- After the Points `<div className='field'>...</div>`, render:

```jsx
      <Field label='Qualification spots' hint={`Top 1–${maxSpots} highlighted, counting 1st place`}>
        <Input value={spots} inputMode='numeric' onChange={(event) => setSpots(event.target.value)} />
      </Field>
```

- [ ] **Step 3: Add the edit sheet in `SeasonAdmin.jsx`**

Update the imports:
- From `../../data/index.js`: remove nothing (Task 5 already swapped `deleteSeason`) and add `SEASON_EDITABLE` and `updateSeason`.
- From `../../engine/index.js`: add `qualificationSpotsOf` and `tableZones`.
- Add `import { seasonStandings } from '../../hooks/index.js'`.
- From `./format.js`: add `fromDateInput` and `toDateInput`.

Add this component above `SeasonSummary`:

```jsx
function EditSeasonForm({ league, season, onDone, onError }) {
  const fields = SEASON_EDITABLE[season.status] ?? []
  const maxSpots = Math.max(1, (season.participantIds ?? []).length - 1)
  const [name, setName] = useState(season.name ?? '')
  const [startDate, setStartDate] = useState(() => toDateInput(season.startDate))
  const [points, setPoints] = useState(() => ({
    win: String(season.points?.win ?? 3),
    draw: String(season.points?.draw ?? 1),
    loss: String(season.points?.loss ?? 0),
  }))
  const [spots, setSpots] = useState(() => String(qualificationSpotsOf(season)))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const setPoint = (key) => (event) => setPoints((prev) => ({ ...prev, [key]: event.target.value }))

  const onSubmit = async (event) => {
    event.preventDefault()
    setError('')
    let patch
    try {
      patch = { name, qualificationSpots: parseIntIn(spots, 1, maxSpots, 'Qualification spots') }
      if (fields.includes('startDate')) {
        const start = fromDateInput(startDate)
        if (!start) throw new Error('Start date is required')
        patch.startDate = start
      }
      if (fields.includes('points')) {
        patch.points = {
          win: parseIntIn(points.win, 0, 20, 'Win points'),
          draw: parseIntIn(points.draw, 0, 20, 'Draw points'),
          loss: parseIntIn(points.loss, 0, 20, 'Loss points'),
        }
      }
    } catch (invalid) {
      setError(invalid.message)
      return
    }
    setBusy(true)
    try {
      await updateSeason(league.id, season.id, patch)
      onDone('Season updated')
    } catch (failure) {
      setBusy(false)
      onError(failure)
    }
  }

  return (
    <form className='admin-stack admin-stack--loose' onSubmit={onSubmit} noValidate>
      <Field label='Name'>
        <Input value={name} maxLength={60} required onChange={(event) => setName(event.target.value)} />
      </Field>
      {fields.includes('startDate') ? (
        <Field label='Start date'>
          <Input type='date' value={startDate} required onChange={(event) => setStartDate(event.target.value)} />
        </Field>
      ) : null}
      {fields.includes('points') ? (
        <div className='field'>
          <span className='field__label'>Points</span>
          <div className='admin-grid-3'>
            <Field label='Win'>
              <Input value={points.win} inputMode='numeric' onChange={setPoint('win')} />
            </Field>
            <Field label='Draw'>
              <Input value={points.draw} inputMode='numeric' onChange={setPoint('draw')} />
            </Field>
            <Field label='Loss'>
              <Input value={points.loss} inputMode='numeric' onChange={setPoint('loss')} />
            </Field>
          </div>
        </div>
      ) : null}
      <Field label='Qualification spots' hint={`Top 1–${maxSpots} highlighted, counting 1st place`}>
        <Input value={spots} inputMode='numeric' onChange={(event) => setSpots(event.target.value)} />
      </Field>
      {error ? <p className='admin-error' role='alert'>{error}</p> : null}
      <ClayButton type='submit' size='lg' disabled={busy}>
        {busy ? 'Saving…' : 'Save changes'}
      </ClayButton>
    </form>
  )
}
```

In `SeasonSummary`:
- Accept an `onEdit` prop.
- Under the Points line, add:

```jsx
        <p className='admin-muted'>Qualification spots: {qualificationSpotsOf(season)}</p>
```

- Inside the first `admin-row admin-row--between`, wrap the `Chip` together with a new button:

```jsx
          <span className='admin-row'>
            <Chip tone={STATUS_TONE[season.status]}>{STATUS_LABEL[season.status] ?? season.status}</Chip>
            {onEdit ? <ClayButton variant='soft' size='sm' onClick={onEdit}>Edit</ClayButton> : null}
          </span>
```

In the default export `SeasonAdmin`:
- Add `const [editing, setEditing] = useState(false)` and `const closeEdit = useCallback(() => setEditing(false), [])` at the top. They must sit **above** any early logic, next to the other hooks.
- Render the summary as:

```jsx
        <SeasonSummary
          season={season}
          playersById={playersById}
          onEdit={season.status === 'draft' ? null : () => setEditing(true)}
        />
```

- After the panels (still inside the fragment), add:

```jsx
        <Sheet open={editing} onClose={closeEdit} title='Edit season'>
          {editing ? (
            <EditSeasonForm
              league={league}
              season={season}
              onError={toast.fail}
              onDone={(message) => {
                setEditing(false)
                toast.show(message)
              }}
            />
          ) : null}
        </Sheet>
```

- [ ] **Step 4: Fix the Start-season copy**

In `DraftPanel`'s "Start season?" `ConfirmSheet`, change the message to:

```js
`${season.name} becomes the current season on Home. Participants and legs are locked once it starts.`
```

- [ ] **Step 5: Delete an active season, with typed-name confirmation**

In `ActivePanel`:
- Add `const navigate = useNavigate()` (`useNavigate` is already imported in this file).
- Add the state:

```js
  const [deleting, setDeleting] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [typed, setTyped] = useState('')
  const closeDelete = useCallback(() => {
    setDeleting(false)
    setTyped('')
  }, [])

  const onDelete = async () => {
    setDeleteBusy(true)
    try {
      await deleteSeason(league.id, season.id)
      toast.show(`${season.name} deleted`)
      navigate('/admin/seasons', { replace: true })
    } catch (error) {
      setDeleteBusy(false)
      toast.fail(error)
    }
  }
```

- In the last `<section className='admin-stack'>` (the one with "Complete season"), add after the Complete button:

```jsx
        <ClayButton variant='danger' disabled={busy || deleteBusy} onClick={() => setDeleting(true)}>
          Delete season
        </ClayButton>
```

- After the Complete `ConfirmSheet`, add:

```jsx
      <ConfirmSheet
        open={deleting}
        title='Delete season?'
        message={`${season.name}, its ${matches.length} matches and ${played} results will be deleted for good. Type the season name to confirm.`}
        confirmLabel='Delete season'
        danger
        busy={deleteBusy}
        confirmDisabled={typed.trim() !== season.name}
        onConfirm={onDelete}
        onClose={closeDelete}
      >
        <Field label='Season name'>
          <Input value={typed} autoComplete='off' placeholder={season.name} onChange={(event) => setTyped(event.target.value)} />
        </Field>
      </ConfirmSheet>
```

- [ ] **Step 6: The completed panel uses the live table and zones**

Change the `CompletedPanel` signature to `function CompletedPanel({ league, season, matches, players, playersById, toast })`. Replace `const rows = season.finalStandings ?? []` with:

```js
  const names = useMemo(() => Object.fromEntries(players.map((player) => [player.id, player.name ?? ''])), [players])
  const rows = useMemo(() => seasonStandings(season, matches, names), [season, matches, names])
```

Change its `StandingsTable` `zones` prop to `zones={tableZones(rows, season)}`.

- [ ] **Step 7: Verify by hand in the emulator**

Run: `npm run emulators` (terminal 1) and `npm run dev` (terminal 2). Sign in as the seeded admin. Check each of these:
1. Create a draft with 6 players and Qualification spots = 4. The create form rejects 6 ("from 1 to 5").
2. Start the season. Click Edit and change name, points (win 2), start date and spots (3), then save. The toast reads "Season updated" and the summary reflects every change.
3. The viewer `/table` shows #1 gold ("Title spot"), #2–#3 green ("Qualification zone") and #6 red. The Home/Away tabs show no zones.
4. Enter results for MD3, then MD1, then MD2 for one player. That player's Form column reads MD1 → MD2 → MD3 left to right, with no empty chips.
5. Delete the active season. The confirm button stays disabled until the exact name is typed. After deleting, you land on `/admin/seasons`, the season is gone and Home shows no active season.
6. On a completed season, Edit shows only Name and Qualification spots, there is no delete button, and the final table shows gold/green/red.
7. Sign out and open any match. There are no Enter/Edit result buttons.

- [ ] **Step 8: Lint, test, build**

Run: `npm run lint && npm test && npm run build`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add src/pages/admin/AdminParts.jsx src/pages/admin/SeasonsAdmin.jsx src/pages/admin/SeasonAdmin.jsx
git commit -m "feat(admin): qualification spots, edit active/completed seasons, delete active season"
```

---

### Task 7: Deploy rules before the app (the #1 check)

CI deploys **hosting only**. Once Task 4 lands, the new app writes `qualificationSpots` on season create, and the **old** live rules reject that field. The rules must go live **before** the hosting deploy that merging to `main` triggers. The new rules are backward-compatible with the old app.

- [ ] **Step 1: Ask the user before deploying**

Deploying is outward-facing. Ask: "Deploy `firestore.rules` to project `fc-league-26061` now?" Wait for a yes.

- [ ] **Step 2: Deploy the rules only**

Run: `npx firebase deploy --only firestore:rules --project fc-league-26061`
Expected: `✔  firestore: released rules firestore.rules to cloud.firestore`.

- [ ] **Step 3: Verify #1 on the live site**

Ask the user to:
- sign in on the deployed site with a **non-admin** account and confirm there are no Enter/Edit result buttons and `/admin` shows "Not an admin";
- confirm in the Firebase console that `admins/` holds only the intended uid(s).

- [ ] **Step 4: Merge and push to `main` (with user approval)**

The hosting deploy runs from CI.

---

## Self-Review Notes

- **Spec coverage:**
  - Decision 1 → Task 7.
  - Decision 2 → Tasks 3, 4, 5 and 6.
  - Decision 3 → Task 3.
  - Decision 4 → Tasks 1 and 2.
  - Decisions 5 and 6 → Tasks 4, 5 and 6.
  - Decision 7 → Task 5 Step 6 and Task 6 (`onEdit` is null for drafts).
- **Not done, by agreement:** draft seasons get no edit UI, and the 0-results form still shows the single "–" "No results yet" chip. That chip is not a padding slot.
