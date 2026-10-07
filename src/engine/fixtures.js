// Circle method: fix index 0 and rotate the rest. On odd rounds the fixed
// team's pairing flips so each side's home and away counts differ by at most one.
// A null slot is a bye when the field is odd. The second leg repeats the first
// with home and away swapped.

function hashSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) return seed >>> 0
  const text = String(seed)
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed) {
  let state = seed >>> 0
  return function next() {
    state = (state + 0x6D2B79F5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle(ids, seed) {
  const order = [...ids]
  const random = mulberry32(hashSeed(seed))
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const swap = order[i]
    order[i] = order[j]
    order[j] = swap
  }
  return order
}

function uniqueIds(participantIds) {
  const ids = []
  const seen = new Set()
  for (const id of participantIds ?? []) {
    if (id == null || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

function singleLeg(ids) {
  const list = [...ids]
  if (list.length % 2 === 1) list.push(null)
  const count = list.length
  if (count < 2) return []

  const rounds = count - 1
  const half = count / 2
  const fixtures = []

  for (let round = 0; round < rounds; round++) {
    const matchday = round + 1
    for (let slot = 0; slot < half; slot++) {
      let homeId = list[slot]
      let awayId = list[count - 1 - slot]
      if (homeId == null || awayId == null) continue
      if (slot === 0 && round % 2 === 1) {
        const swap = homeId
        homeId = awayId
        awayId = swap
      }
      fixtures.push({ matchday, homeId, awayId })
    }
    const last = list.pop()
    list.splice(1, 0, last)
  }

  return fixtures
}

function mirrorLeg(fixtures) {
  const rounds = fixtures.reduce((max, fixture) => Math.max(max, fixture.matchday), 0)
  return fixtures.map((fixture) => ({
    matchday: fixture.matchday + rounds,
    homeId: fixture.awayId,
    awayId: fixture.homeId,
  }))
}

export function generateFixtures(participantIds, options = {}) {
  const ids = uniqueIds(participantIds)
  const ordered = options?.seed == null ? ids : shuffle(ids, options.seed)
  const first = singleLeg(ordered)
  if (options?.legs === 2) return first.concat(mirrorLeg(first))
  return first
}
