export function toMillis(value) {
  if (value == null) return null
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isNaN(time) ? null : time
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'object' && typeof value.toDate === 'function') {
    try {
      return toMillis(value.toDate())
    } catch {
      return null
    }
  }
  if (typeof value === 'object' && typeof value.seconds === 'number') {
    const nanos = typeof value.nanoseconds === 'number' ? value.nanoseconds : 0
    return value.seconds * 1000 + Math.floor(nanos / 1e6)
  }
  return null
}

export function isPlayed(match) {
  return Boolean(match)
    && match.status === 'played'
    && match.homeId !== match.awayId
    && Number.isInteger(match.homeGoals)
    && Number.isInteger(match.awayGoals)
}

export function kickoffMillis(match) {
  return toMillis(match.playedAt) ?? toMillis(match.scheduledAt)
}

export function compareOldest(a, b) {
  const left = kickoffMillis(a.match)
  const right = kickoffMillis(b.match)
  if (left != null && right != null && left !== right) return left - right
  if (left != null && right == null) return -1
  if (left == null && right != null) return 1
  const leftDay = a.match.matchday ?? 0
  const rightDay = b.match.matchday ?? 0
  if (leftDay !== rightDay) return leftDay - rightDay
  return a.index - b.index
}

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

export function resultOf(match, playerId) {
  const goalsFor = match.homeId === playerId ? match.homeGoals : match.awayGoals
  const goalsAgainst = match.homeId === playerId ? match.awayGoals : match.homeGoals
  if (goalsFor > goalsAgainst) return 'W'
  if (goalsFor < goalsAgainst) return 'L'
  return 'D'
}

export function compareNames(left, right) {
  const a = left ?? ''
  const b = right ?? ''
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function compareIds(left, right) {
  const a = String(left)
  const b = String(right)
  if (a < b) return -1
  if (a > b) return 1
  return 0
}

export function pointsFor(goalsFor, goalsAgainst, rules) {
  if (goalsFor > goalsAgainst) return rules.pointsWin
  if (goalsFor < goalsAgainst) return rules.pointsLoss
  return rules.pointsDraw
}

export function rulesFromOptions(options = {}) {
  return {
    pointsWin: options.pointsWin ?? 3,
    pointsDraw: options.pointsDraw ?? 1,
    pointsLoss: options.pointsLoss ?? 0,
  }
}

export function rulesFromSeason(season) {
  const points = season?.points ?? {}
  return {
    pointsWin: points.win ?? 3,
    pointsDraw: points.draw ?? 1,
    pointsLoss: points.loss ?? 0,
  }
}
