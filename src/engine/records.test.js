import { describe, expect, it } from 'vitest'
import { currentMatchday, headToHead, playerCareer, seasonLeaders } from './index.js'

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

describe('headToHead', () => {
  const matches = [
    match({
      id: 'first',
      homeId: 'a',
      awayId: 'b',
      homeGoals: 2,
      awayGoals: 0,
      playedAt: 3000,
    }),
    match({
      id: 'second',
      homeId: 'b',
      awayId: 'a',
      homeGoals: 1,
      awayGoals: 1,
      playedAt: { toDate: () => new Date(1000) },
    }),
    match({
      id: 'third',
      homeId: 'a',
      awayId: 'b',
      homeGoals: 0,
      awayGoals: 3,
      status: 'postponed',
      scheduledAt: new Date(2000),
    }),
    match({
      id: 'other',
      homeId: 'a',
      awayId: 'c',
      homeGoals: 5,
      awayGoals: 0,
      playedAt: 4000,
    }),
  ]

  it('counts wins, draws, losses, and goals from each side and lists every meeting', () => {
    const fromA = headToHead(matches, 'a', 'b')
    expect(fromA).toMatchObject({
      winsA: 1,
      winsB: 0,
      draws: 1,
      goalsA: 3,
      goalsB: 1,
    })
    expect(fromA.matches.map((entry) => entry.id)).toEqual(['second', 'third', 'first'])

    const fromB = headToHead(matches, 'b', 'a')
    expect(fromB).toMatchObject({
      winsA: 0,
      winsB: 1,
      draws: 1,
      goalsA: 1,
      goalsB: 3,
    })
    expect(fromB.matches.map((entry) => entry.id)).toEqual(['second', 'third', 'first'])
  })

  it('is empty when the two ids are the same or have never been paired', () => {
    expect(headToHead(matches, 'a', 'a')).toEqual({
      winsA: 0,
      winsB: 0,
      draws: 0,
      goalsA: 0,
      goalsB: 0,
      matches: [],
    })
    expect(headToHead(matches, 'b', 'z').matches).toEqual([])
  })
})

