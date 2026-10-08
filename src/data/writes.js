import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'
import { leagueDoc, playerDoc, scheduledMatchDoc, seasonDoc } from './documents.js'
import {
  assertLegs,
  assertParticipantsList,
  assertReasonable,
  assertSeasonNumber,
  normalizePoints,
  normalizeQualificationSpots,
  requiredText,
  seasonPatch,
  toTimestamp,
} from './validate.js'

const OPEN_STATUSES = ['scheduled', 'postponed', 'void']

function normalizeShortCode(value) {
  const code = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (!/^[A-Z0-9]{2,4}$/.test(code)) {
    throw new Error('Short code must be 2–4 letters or digits')
  }
  return code
}

function normalizeColor(value) {
  const color = typeof value === 'string' ? value.trim() : ''
  if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
    throw new Error('Color must be a #RRGGBB hex value')
  }
  return color.toUpperCase()
}

function assertMatchday(matchday) {
  if (!Number.isInteger(matchday) || matchday < 1 || matchday > 60) {
    throw new Error('Matchday must be an integer from 1 to 60')
  }
}

function assertScore(value) {
  if (!Number.isInteger(value) || value < 0 || value > 99) {
    throw new Error('Goals must be an integer from 0 to 99')
  }
}

function boundedText(value, max, label) {
  const text = value == null ? '' : String(value)
  if (text.length > max) throw new Error(`${label} is too long`)
  return text
}

function statPair(value, max) {
  const home = value?.home ?? 0
  const away = value?.away ?? 0
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0 || home > max || away > max) {
    throw new Error(`Stats must be integers from 0 to ${max}`)
  }
  return { home, away }
}

function normalizeScorer(scorer) {
  if (scorer?.side !== 'home' && scorer?.side !== 'away') {
    throw new Error('Scorer side must be home or away')
  }
  const name = typeof scorer.name === 'string' ? scorer.name.trim() : ''
  if (name.length < 1 || name.length > 40) throw new Error('Scorer name is required')
  if (!Number.isInteger(scorer.minute) || scorer.minute < 0 || scorer.minute > 130) {
    throw new Error('Scorer minute must be an integer from 0 to 130')
  }
  return { side: scorer.side, name, minute: scorer.minute }
}

function normalizeDetails(details) {
  if (details == null) return null
  const scorers = details.scorers ?? []
  if (!Array.isArray(scorers) || scorers.length > 12) {
    throw new Error('A match can record at most 12 scorers')
  }
  return {
    scorers: scorers.map(normalizeScorer),
    homeTeamUsed: boundedText(details.homeTeamUsed, 40, 'Home team'),
    awayTeamUsed: boundedText(details.awayTeamUsed, 40, 'Away team'),
    possession: statPair(details.possession, 100),
    shots: statPair(details.shots, 99),
    shotsOnTarget: statPair(details.shotsOnTarget, 99),
    motm: boundedText(details.motm, 40, 'MOTM'),
    notes: boundedText(details.notes, 500, 'Notes'),
  }
}

function leagueRef(leagueId) {
  return doc(db, 'leagues', leagueId)
}

function seasonRef(leagueId, seasonId) {
  return doc(db, 'leagues', leagueId, 'seasons', seasonId)
}

function matchRef(match) {
  if (!match?.leagueId || !match?.seasonId || !match?.id) {
    throw new Error('Match is missing its id')
  }
  return doc(db, 'leagues', match.leagueId, 'seasons', match.seasonId, 'matches', match.id)
}

async function requireSeason(leagueId, seasonId) {
  const snap = await getDoc(seasonRef(leagueId, seasonId))
  if (!snap.exists()) throw new Error('Season not found')
  return snap.data()
}

function assertFixturePair(season, homeId, awayId) {
  if (homeId === awayId) throw new Error('Home and away must be different players')
  if (!season.participantIds.includes(homeId) || !season.participantIds.includes(awayId)) {
    throw new Error('Both players must be in the season')
  }
}

