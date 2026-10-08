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
