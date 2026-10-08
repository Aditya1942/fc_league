import { Timestamp } from 'firebase/firestore'

export const MIN_MS = Date.UTC(2020, 0, 1)
export const MAX_AHEAD_MS = 800 * 24 * 60 * 60 * 1000

export function requiredText(value, max, label) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (text.length < 1 || text.length > max) {
    throw new Error(`${label} must be 1–${max} characters`)
  }
  return text
}

export function assertSeasonNumber(number) {
  if (!Number.isInteger(number) || number < 1 || number > 999) {
    throw new Error('Season number must be an integer from 1 to 999')
  }
}

export function assertLegs(legs) {
  if (legs !== 1 && legs !== 2) throw new Error('Legs must be 1 or 2')
}

export function assertParticipantsList(ids) {
  if (!Array.isArray(ids) || ids.length < 2 || ids.length > 12) {
    throw new Error('A season needs 2–12 participants')
  }
  if (ids.some((id) => typeof id !== 'string' || id.length < 1 || id.includes('/'))) {
    throw new Error('Participant ids are invalid')
  }
  if (new Set(ids).size !== ids.length) throw new Error('Participants must be unique')
  return ids
}

export function normalizePoints(points = {}) {
  const next = {
    win: points.win ?? 3,
    draw: points.draw ?? 1,
    loss: points.loss ?? 0,
  }
  for (const [label, value] of Object.entries(next)) {
    if (!Number.isInteger(value) || value < 0 || value > 20) {
      throw new Error(`Points for a ${label} must be an integer from 0 to 20`)
    }
  }
  return next
}

export function toTimestamp(value) {
  if (value == null || value === '') return null
  if (value instanceof Timestamp) return value
  if (value instanceof Date) return Timestamp.fromDate(value)
  if (typeof value === 'number') return Timestamp.fromMillis(value)
  if (typeof value === 'string') {
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) throw new Error('Invalid date')
    return Timestamp.fromDate(parsed)
  }
  throw new Error('Invalid date')
}

export function assertReasonable(timestamp, label) {
  if (timestamp == null) return
  const millis = timestamp.toMillis()
  if (millis < MIN_MS || millis > Date.now() + MAX_AHEAD_MS) {
    throw new Error(`${label} is out of range`)
  }
}

export const SEASON_EDITABLE = {
  draft: ['name', 'number', 'participantIds', 'legs', 'points', 'startDate', 'qualificationSpots'],
  active: ['name', 'points', 'startDate', 'qualificationSpots'],
  completed: ['name', 'qualificationSpots'],
}

export function normalizeQualificationSpots(value, participantCount) {
  const max = Math.max(1, participantCount - 1)
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new Error(`Qualification spots must be an integer from 1 to ${max}`)
  }
  return value
}

export function seasonPatch(season, patch) {
  const editable = SEASON_EDITABLE[season.status] ?? []
  const blocked = Object.keys(patch).filter((key) => patch[key] != null && !editable.includes(key))
  if (blocked.length) {
    throw new Error(`Can't change ${blocked.join(', ')} on a ${season.status} season`)
  }
  const next = {}
  if (patch.name != null) next.name = requiredText(patch.name, 60, 'Season name')
  if (patch.number != null) {
    assertSeasonNumber(patch.number)
    next.number = patch.number
  }
  if (patch.participantIds != null) next.participantIds = assertParticipantsList(patch.participantIds)
  if (patch.legs != null) {
    assertLegs(patch.legs)
    next.legs = patch.legs
  }
  if (patch.points != null) next.points = normalizePoints(patch.points)
  if (patch.startDate != null) {
    const startDate = toTimestamp(patch.startDate)
    if (startDate == null) throw new Error('Start date is required')
    assertReasonable(startDate, 'Start date')
    next.startDate = startDate
  }
  if (patch.qualificationSpots != null) {
    const count = (next.participantIds ?? season.participantIds ?? []).length
    next.qualificationSpots = normalizeQualificationSpots(patch.qualificationSpots, count)
  }
  if (Object.keys(next).length === 0) throw new Error('Nothing to update')
  return next
}