async function commitInBatches(ops) {
  if (ops.length === 0) return
  let batch = writeBatch(db)
  let count = 0
  for (const op of ops) {
    op(batch)
    count += 1
    if (count === 400) {
      await batch.commit()
      batch = writeBatch(db)
      count = 0
    }
  }
  if (count > 0) await batch.commit()
}

export async function createLeague({ name, emoji, color }) {
  const ref = await addDoc(collection(db, 'leagues'), leagueDoc({
    name: requiredText(name, 60, 'League name'),
    emoji: requiredText(emoji, 32, 'Emoji'),
    color: normalizeColor(color),
  }))
  return ref.id
}

export async function updateLeague(leagueId, patch) {
  const next = { updatedAt: serverTimestamp() }
  if (patch.name != null) next.name = requiredText(patch.name, 60, 'League name')
  if (patch.emoji != null) next.emoji = requiredText(patch.emoji, 32, 'Emoji')
  if (patch.color != null) next.color = normalizeColor(patch.color)
  if (Object.keys(next).length === 1) throw new Error('Nothing to update')
  await updateDoc(leagueRef(leagueId), next)
}

export async function createPlayer(leagueId, input) {
  const ref = await addDoc(collection(db, 'leagues', leagueId, 'players'), playerDoc({
    name: requiredText(input.name, 40, 'Player name'),
    clubName: requiredText(input.clubName, 48, 'Club name'),
    shortCode: normalizeShortCode(input.shortCode),
    color: normalizeColor(input.color),
    emoji: requiredText(input.emoji, 32, 'Emoji'),
  }))
  return ref.id
}

export async function updatePlayer(leagueId, playerId, patch) {
  const next = { updatedAt: serverTimestamp() }
  if (patch.name != null) next.name = requiredText(patch.name, 40, 'Player name')
  if (patch.clubName != null) next.clubName = requiredText(patch.clubName, 48, 'Club name')
  if (patch.shortCode != null) next.shortCode = normalizeShortCode(patch.shortCode)
  if (patch.color != null) next.color = normalizeColor(patch.color)
  if (patch.emoji != null) next.emoji = requiredText(patch.emoji, 32, 'Emoji')
  if (patch.archived != null) next.archived = Boolean(patch.archived)
  if (Object.keys(next).length === 1) throw new Error('Nothing to update')
  await updateDoc(doc(db, 'leagues', leagueId, 'players', playerId), next)
}

export async function archivePlayer(leagueId, playerId) {
  await updateDoc(doc(db, 'leagues', leagueId, 'players', playerId), {
    archived: true,
    updatedAt: serverTimestamp(),
  })
}

export async function createSeason(leagueId, input) {
  assertSeasonNumber(input.number)
  assertLegs(input.legs ?? 1)
  const startDate = toTimestamp(input.startDate)
  if (startDate == null) throw new Error('Start date is required')
  assertReasonable(startDate, 'Start date')
  const participantIds = assertParticipantsList(input.participantIds)
  const ref = await addDoc(collection(db, 'leagues', leagueId, 'seasons'), seasonDoc({
    name: requiredText(input.name, 60, 'Season name'),
    number: input.number,
    participantIds,
    qualificationSpots: normalizeQualificationSpots(input.qualificationSpots ?? 1, participantIds.length),
    legs: input.legs ?? 1,
    points: normalizePoints(input.points),
    startDate,
  }))
  return ref.id
}

export async function updateSeason(leagueId, seasonId, patch) {
  const season = await requireSeason(leagueId, seasonId)
  await updateDoc(seasonRef(leagueId, seasonId), {
    ...seasonPatch(season, patch),
    updatedAt: serverTimestamp(),
  })
}

