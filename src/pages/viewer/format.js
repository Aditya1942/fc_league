export function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value.toDate === 'function') return value.toDate()
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000)
  return null
}

export function matchDate(match) {
  if (match?.status === 'played') return toDate(match.playedAt) ?? toDate(match.scheduledAt)
  return toDate(match?.scheduledAt) ?? toDate(match?.playedAt)
}

export function matchMillis(match) {
  return matchDate(match)?.getTime() ?? null
}

const dayFormat = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const dayYearFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDay(date) {
  if (!date) return 'Date TBC'
  if (date.getFullYear() !== new Date().getFullYear()) return dayYearFormat.format(date)
  return dayFormat.format(date)
}

export function formatDateTime(date) {
  return date ? dateTimeFormat.format(date) : 'Date TBC'
}

export function formatShortDate(value) {
  const date = toDate(value)
  return date ? dayYearFormat.format(date) : null
}

export function isUpcoming(match) {
  return match.status === 'scheduled' || match.status === 'postponed'
}

export function isResult(match) {
  return match.status === 'played' || match.status === 'void'
}

export function sortByKickoff(matches, direction = 'asc') {
  const sign = direction === 'desc' ? -1 : 1
  return [...matches].sort((a, b) => {
    const left = matchMillis(a)
    const right = matchMillis(b)
    if (left != null && right != null && left !== right) return (left - right) * sign
    if (left != null && right == null) return -1
    if (left == null && right != null) return 1
    return ((a.matchday ?? 0) - (b.matchday ?? 0)) * sign
  })
}

function dayKey(date) {
  if (!date) return 'tbc'
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

export function groupByDate(matches, direction = 'asc') {
  const groups = []
  const byKey = new Map()
  for (const match of sortByKickoff(matches, direction)) {
    const date = matchDate(match)
    const key = dayKey(date)
    if (!byKey.has(key)) {
      const group = { key, label: formatDay(date), matches: [] }
      byKey.set(key, group)
      groups.push(group)
    }
    byKey.get(key).matches.push(match)
  }
  return groups
}

export function groupByMatchday(matches) {
  const byDay = new Map()
  for (const match of sortByKickoff(matches)) {
    const day = match.matchday ?? 0
    if (!byDay.has(day)) byDay.set(day, { key: `md-${day}`, label: `Matchday ${day}`, matches: [] })
    byDay.get(day).matches.push(match)
  }
  return [...byDay.entries()].sort((a, b) => a[0] - b[0]).map(([, group]) => group)
}

export function clubName(player) {
  return player?.clubName || player?.name || 'Unknown club'
}

export function ordinal(value) {
  if (!Number.isFinite(value)) return '–'
  const mod100 = value % 100
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] ?? 'th'
  return `${value}${suffix}`
}

export function signed(value) {
  const number = Number(value) || 0
  return number > 0 ? `+${number}` : String(number)
}

export function matchPath(match) {
  return `/matches/${match.seasonId}/${match.id}`
}
