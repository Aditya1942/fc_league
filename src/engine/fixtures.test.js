import { describe, expect, it } from 'vitest'
import { generateFixtures } from './index.js'

function pairKey(a, b) {
  return JSON.stringify([a, b].sort())
}

function assertSchedule(fixtures, ids, legs) {
  const rounds = ids.length % 2 === 0 ? ids.length - 1 : ids.length
  const matchesPerDay = Math.floor(ids.length / 2)
  const games = (ids.length * (ids.length - 1)) / 2

  expect(fixtures).toHaveLength(games * legs)

  const days = [...new Set(fixtures.map((fixture) => fixture.matchday))].sort((a, b) => a - b)
  expect(days).toEqual(Array.from({ length: rounds * legs }, (_, index) => index + 1))

  for (const day of days) {
    const playing = new Set()
    const onDay = fixtures.filter((fixture) => fixture.matchday === day)
    expect(onDay).toHaveLength(matchesPerDay)
    for (const fixture of onDay) {
      expect(ids).toContain(fixture.homeId)
      expect(ids).toContain(fixture.awayId)
      expect(fixture.homeId).not.toBe(fixture.awayId)
      expect(playing.has(fixture.homeId)).toBe(false)
      expect(playing.has(fixture.awayId)).toBe(false)
      playing.add(fixture.homeId)
      playing.add(fixture.awayId)
    }
    if (ids.length % 2 === 1) expect(playing.size).toBe(ids.length - 1)
  }

  for (let leg = 0; leg < legs; leg++) {
    const start = leg * rounds + 1
    const end = start + rounds - 1
    const legFixtures = fixtures.filter((fixture) => fixture.matchday >= start && fixture.matchday <= end)
    const pairs = new Map()
    const home = new Map(ids.map((id) => [id, 0]))
    const away = new Map(ids.map((id) => [id, 0]))
    const byes = new Map(ids.map((id) => [id, 0]))

    for (const fixture of legFixtures) {
      const key = pairKey(fixture.homeId, fixture.awayId)
      pairs.set(key, (pairs.get(key) ?? 0) + 1)
      home.set(fixture.homeId, home.get(fixture.homeId) + 1)
      away.set(fixture.awayId, away.get(fixture.awayId) + 1)
    }

    expect(pairs.size).toBe(games)
    for (const count of pairs.values()) expect(count).toBe(1)

    for (const day of days.filter((day) => day >= start && day <= end)) {
      const playing = new Set(
        legFixtures
          .filter((fixture) => fixture.matchday === day)
          .flatMap((fixture) => [fixture.homeId, fixture.awayId]),
      )
      for (const id of ids) {
        if (!playing.has(id)) byes.set(id, byes.get(id) + 1)
      }
    }

    for (const id of ids) {
      expect(home.get(id) + away.get(id)).toBe(ids.length - 1)
      expect(Math.abs(home.get(id) - away.get(id))).toBeLessThanOrEqual(1)
      if (ids.length % 2 === 1) expect(byes.get(id)).toBe(1)
      else expect(byes.get(id)).toBe(0)
    }
  }

  if (legs === 2) {
    const first = fixtures.filter((fixture) => fixture.matchday <= rounds)
    const second = fixtures.filter((fixture) => fixture.matchday > rounds)
    expect(second).toHaveLength(first.length)
    for (const fixture of first) {
      const mirror = second.find((candidate) =>
        candidate.matchday === fixture.matchday + rounds
        && candidate.homeId === fixture.awayId
        && candidate.awayId === fixture.homeId
      )
      expect(mirror).toBeTruthy()
    }
    for (const id of ids) {
      const homes = fixtures.filter((fixture) => fixture.homeId === id).length
      const aways = fixtures.filter((fixture) => fixture.awayId === id).length
      expect(homes).toBe(ids.length - 1)
      expect(aways).toBe(ids.length - 1)
    }
  }
}