export async function replaceFixtures(leagueId, seasonId, fixtures) {
  const season = await requireSeason(leagueId, seasonId)
  if (season.status !== 'draft') {
    throw new Error('Fixtures can only be replaced while the season is a draft')
  }
  if (!Array.isArray(fixtures)) throw new Error('Fixtures must be a list')
  for (const fixture of fixtures) {
    assertMatchday(fixture.matchday)
    assertFixturePair(season, fixture.homeId, fixture.awayId)
  }
  const matchesRef = collection(db, 'leagues', leagueId, 'seasons', seasonId, 'matches')
  const existing = await getDocs(matchesRef)
  const ops = [
    ...existing.docs.map((match) => (batch) => batch.delete(match.ref)),
    ...fixtures.map((fixture) => {
      const scheduledAt = toTimestamp(fixture.scheduledAt ?? null)
      assertReasonable(scheduledAt, 'Kickoff')
      const ref = doc(matchesRef)
      return (batch) => batch.set(ref, scheduledMatchDoc({
        leagueId,
        seasonId,
        matchday: fixture.matchday,
        homeId: fixture.homeId,
        awayId: fixture.awayId,
        scheduledAt,
      }))
    }),
  ]
  await commitInBatches(ops)
}

export async function activateSeason(leagueId, seasonId) {
  const season = await requireSeason(leagueId, seasonId)
  if (season.status !== 'draft') throw new Error('Only a draft season can be activated')
  const league = leagueRef(leagueId)
  const leagueSnap = await getDoc(league)
  const current = leagueSnap.data()?.activeSeasonId ?? null
  if (current && current !== seasonId) throw new Error('Another season is already active')
  const batch = writeBatch(db)
  batch.update(seasonRef(leagueId, seasonId), {
    status: 'active',
    updatedAt: serverTimestamp(),
  })
  batch.update(league, {
    activeSeasonId: seasonId,
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
}

export async function completeSeason(leagueId, seasonId, { finalStandings, championId, voidMatchIds = [] }) {
  const season = await requireSeason(leagueId, seasonId)
  if (season.status !== 'active') throw new Error('Only an active season can be completed')
  if (typeof championId !== 'string' || !season.participantIds.includes(championId)) {
    throw new Error('Champion must be a participant')
  }
  if (!Array.isArray(finalStandings) || finalStandings.length !== season.participantIds.length) {
    throw new Error('Final standings must include every participant')
  }
  const orderedStandings = [...finalStandings].sort((a, b) => a.position - b.position)
  if (orderedStandings[0]?.playerId !== championId || orderedStandings[0]?.position !== 1) {
    throw new Error('Champion must be the first-place participant')
  }
  if (voidMatchIds.length > 400) throw new Error('Too many matches to void at once')
  for (const matchId of voidMatchIds) {
    await updateDoc(doc(db, 'leagues', leagueId, 'seasons', seasonId, 'matches', matchId), {
      status: 'void',
      homeGoals: null,
      awayGoals: null,
      playedAt: null,
      updatedAt: serverTimestamp(),
    })
  }
  await updateDoc(seasonRef(leagueId, seasonId), {
    status: 'completed',
    finalStandings: orderedStandings,
    championId,
    endDate: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  const league = leagueRef(leagueId)
  const leagueSnap = await getDoc(league)
  if (leagueSnap.data()?.activeSeasonId === seasonId) {
    await updateDoc(league, {
      activeSeasonId: null,
      updatedAt: serverTimestamp(),
    })
  }
}

export async function reopenSeason(leagueId, seasonId) {
  const season = await requireSeason(leagueId, seasonId)
  if (season.status !== 'completed') throw new Error('Only a completed season can be reopened')
  const league = leagueRef(leagueId)
  const leagueSnap = await getDoc(league)
  const current = leagueSnap.data()?.activeSeasonId ?? null
  if (current && current !== seasonId) throw new Error('Another season is already active')
  const batch = writeBatch(db)
  batch.update(seasonRef(leagueId, seasonId), {
    status: 'active',
    championId: null,
    finalStandings: null,
    endDate: null,
    updatedAt: serverTimestamp(),
  })
  batch.update(league, {
    activeSeasonId: seasonId,
    updatedAt: serverTimestamp(),
  })
  await batch.commit()
}

export async function deleteSeason(leagueId, seasonId) {
  const seasonSnap = await getDoc(seasonRef(leagueId, seasonId))
  if (!seasonSnap.exists()) return
  const status = seasonSnap.data().status
  if (status !== 'draft' && status !== 'active') throw new Error('A completed season cannot be deleted')
  const league = leagueRef(leagueId)
  const leagueSnap = await getDoc(league)
  const isCurrent = leagueSnap.data()?.activeSeasonId === seasonId
  const matches = await getDocs(collection(db, 'leagues', leagueId, 'seasons', seasonId, 'matches'))

  if (status === 'active') {
    // Rules only allow this as one batch: matches, season, and the league pointer together.
    if (matches.size > 498) throw new Error('Too many matches to delete in one go')
    const batch = writeBatch(db)
    matches.docs.forEach((match) => batch.delete(match.ref))
    batch.delete(seasonRef(leagueId, seasonId))
    if (isCurrent) batch.update(league, { activeSeasonId: null, updatedAt: serverTimestamp() })
    await batch.commit()
    return
  }

  if (isCurrent) {
    await updateDoc(league, {
      activeSeasonId: null,
      updatedAt: serverTimestamp(),
    })
  }
  await commitInBatches([
    ...matches.docs.map((match) => (batch) => batch.delete(match.ref)),
    (batch) => batch.delete(seasonRef(leagueId, seasonId)),
  ])
}

export async function saveResult(match, { homeGoals, awayGoals, details }) {
  assertScore(homeGoals)
  assertScore(awayGoals)
  const patch = {
    status: 'played',
    homeGoals,
    awayGoals,
    details: normalizeDetails(details),
    updatedAt: serverTimestamp(),
  }
  if (match.playedAt == null) patch.playedAt = serverTimestamp()
  await updateDoc(matchRef(match), patch)
}

export async function clearResult(match) {
  await updateDoc(matchRef(match), {
    status: 'scheduled',
    homeGoals: null,
    awayGoals: null,
    playedAt: null,
    details: null,
    updatedAt: serverTimestamp(),
  })
}

export async function setMatchStatus(match, status) {
  if (!OPEN_STATUSES.includes(status)) {
    throw new Error('Status must be scheduled, postponed, or void')
  }
  await updateDoc(matchRef(match), {
    status,
    homeGoals: null,
    awayGoals: null,
    playedAt: null,
    updatedAt: serverTimestamp(),
  })
}

export async function rescheduleMatch(match, scheduledAt) {
  const when = toTimestamp(scheduledAt)
  assertReasonable(when, 'Kickoff')
  await updateDoc(matchRef(match), {
    scheduledAt: when,
    updatedAt: serverTimestamp(),
  })
}

export async function addMatch(leagueId, seasonId, fixture) {
  const season = await requireSeason(leagueId, seasonId)
  if (season.status !== 'draft' && season.status !== 'active') {
    throw new Error('Matches can only be added to a draft or active season')
  }
  assertMatchday(fixture.matchday)
  assertFixturePair(season, fixture.homeId, fixture.awayId)
  const scheduledAt = toTimestamp(fixture.scheduledAt ?? null)
  assertReasonable(scheduledAt, 'Kickoff')
  const ref = doc(collection(db, 'leagues', leagueId, 'seasons', seasonId, 'matches'))
  await setDoc(ref, scheduledMatchDoc({
    leagueId,
    seasonId,
    matchday: fixture.matchday,
    homeId: fixture.homeId,
    awayId: fixture.awayId,
    scheduledAt,
  }))
  return ref.id
}
