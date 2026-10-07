import { computeStandings } from './standings.js'
import {
  compareIds,
  compareOldest,
  isPlayed,
  kickoffMillis,
  resultOf,
  rulesFromSeason,
} from './time.js'

function meeting(match, playerAId, playerBId) {
  return (match.homeId === playerAId && match.awayId === playerBId)
    || (match.homeId === playerBId && match.awayId === playerAId)
}

function chronological(matches) {
  return matches
    .map((match, index) => ({ match, index }))
    .sort(compareOldest)
    .map(({ match }) => match)
}

export function headToHead(matches, playerAId, playerBId) {
  const empty = { winsA: 0, winsB: 0, draws: 0, goalsA: 0, goalsB: 0, matches: [] }
  if (playerAId == null || playerBId == null || playerAId === playerBId) return empty

  const meetings = chronological(
    (Array.isArray(matches) ? matches : []).filter((match) => meeting(match, playerAId, playerBId)),
  )

  let winsA = 0
  let winsB = 0
  let draws = 0
  let goalsA = 0
  let goalsB = 0

  for (const match of meetings) {
    if (!isPlayed(match)) continue
    const aGoals = match.homeId === playerAId ? match.homeGoals : match.awayGoals
    const bGoals = match.homeId === playerAId ? match.awayGoals : match.homeGoals
    goalsA += aGoals
    goalsB += bGoals
    if (aGoals > bGoals) winsA += 1
    else if (aGoals < bGoals) winsB += 1
    else draws += 1
  }

  return { winsA, winsB, draws, goalsA, goalsB, matches: meetings }
}

function seasonNumber(season, index) {
  return season.number ?? index
}

function careerOrder(entries, seasons) {
  const numbers = new Map((seasons ?? []).map((season, index) => [season.id, seasonNumber(season, index)]))
  return [...entries].sort((a, b) => {
    const left = kickoffMillis(a.match)
    const right = kickoffMillis(b.match)
    if (left != null && right != null && left !== right) return left - right
    if (left != null && right == null) return -1
    if (left == null && right != null) return 1
    const leftSeason = numbers.get(a.match.seasonId) ?? 0
    const rightSeason = numbers.get(b.match.seasonId) ?? 0
    if (leftSeason !== rightSeason) return leftSeason - rightSeason
    return compareOldest(a, b)
  })
}

function betterWin(candidate, current) {
  if (!current) return true
  if (candidate.margin !== current.margin) return candidate.margin > current.margin
  if (candidate.goalsFor !== current.goalsFor) return candidate.goalsFor > current.goalsFor
  return false
}

function finishFor(season, playerId, matches, names) {
  const participants = Array.isArray(season.participantIds) ? season.participantIds : []
  const rules = rulesFromSeason(season)
  const table = computeStandings(
    matches.filter((match) => match.seasonId === season.id),
    participants,
    { ...rules, names },
  )
  const live = table.find((row) => row.playerId === playerId)
  let position = live ? live.position : null
  if (Array.isArray(season.finalStandings)) {
    const snapped = season.finalStandings.find((row) => row && row.playerId === playerId)
    position = snapped && Number.isFinite(snapped.position) ? snapped.position : null
  }

  return {
    seasonId: season.id,
    name: season.name ?? null,
    number: season.number ?? null,
    status: season.status ?? null,
    position,
    played: live?.played ?? 0,
    won: live?.won ?? 0,
    drawn: live?.drawn ?? 0,
    lost: live?.lost ?? 0,
    goalsFor: live?.goalsFor ?? 0,
    goalsAgainst: live?.goalsAgainst ?? 0,
    goalDiff: live?.goalDiff ?? 0,
    points: live?.points ?? 0,
    title: season.championId === playerId,
  }
}

