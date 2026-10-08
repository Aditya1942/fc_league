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
