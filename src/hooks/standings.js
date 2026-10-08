import { computeStandings } from '../engine/index.js'

export function seasonRules(season) {
  const points = season?.points ?? {}
  return {
    pointsWin: points.win ?? 3,
    pointsDraw: points.draw ?? 1,
    pointsLoss: points.loss ?? 0,
  }
}

export function hasFinalStandings(season) {
  return season?.status === 'completed'
    && Array.isArray(season.finalStandings)
    && season.finalStandings.length > 0
}

export function seasonStandings(season, matches, names = {}, venue = 'all') {
  if (!season) return []
  const live = computeStandings(matches, season.participantIds ?? [], {
    ...seasonRules(season),
    names,
    venue,
  })
  if (venue !== 'all' || !hasFinalStandings(season)) return live

  const liveById = new Map(live.map((row) => [row.playerId, row]))
  return season.finalStandings
    .filter((row) => row && row.playerId)
    .map((row, index) => ({ row, index }))
    .sort((a, b) => (a.row.position ?? a.index + 1) - (b.row.position ?? b.index + 1))
    .map(({ row, index }) => {
      const computed = liveById.get(row.playerId) ?? {}
      const goalsFor = row.goalsFor ?? computed.goalsFor ?? 0
      const goalsAgainst = row.goalsAgainst ?? computed.goalsAgainst ?? 0
      return {
        ...computed,
        ...row,
        position: row.position ?? index + 1,
        goalsFor,
        goalsAgainst,
        goalDiff: row.goalDiff ?? goalsFor - goalsAgainst,
        form: computed.form ?? [],
      }
    })
}

export function podium(season) {
  const rows = hasFinalStandings(season)
    ? [...season.finalStandings].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    : []
  return {
    championId: season?.championId ?? rows[0]?.playerId ?? null,
    runnerUpId: rows.find((row) => row.position === 2)?.playerId ?? rows[1]?.playerId ?? null,
  }
}