describe('playerCareer', () => {
  const seasons = [
    {
      id: 's1',
      name: 'Season 1',
      number: 1,
      status: 'completed',
      championId: 'a',
      participantIds: ['a', 'b', 'c'],
      points: { win: 3, draw: 1, loss: 0 },
      finalStandings: [
        { playerId: 'c', position: 1 },
        { playerId: 'a', position: 2 },
        { playerId: 'b', position: 3 },
      ],
    },
    {
      id: 's2',
      name: 'Season 2',
      number: 2,
      status: 'active',
      championId: null,
      participantIds: ['a', 'b'],
      points: { win: 2, draw: 1, loss: 0 },
      finalStandings: null,
    },
    {
      id: 's3',
      name: 'Season 3',
      number: 3,
      status: 'draft',
      championId: 'b',
      participantIds: ['b', 'c'],
      points: { win: 3, draw: 1, loss: 0 },
      finalStandings: null,
    },
  ]

  const matches = [
    match({ id: 's1-win', seasonId: 's1', homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 0, playedAt: 1000 }),
    match({ id: 's2-w1', seasonId: 's2', homeId: 'a', awayId: 'b', homeGoals: 4, awayGoals: 1, playedAt: 2000 }),
    match({ id: 's2-void', seasonId: 's2', homeId: 'a', awayId: 'b', homeGoals: 8, awayGoals: 0, status: 'void', playedAt: 2500 }),
    match({ id: 's2-w2', seasonId: 's2', homeId: 'a', awayId: 'b', homeGoals: 2, awayGoals: 0, playedAt: 3000 }),
    match({ id: 's2-d', seasonId: 's2', homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 1, playedAt: 4000 }),
    match({ id: 's2-w3', seasonId: 's2', homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 0, playedAt: 5000 }),
    match({ id: 's2-l', seasonId: 's2', homeId: 'a', awayId: 'b', homeGoals: 0, awayGoals: 2, playedAt: 6000 }),
    match({ id: 's2-big', seasonId: 's2', homeId: 'b', awayId: 'a', homeGoals: 0, awayGoals: 6, playedAt: 7000 }),
    match({ id: 's2-w4', seasonId: 's2', homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 0, playedAt: 8000 }),
    match({ id: 's2-w5', seasonId: 's2', homeId: 'a', awayId: 'b', homeGoals: 2, awayGoals: 0, playedAt: 9000 }),
  ]

  it('totals a career, keeps the snapshot finish, and records streaks and the biggest win', () => {
    const career = playerCareer(matches, seasons, 'a')

    expect(career).toMatchObject({
      playerId: 'a',
      seasonsPlayed: 2,
      titles: 1,
      played: 9,
      won: 7,
      drawn: 1,
      lost: 1,
      goalsFor: 18,
      goalsAgainst: 4,
      goalDiff: 14,
      points: 16,
      winPct: 77.8,
      biggestWin: {
        matchId: 's2-big',
        seasonId: 's2',
        matchday: 1,
        opponentId: 'b',
        goalsFor: 6,
        goalsAgainst: 0,
        margin: 6,
      },
      longestWinStreak: 3,
      longestUnbeatenStreak: 5,
    })
    expect(career.finishes).toEqual([
      {
        seasonId: 's1',
        name: 'Season 1',
        number: 1,
        status: 'completed',
        position: 2,
        played: 1,
        won: 1,
        drawn: 0,
        lost: 0,
        goalsFor: 1,
        goalsAgainst: 0,
        goalDiff: 1,
        points: 3,
        title: true,
      },
      {
        seasonId: 's2',
        name: 'Season 2',
        number: 2,
        status: 'active',
        position: 1,
        played: 8,
        won: 6,
        drawn: 1,
        lost: 1,
        goalsFor: 17,
        goalsAgainst: 4,
        goalDiff: 13,
        points: 13,
        title: false,
      },
    ])
  })

  it('sorts finishes by season number even when the season list is reversed', () => {
    const career = playerCareer([
      match({ seasonId: 'later', homeId: 'a', awayId: 'b', homeGoals: 0, awayGoals: 0 }),
    ], [
      {
        id: 'later',
        name: 'Later',
        number: 2,
        status: 'active',
        championId: null,
        participantIds: ['a', 'b'],
        points: { win: 3, draw: 1, loss: 0 },
        finalStandings: null,
      },
      {
        id: 'earlier',
        name: 'Earlier',
        number: 1,
        status: 'draft',
        championId: null,
        participantIds: ['b', 'a'],
        points: { win: 3, draw: 1, loss: 0 },
        finalStandings: null,
      },
    ], 'b', { a: 'Zoe', b: 'Amy' })

    expect(career.finishes.map((finish) => finish.seasonId)).toEqual(['earlier', 'later'])
    expect(career.seasonsPlayed).toBe(2)
    expect(career.finishes[0].position).toBe(1)
    expect(career.finishes[1]).toMatchObject({ position: 1, points: 1, title: false })
  })

  it('places a tied live season by name and orders undated seasons by number for streaks', () => {
    const career = playerCareer(
      [match({ id: 'draw', seasonId: 's', homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 1 })],
      [{
        id: 's',
        name: 'Only',
        number: 1,
        status: 'active',
        championId: null,
        participantIds: ['a', 'b'],
        points: { win: 3, draw: 1, loss: 0 },
        finalStandings: null,
      }],
      'a',
      { a: 'Zoe', b: 'Amy' },
    )
    expect(career.finishes[0].position).toBe(2)

    const undated = playerCareer(
      [
        match({ id: 's2w', seasonId: 's2', matchday: 1, homeId: 'a', awayId: 'b', homeGoals: 1, awayGoals: 0 }),
        match({ id: 's1w', seasonId: 's1', matchday: 1, homeId: 'a', awayId: 'b', homeGoals: 3, awayGoals: 0 }),
        match({ id: 's1l', seasonId: 's1', matchday: 2, homeId: 'a', awayId: 'b', homeGoals: 0, awayGoals: 1 }),
      ],
      [
        { id: 's2', name: 'Two', number: 2, status: 'completed', championId: 'a', participantIds: ['a', 'b'], points: { win: 3, draw: 1, loss: 0 }, finalStandings: [{ playerId: 'a', position: 1 }] },
        { id: 's1', name: 'One', number: 1, status: 'completed', championId: null, participantIds: ['a', 'b'], points: { win: 3, draw: 1, loss: 0 }, finalStandings: [{ playerId: 'a', position: 1 }] },
      ],
      'a',
    )
    expect(undated.titles).toBe(1)
    expect(undated.longestWinStreak).toBe(1)
    expect(undated.biggestWin.matchId).toBe('s1w')
  })

  it('prefers a wider margin, then more goals, then the earlier win', () => {
    const career = playerCareer([
      match({ id: 'later-same', homeId: 'a', awayId: 'c', homeGoals: 5, awayGoals: 1, playedAt: 3000 }),
      match({ id: 'earlier-same', homeId: 'a', awayId: 'b', homeGoals: 5, awayGoals: 1, playedAt: 1000 }),
      match({ id: 'more-goals', homeId: 'a', awayId: 'd', homeGoals: 4, awayGoals: 1, playedAt: 2000 }),
      match({ id: 'bigger-margin-fewer-goals', homeId: 'a', awayId: 'e', homeGoals: 3, awayGoals: 0, playedAt: 4000 }),
      match({ id: 'loss', homeId: 'b', awayId: 'a', homeGoals: 9, awayGoals: 0, playedAt: 5000 }),
    ], [], 'a')

    expect(career.biggestWin).toMatchObject({ matchId: 'earlier-same', margin: 4, goalsFor: 5 })
    expect(career.longestWinStreak).toBe(4)
    expect(career.longestUnbeatenStreak).toBe(4)
  })

  it('returns a zero career when the player has no matches', () => {
    expect(playerCareer([], [], 'a')).toEqual({
      playerId: 'a',
      seasonsPlayed: 0,
      titles: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
      winPct: 0,
      finishes: [],
      biggestWin: null,
      longestWinStreak: 0,
      longestUnbeatenStreak: 0,
    })
  })

  it('counts an unbeaten run of draws and still includes a season with no matches', () => {
    const career = playerCareer([
      match({ id: 'd1', seasonId: 's', homeId: 'a', awayId: 'b', homeGoals: 0, awayGoals: 0, playedAt: 1 }),
      match({ id: 'd2', seasonId: 's', homeId: 'b', awayId: 'a', homeGoals: 1, awayGoals: 1, playedAt: 2 }),
      match({ id: 'd3', seasonId: 's', homeId: 'a', awayId: 'b', homeGoals: 2, awayGoals: 2, playedAt: 3 }),
    ], [
      {
        id: 'empty',
        name: 'Empty',
        number: 1,
        status: 'draft',
        championId: null,
        participantIds: ['a', 'b'],
        points: { win: 3, draw: 1, loss: 0 },
        finalStandings: null,
      },
      {
        id: 's',
        name: 'Draws',
        number: 2,
        status: 'active',
        championId: 'a',
        participantIds: ['a', 'b'],
        points: { win: 3, draw: 1, loss: 0 },
        finalStandings: null,
      },
    ], 'a')

    expect(career.seasonsPlayed).toBe(2)
    expect(career.titles).toBe(1)
    expect(career.longestWinStreak).toBe(0)
    expect(career.longestUnbeatenStreak).toBe(3)
    expect(career.winPct).toBe(0)
    expect(career.biggestWin).toBeNull()
    expect(career.finishes[0]).toMatchObject({ seasonId: 'empty', position: 1, played: 0, points: 0, title: false })
  })
})

