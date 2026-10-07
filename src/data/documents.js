import { serverTimestamp } from 'firebase/firestore'

export function leagueDoc({ name, emoji, color, activeSeasonId = null }) {
  return {
    name,
    emoji,
    color,
    activeSeasonId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

export function playerDoc({ name, clubName, shortCode, color, emoji, archived = false }) {
  return {
    name,
    clubName,
    shortCode,
    color,
    emoji,
    archived,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

export function seasonDoc({
  name,
  number,
  participantIds,
  legs = 1,
  points = { win: 3, draw: 1, loss: 0 },
  startDate,
}) {
  return {
    name,
    number,
    status: 'draft',
    participantIds,
    legs,
    points,
    startDate,
    endDate: null,
    championId: null,
    finalStandings: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

export function scheduledMatchDoc({
  leagueId,
  seasonId,
  matchday,
  homeId,
  awayId,
  scheduledAt = null,
}) {
  return {
    leagueId,
    seasonId,
    matchday,
    homeId,
    awayId,
    playerIds: [homeId, awayId],
    status: 'scheduled',
    homeGoals: null,
    awayGoals: null,
    scheduledAt,
    playedAt: null,
    details: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}