export function playerCareer(matches, seasons, playerId, names = {}) {
  const seasonList = Array.isArray(seasons) ? seasons : []
  const matchList = Array.isArray(matches) ? matches : []
  const seasonById = new Map(seasonList.map((season) => [season.id, season]))
  const involved = []
  matchList.forEach((match, index) => {
    if (match?.homeId !== playerId && match?.awayId !== playerId) return
    involved.push({ match, index })
  })

  let played = 0
  let won = 0
  let drawn = 0
  let lost = 0
  let goalsFor = 0
  let goalsAgainst = 0
  let points = 0
  let biggestWin = null
  let winStreak = 0
  let unbeatenStreak = 0
  let longestWinStreak = 0
  let longestUnbeatenStreak = 0

  for (const { match } of careerOrder(involved, seasonList)) {
    if (!isPlayed(match)) continue
    const scored = match.homeId === playerId ? match.homeGoals : match.awayGoals
    const conceded = match.homeId === playerId ? match.awayGoals : match.homeGoals
    const rules = rulesFromSeason(seasonById.get(match.seasonId))
    const outcome = resultOf(match, playerId)

    played += 1
    goalsFor += scored
    goalsAgainst += conceded
    points += outcome === 'W' ? rules.pointsWin : outcome === 'L' ? rules.pointsLoss : rules.pointsDraw

    if (outcome === 'W') {
      won += 1
      winStreak += 1
      unbeatenStreak += 1
      const candidate = {
        matchId: match.id ?? null,
        seasonId: match.seasonId ?? null,
        matchday: match.matchday ?? null,
        opponentId: match.homeId === playerId ? match.awayId : match.homeId,
        goalsFor: scored,
        goalsAgainst: conceded,
        margin: scored - conceded,
      }
      if (betterWin(candidate, biggestWin)) biggestWin = candidate
    } else if (outcome === 'D') {
      drawn += 1
      winStreak = 0
      unbeatenStreak += 1
    } else {
      lost += 1
      winStreak = 0
      unbeatenStreak = 0
    }

    if (winStreak > longestWinStreak) longestWinStreak = winStreak
    if (unbeatenStreak > longestUnbeatenStreak) longestUnbeatenStreak = unbeatenStreak
  }

  const finishes = seasonList
    .map((season, index) => ({ season, index }))
    .filter(({ season }) => Array.isArray(season.participantIds) && season.participantIds.includes(playerId))
    .sort((a, b) => {
      const byNumber = seasonNumber(a.season, a.index) - seasonNumber(b.season, b.index)
      if (byNumber !== 0) return byNumber
      return a.index - b.index
    })
    .map(({ season }) => finishFor(season, playerId, matchList, names))

  return {
    playerId,
    seasonsPlayed: finishes.length,
    titles: seasonList.filter((season) => season.championId === playerId).length,
    played,
    won,
    drawn,
    lost,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    points,
    winPct: played === 0 ? 0 : Math.round((won / played) * 1000) / 10,
    finishes,
    biggestWin,
    longestWinStreak,
    longestUnbeatenStreak,
  }
}

function tiedLeaders(rows, read, field, highest) {
  if (!rows.length) return []
  const target = rows.reduce((best, row) => {
    const value = read(row)
    if (best == null) return value
    return highest ? Math.max(best, value) : Math.min(best, value)
  }, null)
  return rows
    .filter((row) => read(row) === target)
    .map((row) => ({ playerId: row.playerId, [field]: read(row) }))
    .sort((a, b) => compareIds(a.playerId, b.playerId))
}

function collectBiggestWins(matches) {
  const wins = []
  for (const match of matches ?? []) {
    if (!isPlayed(match) || match.homeGoals === match.awayGoals) continue
    const homeWon = match.homeGoals > match.awayGoals
    const goalsFor = homeWon ? match.homeGoals : match.awayGoals
    const goalsAgainst = homeWon ? match.awayGoals : match.homeGoals
    wins.push({
      matchId: match.id ?? null,
      seasonId: match.seasonId ?? null,
      matchday: match.matchday ?? null,
      playerId: homeWon ? match.homeId : match.awayId,
      opponentId: homeWon ? match.awayId : match.homeId,
      goalsFor,
      goalsAgainst,
      margin: goalsFor - goalsAgainst,
    })
  }
  if (!wins.length) return []
  const margin = Math.max(...wins.map((win) => win.margin))
  return wins
    .filter((win) => win.margin === margin)
    .sort((a, b) => compareIds(a.playerId, b.playerId) || compareIds(a.matchId, b.matchId))
}

export function seasonLeaders(matches, standings) {
  const rows = (Array.isArray(standings) ? standings : []).filter((row) => (row?.played ?? 0) > 0)
  return {
    mostGoals: tiedLeaders(rows, (row) => row.goalsFor ?? 0, 'goalsFor', true),
    bestDefence: tiedLeaders(rows, (row) => row.goalsAgainst ?? 0, 'goalsAgainst', false),
    mostWins: tiedLeaders(rows, (row) => row.won ?? 0, 'won', true),
    biggestWin: collectBiggestWins(matches),
  }
}