describe('seasonLeaders', () => {
  const standings = [
    { playerId: 'a', played: 4, won: 2, goalsFor: 9, goalsAgainst: 8 },
    { playerId: 'b', played: 4, won: 2, goalsFor: 4, goalsAgainst: 1 },
    { playerId: 'c', played: 4, won: 3, goalsFor: 9, goalsAgainst: 3 },
    { playerId: 'd', played: 0, won: 0, goalsFor: 0, goalsAgainst: 0 },
  ]

  it('returns every player tied for a stat, and every match tied for the biggest win', () => {
    const leaders = seasonLeaders([
      match({ id: 'a-win', homeId: 'a', awayId: 'd', homeGoals: 4, awayGoals: 0 }),
      match({ id: 'c-win', homeId: 'b', awayId: 'c', homeGoals: 0, awayGoals: 4 }),
      match({ id: 'smaller', homeId: 'c', awayId: 'a', homeGoals: 3, awayGoals: 0 }),
      match({ id: 'draw', homeId: 'a', awayId: 'b', homeGoals: 4, awayGoals: 4 }),
      match({ id: 'void', homeId: 'a', awayId: 'b', homeGoals: 9, awayGoals: 0, status: 'void' }),
      match({ id: 'scheduled', homeId: 'c', awayId: 'd', homeGoals: 8, awayGoals: 0, status: 'scheduled' }),
    ], standings)

    expect(leaders.mostGoals).toEqual([
      { playerId: 'a', goalsFor: 9 },
      { playerId: 'c', goalsFor: 9 },
    ])
    expect(leaders.bestDefence).toEqual([{ playerId: 'b', goalsAgainst: 1 }])
    expect(leaders.mostWins).toEqual([{ playerId: 'c', won: 3 }])
    expect(leaders.biggestWin).toEqual([
      {
        matchId: 'a-win',
        seasonId: 's1',
        matchday: 1,
        playerId: 'a',
        opponentId: 'd',
        goalsFor: 4,
        goalsAgainst: 0,
        margin: 4,
      },
      {
        matchId: 'c-win',
        seasonId: 's1',
        matchday: 1,
        playerId: 'c',
        opponentId: 'b',
        goalsFor: 4,
        goalsAgainst: 0,
        margin: 4,
      },
    ])
  })

  it('is empty when nobody has played and there is no winning match', () => {
    expect(seasonLeaders([
      match({ status: 'scheduled', homeGoals: 5, awayGoals: 0 }),
      match({ homeGoals: 1, awayGoals: 1 }),
    ], [{ playerId: 'a', played: 0, won: 0, goalsFor: 0, goalsAgainst: 0 }])).toEqual({
      mostGoals: [],
      bestDefence: [],
      mostWins: [],
      biggestWin: [],
    })
  })
})

