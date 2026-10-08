import {
  compareIds,
  compareNames,
  compareFormOrder,
  isPlayed,
  pointsFor,
  resultOf,
  rulesFromOptions,
} from './time.js'

function emptyRow(playerId) {
  return {
    playerId,
    position: 0,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDiff: 0,
    points: 0,
    form: [],
  }
}

function applyResult(row, goalsFor, goalsAgainst, rules) {
  row.played += 1
  row.goalsFor += goalsFor
  row.goalsAgainst += goalsAgainst
  row.goalDiff = row.goalsFor - row.goalsAgainst
  row.points += pointsFor(goalsFor, goalsAgainst, rules)
  if (goalsFor > goalsAgainst) row.won += 1
  else if (goalsFor < goalsAgainst) row.lost += 1
  else row.drawn += 1
}

function countsFor(match, playerId, venue) {
  if (venue === 'home') return match.homeId === playerId
  if (venue === 'away') return match.awayId === playerId
  return match.homeId === playerId || match.awayId === playerId
}

function miniLeaguePoints(playerIds, matches, venue, rules) {
  const ids = new Set(playerIds)
  const points = new Map(playerIds.map((id) => [id, 0]))
  for (const match of matches) {
    if (!isPlayed(match)) continue
    if (!ids.has(match.homeId) || !ids.has(match.awayId)) continue
    if (venue !== 'away') {
      points.set(
        match.homeId,
        points.get(match.homeId) + pointsFor(match.homeGoals, match.awayGoals, rules),
      )
    }
    if (venue !== 'home') {
      points.set(
        match.awayId,
        points.get(match.awayId) + pointsFor(match.awayGoals, match.homeGoals, rules),
      )
    }
  }
  return points
}

function orderRows(rows, matches, venue, rules, names) {
  const ranked = [...rows].sort((a, b) =>
    b.points - a.points
    || b.goalDiff - a.goalDiff
    || b.goalsFor - a.goalsFor
  )

  const ordered = []
  let index = 0
  while (index < ranked.length) {
    const anchor = ranked[index]
    let end = index + 1
    while (
      end < ranked.length
      && ranked[end].points === anchor.points
      && ranked[end].goalDiff === anchor.goalDiff
      && ranked[end].goalsFor === anchor.goalsFor
    ) {
      end += 1
    }
    const group = ranked.slice(index, end)
    if (group.length > 1) {
      const headToHead = miniLeaguePoints(
        group.map((row) => row.playerId),
        matches,
        venue,
        rules,
      )
      group.sort((a, b) =>
        (headToHead.get(b.playerId) ?? 0) - (headToHead.get(a.playerId) ?? 0)
        || compareNames(names[a.playerId], names[b.playerId])
        || compareIds(a.playerId, b.playerId)
      )
    }
    ordered.push(...group)
    index = end
  }

  return ordered.map((row, position) => ({ ...row, position: position + 1 }))
}

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

export function computeStandings(matches, participantIds, options = {}) {
  const rules = rulesFromOptions(options)
  const venue = options?.venue === 'home' || options?.venue === 'away' ? options.venue : 'all'
  const names = options?.names ?? {}
  const rows = new Map()

  for (const playerId of participantIds ?? []) {
    if (playerId == null || rows.has(playerId)) continue
    rows.set(playerId, emptyRow(playerId))
  }

  const list = Array.isArray(matches) ? matches : []
  for (const match of list) {
    if (!isPlayed(match)) continue
    if (rows.has(match.homeId) && countsFor(match, match.homeId, venue)) {
      applyResult(rows.get(match.homeId), match.homeGoals, match.awayGoals, rules)
    }
    if (rows.has(match.awayId) && countsFor(match, match.awayId, venue)) {
      applyResult(rows.get(match.awayId), match.awayGoals, match.homeGoals, rules)
    }
  }

  for (const [playerId, row] of rows) {
    const relevant = list.filter((match) => countsFor(match, playerId, venue))
    row.form = computeForm(relevant, playerId, 5, { seasonOrder: options?.seasonOrder })
  }

  return orderRows([...rows.values()], list, venue, rules, names)
}

export function allTimeTable(matches, options = {}) {
  const ids = []
  const seen = new Set()
  for (const match of matches ?? []) {
    for (const playerId of [match?.homeId, match?.awayId]) {
      if (playerId == null || seen.has(playerId)) continue
      seen.add(playerId)
      ids.push(playerId)
    }
  }
  return computeStandings(matches ?? [], ids, options)
}
