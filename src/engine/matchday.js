import { toMillis } from './time.js'

function matchdaysOf(matches) {
  const days = []
  const seen = new Set()
  for (const match of matches) {
    if (!Number.isFinite(match?.matchday) || seen.has(match.matchday)) continue
    seen.add(match.matchday)
    days.push(match.matchday)
  }
  days.sort((a, b) => a - b)
  return days
}

function hasStarted(dayMatches, now) {
  let start = null
  let hasResult = false
  for (const match of dayMatches) {
    if (match.status === 'played' || match.status === 'void') hasResult = true
    const time = toMillis(match.scheduledAt) ?? toMillis(match.playedAt)
    if (time != null && (start == null || time < start)) start = time
  }
  if (hasResult) return true
  if (start == null) return false
  return start <= now
}

function isComplete(dayMatches) {
  return dayMatches.every((match) => match.status === 'played' || match.status === 'void')
}

export function currentMatchday(matches, now) {
  const list = Array.isArray(matches) ? matches : []
  const days = matchdaysOf(list)
  if (!days.length) return null

  const groups = new Map(days.map((day) => [day, []]))
  for (const match of list) {
    if (groups.has(match.matchday)) groups.get(match.matchday).push(match)
  }

  const instant = toMillis(now) ?? Date.now()
  let lastStarted = null
  for (const day of days) {
    if (!hasStarted(groups.get(day), instant)) break
    lastStarted = day
  }

  if (lastStarted == null) return days[0]
  const index = days.indexOf(lastStarted)
  if (isComplete(groups.get(lastStarted)) && index < days.length - 1) return days[index + 1]
  return lastStarted
}