describe('currentMatchday', () => {
  it('returns null when there are no matchdays', () => {
    expect(currentMatchday([], 1_000)).toBeNull()
    expect(currentMatchday(null, 1_000)).toBeNull()
  })

  it('focuses the first matchday when nothing has started', () => {
    const matches = [
      match({ matchday: 4, status: 'scheduled', scheduledAt: 5_000, homeGoals: null, awayGoals: null }),
      match({ matchday: 2, status: 'scheduled', scheduledAt: 4_000, homeGoals: null, awayGoals: null }),
    ]
    expect(currentMatchday(matches, 1_000)).toBe(2)
  })

  it('moves to the next matchday once the latest started one is complete', () => {
    const matches = [
      match({ matchday: 1, status: 'played', playedAt: 1_000, homeGoals: 1, awayGoals: 0 }),
      match({ matchday: 1, status: 'void', playedAt: 1_100, homeGoals: null, awayGoals: null }),
      match({ matchday: 5, status: 'scheduled', scheduledAt: 9_000, homeGoals: null, awayGoals: null }),
    ]
    expect(currentMatchday(matches, 5_000)).toBe(5)
  })

  it('stays on an unfinished matchday that has already kicked off', () => {
    const matches = [
      match({ id: 'done', matchday: 1, status: 'played', playedAt: 1_000, homeGoals: 1, awayGoals: 0 }),
      match({ id: 'due', matchday: 2, status: 'scheduled', scheduledAt: 2_000, homeGoals: null, awayGoals: null }),
      match({ id: 'later', matchday: 2, status: 'scheduled', scheduledAt: 4_000, homeGoals: null, awayGoals: null }),
      match({ id: 'future', matchday: 3, status: 'scheduled', scheduledAt: 8_000, homeGoals: null, awayGoals: null }),
    ]
    expect(currentMatchday(matches, new Date(3_000))).toBe(2)
    expect(currentMatchday(matches, { toDate: () => new Date(2_000) })).toBe(2)
    expect(currentMatchday(matches, 8_000)).toBe(3)
  })

  it('keeps a postponed matchday that is already due', () => {
    const matches = [
      match({ matchday: 1, status: 'postponed', scheduledAt: 1_000, homeGoals: null, awayGoals: null }),
      match({ matchday: 2, status: 'scheduled', scheduledAt: 5_000, homeGoals: null, awayGoals: null }),
    ]
    expect(currentMatchday(matches, 3_000)).toBe(1)
  })

  it('treats an all-void matchday as finished and an undated season as the first round', () => {
    expect(currentMatchday([
      match({ matchday: 1, status: 'void', homeGoals: null, awayGoals: null }),
      match({ matchday: 2, status: 'scheduled', scheduledAt: 9_000, homeGoals: null, awayGoals: null }),
    ], 5_000)).toBe(2)

    expect(currentMatchday([
      match({ matchday: 3, status: 'scheduled', homeGoals: null, awayGoals: null }),
      match({ matchday: 1, status: 'scheduled', homeGoals: null, awayGoals: null }),
    ], 5_000)).toBe(1)
  })

  it('returns the last matchday when the season is finished', () => {
    expect(currentMatchday([
      match({ matchday: 1, playedAt: 1_000 }),
      match({ matchday: 2, playedAt: 2_000 }),
    ], 9_000)).toBe(2)
  })

  it('uses Date.now when now is omitted', () => {
    const matches = [
      match({ matchday: 1, status: 'played', playedAt: new Date('2020-01-01'), homeGoals: 1, awayGoals: 0 }),
      match({ matchday: 2, status: 'scheduled', scheduledAt: new Date('2030-01-01'), homeGoals: null, awayGoals: null }),
    ]
    expect(currentMatchday(matches)).toBe(2)
  })
})
