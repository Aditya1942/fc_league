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
