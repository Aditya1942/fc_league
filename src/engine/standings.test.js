import { describe, expect, it } from 'vitest'
import { allTimeTable, computeForm, computeStandings, seasonOrderOf } from './index.js'

function match(overrides) {
  return {
    id: 'm',
    seasonId: 's1',
    matchday: 1,
    homeId: 'a',
    awayId: 'b',
    status: 'played',
    homeGoals: 0,
    awayGoals: 0,
    scheduledAt: null,
    playedAt: null,
    ...overrides,
  }
}

function row(table, playerId) {
  return table.find((entry) => entry.playerId === playerId)
}

describe('computeStandings', () => {
  const participants = ['a', 'b', 'c', 'd']

  it('scores only played matches and ignores every other status', () => {
    const table = computeStandings([
      match({ id: '1', homeId: 'a', awayId: 'b', homeGoals: 2, awayGoals: 0, playedAt: 1000 }),
      match({ id: '2', homeId: 'a', awayId: 'c', homeGoals: 1, awayGoals: 1, playedAt: 2000 }),
      match({ id: '3', homeId: 'b', awayId: 'c', homeGoals: 0, awayGoals: 1, playedAt: 3000 }),
      match({ id: '4', homeId: 'a', awayId: 'b', homeGoals: 9, awayGoals: 0, status: 'scheduled' }),
      match({ id: '5', homeId: 'b', awayId: 'c', homeGoals: 9, awayGoals: 0, status: 'postponed' }),
      match({ id: '6', homeId: 'a', awayId: 'c', homeGoals: 9, awayGoals: 0, status: 'void' }),
      match({ id: '7', homeId: 'd', awayId: 'a', homeGoals: null, awayGoals: null, status: 'played' }),
    ], participants)

    expect(row(table, 'a')).toMatchObject({
      playerId: 'a',
      position: 1,
      played: 2,
      won: 1,
      drawn: 1,
      lost: 0,
      goalsFor: 3,
      goalsAgainst: 1,
      goalDiff: 2,
      points: 4,
      form: ['W', 'D'],
    })
    expect(row(table, 'c')).toMatchObject({
      position: 2,
      played: 2,
      won: 1,
      drawn: 1,
      lost: 0,
      goalsFor: 2,
      goalsAgainst: 1,
      goalDiff: 1,
      points: 4,
    })
    expect(row(table, 'd')).toMatchObject({
      position: 3,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
      form: [],
    })
    expect(row(table, 'b')).toMatchObject({
      position: 4,
      played: 2,
      won: 0,
      drawn: 0,
      lost: 2,
      goalsFor: 0,
      goalsAgainst: 3,
      goalDiff: -3,
      points: 0,
      form: ['L', 'L'],
    })
    expect(table.map((entry) => entry.position)).toEqual([1, 2, 3, 4])
  })

  it('ranks by points before goal difference', () => {
    const table = computeStandings([
      match({ homeId: 'b', awayId: 'd', homeGoals: 1, awayGoals: 0 }),
      match({ homeId: 'c', awayId: 'b', homeGoals: 3, awayGoals: 0 }),
      match({ homeId: 'a', awayId: 'd', homeGoals: 1, awayGoals: 1 }),
    ], ['a', 'b', 'c', 'd'])

    expect(table.map((entry) => entry.playerId)).toEqual(['c', 'b', 'a', 'd'])
    expect(row(table, 'b')).toMatchObject({ points: 3, goalDiff: -2 })
    expect(row(table, 'a')).toMatchObject({ points: 1, goalDiff: 0 })
  })

  it('ranks goal difference above goals for', () => {
    const table = computeStandings([
      match({ homeId: 'a', awayId: 'b', homeGoals: 2, awayGoals: 0 }),
      match({ homeId: 'c', awayId: 'd', homeGoals: 3, awayGoals: 2 }),
    ], participants)

    expect(table.map((entry) => entry.playerId).slice(0, 2)).toEqual(['a', 'c'])
    expect(row(table, 'a')).toMatchObject({ points: 3, goalDiff: 2, goalsFor: 2 })
    expect(row(table, 'c')).toMatchObject({ points: 3, goalDiff: 1, goalsFor: 3 })
  })

  it('ranks goals for above head-to-head', () => {
    const table = computeStandings([
      match({ homeId: 'b', awayId: 'a', homeGoals: 1, awayGoals: 0 }),
      match({ homeId: 'a', awayId: 'c', homeGoals: 2, awayGoals: 0 }),
    ], ['a', 'b', 'c'], { names: { a: 'Zara', b: 'Aaron', c: 'Cain' } })

    expect(table.map((entry) => entry.playerId)).toEqual(['a', 'b', 'c'])
    expect(row(table, 'a')).toMatchObject({ points: 3, goalDiff: 1, goalsFor: 2 })
    expect(row(table, 'b')).toMatchObject({ points: 3, goalDiff: 1, goalsFor: 1 })
  })

  it('splits a tie on head-to-head points inside the tied group, then name', () => {
    const matches = [
      match({ id: 'ab', homeId: 'a', awayId: 'b', homeGoals: 2, awayGoals: 1 }),
      match({ id: 'ac', homeId: 'a', awayId: 'c', homeGoals: 1, awayGoals: 1 }),
      match({ id: 'bc', homeId: 'b', awayId: 'c', homeGoals: 1, awayGoals: 0 }),
      match({ id: 'da', homeId: 'd', awayId: 'a', homeGoals: 1, awayGoals: 0 }),
      match({ id: 'be', homeId: 'b', awayId: 'e', homeGoals: 1, awayGoals: 1 }),
      match({ id: 'cf', homeId: 'c', awayId: 'f', homeGoals: 2, awayGoals: 1 }),
    ]
    const names = {
      a: 'Zara',
      b: 'Brian',
      c: 'Aaron',
      d: 'Delta',
      e: 'Echo',
      f: 'Fox',
    }
    const table = computeStandings(matches, ['a', 'b', 'c', 'd', 'e', 'f'], { names })

    expect(table.map((entry) => entry.playerId)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
    for (const id of ['a', 'b', 'c']) {
      expect(row(table, id)).toMatchObject({ points: 4, goalDiff: 0, goalsFor: 3 })
    }
  })

  it('breaks a fully level head-to-head by name, then by id', () => {
    const drawn = [
      match({ homeId: 'a', awayId: 'b', homeGoals: 2, awayGoals: 2 }),
    ]
    const byName = computeStandings(drawn, ['a', 'b'], {
      names: { a: 'Zoe', b: 'Amy' },
    })
    expect(byName.map((entry) => entry.playerId)).toEqual(['b', 'a'])

    const byId = computeStandings(drawn, ['m', 'k'])
    expect(byId.map((entry) => entry.playerId)).toEqual(['k', 'm'])
  })

  it('applies custom points rules', () => {
    const table = computeStandings([
      match({ homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 0 }),
      match({ homeId: 'c', awayId: 'a', homeGoals: 1, awayGoals: 1 }),
      match({ homeId: 'b', awayId: 'c', homeGoals: 0, awayGoals: 2 }),
    ], ['a', 'b', 'c'], { pointsWin: 5, pointsDraw: 2, pointsLoss: -1 })

    expect(row(table, 'a')).toMatchObject({ points: 7 })
    expect(row(table, 'c')).toMatchObject({ points: 7 })
    expect(row(table, 'b')).toMatchObject({ points: -2 })
  })

  it('builds home-only and away-only tables, including form', () => {
    const matches = [
      match({
        id: '1',
        homeId: 'a',
        awayId: 'b',
        homeGoals: 3,
        awayGoals: 1,
        playedAt: 1000,
      }),
      match({
        id: '2',
        homeId: 'b',
        awayId: 'a',
        homeGoals: 2,
        awayGoals: 2,
        playedAt: 2000,
      }),
      match({
        id: '3',
        homeId: 'a',
        awayId: 'c',
        homeGoals: 0,
        awayGoals: 1,
        playedAt: 3000,
      }),
      match({
        id: '4',
        homeId: 'c',
        awayId: 'a',
        homeGoals: 4,
        awayGoals: 0,
        status: 'scheduled',
        playedAt: 4000,
      }),
    ]

    const home = computeStandings(matches, ['a', 'b', 'c'], { venue: 'home' })
    expect(row(home, 'a')).toMatchObject({
      played: 2,
      won: 1,
      drawn: 0,
      lost: 1,
      goalsFor: 3,
      goalsAgainst: 2,
      goalDiff: 1,
      points: 3,
      form: ['W', 'L'],
    })
    expect(row(home, 'b')).toMatchObject({
      played: 1,
      won: 0,
      drawn: 1,
      lost: 0,
      goalsFor: 2,
      goalsAgainst: 2,
      points: 1,
      form: ['D'],
    })
    expect(row(home, 'c')).toMatchObject({ played: 0, points: 0, form: [] })

    const away = computeStandings(matches, ['a', 'b', 'c'], { venue: 'away' })
    expect(row(away, 'a')).toMatchObject({
      played: 1,
      drawn: 1,
      goalsFor: 2,
      goalsAgainst: 2,
      points: 1,
      form: ['D'],
    })
    expect(row(away, 'b')).toMatchObject({
      played: 1,
      lost: 1,
      goalsFor: 1,
      goalsAgainst: 3,
      goalDiff: -2,
      points: 0,
      form: ['L'],
    })
    expect(row(away, 'c')).toMatchObject({
      played: 1,
      won: 1,
      goalsFor: 1,
      goalsAgainst: 0,
      points: 3,
      form: ['W'],
    })
    expect(away[0].playerId).toBe('c')
  })

  it('counts a result for a participant even when the opponent is outside the list', () => {
    const table = computeStandings([
      match({ homeId: 'a', awayId: 'z', homeGoals: 2, awayGoals: 2 }),
    ], ['a', 'b'])

    expect(table).toHaveLength(2)
    expect(row(table, 'a').points).toBe(1)
    expect(table.some((entry) => entry.playerId === 'z')).toBe(false)
  })
})

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

describe('allTimeTable', () => {
  it('aggregates played matches across seasons with the same tie-breaks', () => {
    const matches = [
      match({ seasonId: 's1', homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 0, playedAt: 1000 }),
      match({ seasonId: 's2', homeId: 'b', awayId: 'a', homeGoals: 1, awayGoals: 1, playedAt: 2000 }),
      match({ seasonId: 's2', homeId: 'c', awayId: 'a', homeGoals: 0, awayGoals: 0, status: 'scheduled' }),
    ]
    const table = allTimeTable(matches)

    expect(row(table, 'a')).toMatchObject({
      position: 1,
      played: 2,
      won: 1,
      drawn: 1,
      lost: 0,
      goalsFor: 2,
      goalsAgainst: 1,
      goalDiff: 1,
      points: 4,
      form: ['W', 'D'],
    })
    expect(row(table, 'b')).toMatchObject({
      position: 2,
      played: 2,
      won: 0,
      drawn: 1,
      lost: 1,
      points: 1,
    })
    expect(row(table, 'c')).toMatchObject({ position: 3, played: 0, points: 0 })
  })

  it('accepts custom points, venue, and a names map', () => {
    const matches = [
      match({ homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 1 }),
      match({ homeId: 'b', awayId: 'a', homeGoals: 0, awayGoals: 0 }),
    ]
    const table = allTimeTable(matches, {
      pointsWin: 4,
      pointsDraw: 2,
      pointsLoss: 0,
      names: { a: 'Zoe', b: 'Amy' },
    })

    expect(table.map((entry) => entry.playerId)).toEqual(['b', 'a'])
    expect(row(table, 'a').points).toBe(4)

    const home = allTimeTable(matches, { venue: 'home' })
    expect(row(home, 'a')).toMatchObject({ played: 1, drawn: 1, points: 1 })
    expect(row(home, 'b')).toMatchObject({ played: 1, drawn: 1, points: 1 })
  })
})
