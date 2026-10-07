export const PASTELS = ['#C5D4FF', '#F6C6D0', '#BFE6D0', '#F8D7A8', '#E0D0F8', '#C5E4F5', '#F5E6A8', '#D7DEE8']

export const STATUS_TONE = {
  draft: 'lilac',
  active: 'mint',
  completed: 'blue',
  scheduled: 'blue',
  played: 'mint',
  postponed: 'peach',
  void: 'void',
}

export function toDate(value) {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value.toDate === 'function') return value.toDate()
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000)
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function pad(number) {
  return String(number).padStart(2, '0')
}

export function toDateInput(value) {
  const date = toDate(value)
  if (!date) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function toDateTimeInput(value) {
  const date = toDate(value)
  if (!date) return ''
  return `${toDateInput(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function fromDateInput(value) {
  if (!value) return null
  const date = new Date(`${value}T12:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function fromDateTimeInput(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value) {
  const date = toDate(value)
  if (!date) return 'No date'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function formatDateTime(value) {
  const date = toDate(value)
  if (!date) return 'Date TBC'
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function byId(list) {
  const map = {}
  for (const item of list ?? []) map[item.id] = item
  return map
}

export function groupByMatchday(fixtures) {
  const groups = new Map()
  for (const fixture of fixtures ?? []) {
    if (!groups.has(fixture.matchday)) groups.set(fixture.matchday, [])
    groups.get(fixture.matchday).push(fixture)
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([matchday, items]) => ({ matchday, items }))
}

export function parseIntIn(text, min, max, label) {
  const raw = String(text ?? '').trim()
  if (raw === '') return min
  if (!/^\d+$/.test(raw)) throw new Error(`${label} must be a whole number`)
  const value = Number(raw)
  if (value < min || value > max) throw new Error(`${label} must be from ${min} to ${max}`)
  return value
}

export function playerLabel(player) {
  return player?.clubName || player?.name || 'Unknown'
}
