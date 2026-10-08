export function qualificationSpotsOf(season, rowCount) {
  const count = rowCount ?? season?.participantIds?.length ?? 0
  const max = Math.max(1, count - 1)
  const value = Number.isInteger(season?.qualificationSpots) ? season.qualificationSpots : 1
  return Math.min(Math.max(value, 1), max)
}

export function tableZones(rows, season) {
  if (!Array.isArray(rows) || rows.length < 2) return []
  const spots = qualificationSpotsOf(season, rows.length)
  const zones = [
    { id: 'champion', label: season?.status === 'completed' ? 'Champion' : 'Title spot', positions: [1] },
  ]
  if (spots >= 2) {
    zones.push({
      id: 'qualify',
      label: 'Qualification zone',
      positions: Array.from({ length: spots - 1 }, (_, index) => index + 2),
    })
  }
  zones.push({ id: 'last', label: 'Last place', positions: [rows.length] })
  return zones
}