describe('generateFixtures', () => {
  it('returns an empty list when fewer than two participants are given', () => {
    expect(generateFixtures([])).toEqual([])
    expect(generateFixtures(['a'])).toEqual([])
    expect(generateFixtures()).toEqual([])
  })

  it('schedules a 4-team single round-robin with the circle method', () => {
    expect(generateFixtures(['a', 'b', 'c', 'd'], { legs: 1 })).toEqual([
      { matchday: 1, homeId: 'a', awayId: 'd' },
      { matchday: 1, homeId: 'b', awayId: 'c' },
      { matchday: 2, homeId: 'c', awayId: 'a' },
      { matchday: 2, homeId: 'd', awayId: 'b' },
      { matchday: 3, homeId: 'a', awayId: 'b' },
      { matchday: 3, homeId: 'c', awayId: 'd' },
    ])
  })

  it('gives each of 3 teams one bye and meets every pair once', () => {
    expect(generateFixtures(['a', 'b', 'c'])).toEqual([
      { matchday: 1, homeId: 'b', awayId: 'c' },
      { matchday: 2, homeId: 'c', awayId: 'a' },
      { matchday: 3, homeId: 'a', awayId: 'b' },
    ])
  })

  it('mirrors the first leg with home and away swapped', () => {
    expect(generateFixtures(['a', 'b', 'c', 'd'], { legs: 2 })).toEqual([
      { matchday: 1, homeId: 'a', awayId: 'd' },
      { matchday: 1, homeId: 'b', awayId: 'c' },
      { matchday: 2, homeId: 'c', awayId: 'a' },
      { matchday: 2, homeId: 'd', awayId: 'b' },
      { matchday: 3, homeId: 'a', awayId: 'b' },
      { matchday: 3, homeId: 'c', awayId: 'd' },
      { matchday: 4, homeId: 'd', awayId: 'a' },
      { matchday: 4, homeId: 'c', awayId: 'b' },
      { matchday: 5, homeId: 'a', awayId: 'c' },
      { matchday: 5, homeId: 'b', awayId: 'd' },
      { matchday: 6, homeId: 'b', awayId: 'a' },
      { matchday: 6, homeId: 'd', awayId: 'c' },
    ])
  })

  it('keeps round-robin invariants for odd and even fields and both legs', () => {
    for (const count of [2, 3, 4, 5, 6, 7, 8]) {
      for (const legs of [1, 2]) {
        const ids = Array.from({ length: count }, (_, index) => `p${index}`)
        assertSchedule(generateFixtures(ids, { legs }), ids, legs)
      }
    }
  })

  it('uses participant order when no seed is given and does not mutate it', () => {
    const ids = ['a', 'b', 'c', 'd']
    const copy = [...ids]
    const forward = generateFixtures(ids, { legs: 1 })
    const reverse = generateFixtures(['d', 'c', 'b', 'a'], { legs: 1 })
    expect(ids).toEqual(copy)
    expect(forward).not.toEqual(reverse)
    expect(forward[0]).toEqual({ matchday: 1, homeId: 'a', awayId: 'd' })
  })

  it('shuffles the draw from a seed, stably, without breaking the schedule', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f']
    const copy = [...ids]
    const first = generateFixtures(ids, { legs: 2, seed: 1 })
    const again = generateFixtures(ids, { legs: 2, seed: 1 })
    const other = generateFixtures(ids, { legs: 2, seed: 2 })
    const unseeded = generateFixtures(ids, { legs: 2 })
    expect(ids).toEqual(copy)
    expect(first).toEqual(again)
    expect(first).not.toEqual(other)
    expect(first).not.toEqual(unseeded)
    assertSchedule(first, ids, 2)
    assertSchedule(generateFixtures(ids, { legs: 1, seed: 0 }), ids, 1)
    assertSchedule(generateFixtures(ids, { legs: 1, seed: 'north' }), ids, 1)
  })
})
