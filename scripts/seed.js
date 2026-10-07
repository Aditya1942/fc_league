import { initializeApp } from 'firebase/app'
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { playerDoc, scheduledMatchDoc, seasonDoc } from '../src/data/documents.js'

const PROJECT_ID = 'fc-league-26061'
const LEAGUE_ID = 'fc'
const DAY = 24 * 60 * 60 * 1000

const firebaseConfig = {
  apiKey: 'AIzaSyDK5Di5WcmFT_YzFR58bM2D7D5er6cT1h0',
  authDomain: 'fc-league-26061.firebaseapp.com',
  projectId: PROJECT_ID,
  storageBucket: 'fc-league-26061.firebasestorage.app',
  messagingSenderId: '696601753898',
  appId: '1:696601753898:web:0e95c9942410e6c66cc653',
}

const players = [
  { id: 'p1', name: 'Aditya', clubName: 'Northside FC', shortCode: 'NOR', color: '#C5D4FF', emoji: '🦁' },
  { id: 'p2', name: 'Rahul', clubName: 'River End', shortCode: 'RIV', color: '#F6C6D0', emoji: '🐯' },
  { id: 'p3', name: 'Neha', clubName: 'Palm Athletic', shortCode: 'PAL', color: '#BFE6D0', emoji: '🦊' },
  { id: 'p4', name: 'Vikram', clubName: 'Old Town', shortCode: 'OLD', color: '#F8D7A8', emoji: '🐻' },
  { id: 'p5', name: 'Sara', clubName: 'Harbour United', shortCode: 'HAR', color: '#E0D0F8', emoji: '🦅' },
  { id: 'p6', name: 'Imran', clubName: 'Westbridge', shortCode: 'WES', color: '#C5E4F5', emoji: '🐺' },
]

function singleRoundRobin(ids) {
  const list = [...ids]
  if (list.length % 2 === 1) list.push(null)
  const count = list.length
  const rounds = count - 1
  const half = count / 2
  let rotation = [...list]
  const fixtures = []
  for (let round = 0; round < rounds; round += 1) {
    for (let index = 0; index < half; index += 1) {
      const left = rotation[index]
      const right = rotation[count - 1 - index]
      if (left != null && right != null) {
        const swap = (round + index) % 2 === 1
        fixtures.push({
          matchday: round + 1,
          homeId: swap ? right : left,
          awayId: swap ? left : right,
        })
      }
    }
    const fixed = rotation[0]
    const rest = rotation.slice(1)
    rest.unshift(rest.pop())
    rotation = [fixed, ...rest]
  }
  return fixtures
}

function doubleRoundRobin(ids) {
  const first = singleRoundRobin(ids)
  const shift = Math.max(...first.map((fixture) => fixture.matchday))
  return [
    ...first,
    ...first.map((fixture) => ({
      matchday: fixture.matchday + shift,
      homeId: fixture.awayId,
      awayId: fixture.homeId,
    })),
  ]
}

function assertRoundRobin(ids, fixtures, legs) {
  const expected = (ids.length * (ids.length - 1)) / 2 * legs
  if (fixtures.length !== expected) {
    throw new Error(`expected ${expected} matches, got ${fixtures.length}`)
  }
  const seen = new Map()
  const days = new Map()
  for (const fixture of fixtures) {
    if (fixture.homeId === fixture.awayId) throw new Error('a player is home and away')
    const key = [fixture.homeId, fixture.awayId].sort().join(':')
    const directed = `${fixture.homeId}>${fixture.awayId}`
    if (!seen.has(key)) seen.set(key, [])
    seen.get(key).push(directed)
    if (!days.has(fixture.matchday)) days.set(fixture.matchday, new Set())
    const used = days.get(fixture.matchday)
    if (used.has(fixture.homeId) || used.has(fixture.awayId)) {
      throw new Error(`player twice on matchday ${fixture.matchday}`)
    }
    used.add(fixture.homeId)
    used.add(fixture.awayId)
  }
  for (const [key, dirs] of seen) {
    if (dirs.length !== legs) throw new Error(`pair ${key} met ${dirs.length} times`)
    if (legs === 2) {
      const [first, second] = dirs
      const [home, away] = first.split('>')
      if (second !== `${away}>${home}`) throw new Error(`pair ${key} was not mirrored`)
    }
  }
}

function buildMatches(fixtures, { playedCount, playedStart, upcomingStart }) {
  return fixtures.map((fixture, index) => {
    const played = index < playedCount
    return {
      ...fixture,
      status: played ? 'played' : 'scheduled',
      homeGoals: played ? index % 5 : null,
      awayGoals: played ? (index + 2) % 4 : null,
      playedAt: played ? Timestamp.fromMillis(playedStart + index * DAY) : null,
      scheduledAt: Timestamp.fromMillis((played ? playedStart : upcomingStart) + fixture.matchday * DAY),
    }
  })
}

function h2hPoints(matches, playerId, ids) {
  let points = 0
  for (const match of matches) {
    const home = match.homeId === playerId
    const away = match.awayId === playerId
    if (!home && !away) continue
    const opponent = home ? match.awayId : match.homeId
    if (!ids.has(opponent)) continue
    const goalsFor = home ? match.homeGoals : match.awayGoals
    const goalsAgainst = home ? match.awayGoals : match.homeGoals
    if (goalsFor > goalsAgainst) points += 3
    else if (goalsFor === goalsAgainst) points += 1
  }
  return points
}

function sortRows(rows, matches) {
  const decorated = rows.map((row) => ({ ...row }))
  decorated.sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name))
  let index = 0
  while (index < decorated.length) {
    let end = index + 1
    while (
      end < decorated.length
      && decorated[end].points === decorated[index].points
      && decorated[end].goalDiff === decorated[index].goalDiff
      && decorated[end].goalsFor === decorated[index].goalsFor
    ) {
      end += 1
    }
    if (end - index > 1) {
      const group = decorated.slice(index, end)
      const ids = new Set(group.map((row) => row.playerId))
      for (const row of group) row.h2h = h2hPoints(matches, row.playerId, ids)
      group.sort((a, b) => b.h2h - a.h2h || a.name.localeCompare(b.name))
      decorated.splice(index, group.length, ...group)
    }
    index = end
  }
  return decorated
}

function computeStandings(roster, matches) {
  const byId = new Map(roster.map((player) => [player.id, {
    playerId: player.id,
    name: player.name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
    form: [],
  }]))
  const played = matches
    .filter((match) => match.status === 'played')
    .slice()
    .sort((a, b) => a.playedAt.toMillis() - b.playedAt.toMillis())
  for (const match of played) {
    const home = byId.get(match.homeId)
    const away = byId.get(match.awayId)
    home.played += 1
    away.played += 1
    home.goalsFor += match.homeGoals
    home.goalsAgainst += match.awayGoals
    away.goalsFor += match.awayGoals
    away.goalsAgainst += match.homeGoals
    if (match.homeGoals > match.awayGoals) {
      home.won += 1
      home.points += 3
      away.lost += 1
      home.form.push('W')
      away.form.push('L')
    } else if (match.homeGoals < match.awayGoals) {
      away.won += 1
      away.points += 3
      home.lost += 1
      home.form.push('L')
      away.form.push('W')
    } else {
      home.drawn += 1
      away.drawn += 1
      home.points += 1
      away.points += 1
      home.form.push('D')
      away.form.push('D')
    }
  }
  const rows = [...byId.values()].map((row) => ({
    ...row,
    goalDiff: row.goalsFor - row.goalsAgainst,
  }))
  return sortRows(rows, played).map((row, index) => ({
    playerId: row.playerId,
    position: index + 1,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDiff: row.goalDiff,
    points: row.points,
    form: row.form.slice(-5).reverse(),
  }))
}

function matchId(seasonId, index) {
  return `${seasonId}-m${String(index + 1).padStart(2, '0')}`
}

async function commitAll(db, ops) {
  let batch = writeBatch(db)
  let count = 0
  for (const op of ops) {
    op(batch)
    count += 1
    if (count === 2) {
      await batch.commit()
      batch = writeBatch(db)
      count = 0
    }
  }
  if (count > 0) await batch.commit()
}

async function clearFirestore() {
  const response = await fetch(
    `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  )
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not clear Firestore (${response.status})`)
  }
}

async function ensureAdmin(auth) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, 'admin@fc.local', 'admin123')
    return cred.user
  } catch (error) {
    if (error.code !== 'auth/email-already-in-use') throw error
    const cred = await signInWithEmailAndPassword(auth, 'admin@fc.local', 'admin123')
    return cred.user
  }
}

async function writeAdminDoc(uid) {
  const response = await fetch(
    `http://127.0.0.1:8080/v1/projects/${PROJECT_ID}/databases/(default)/documents/admins?documentId=${uid}`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer owner',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fields: {
          createdAt: { timestampValue: new Date().toISOString() },
        },
      }),
    },
  )
  if (!response.ok) {
    throw new Error(`Could not write admins/${uid} (${response.status}) ${await response.text()}`)
  }
}

async function main() {
  const ids = players.map((player) => player.id)
  const completedFixtures = doubleRoundRobin(ids)
  const activeFixtures = singleRoundRobin(ids)
  assertRoundRobin(ids, completedFixtures, 2)
  assertRoundRobin(ids, activeFixtures, 1)

  const now = Date.now()
  const completedMatches = buildMatches(completedFixtures, {
    playedCount: completedFixtures.length,
    playedStart: now - 120 * DAY,
    upcomingStart: now - 120 * DAY,
  })
  const activeMatches = buildMatches(activeFixtures, {
    playedCount: 8,
    playedStart: now - 20 * DAY,
    upcomingStart: now + 3 * DAY,
  })
  const finalStandings = computeStandings(players, completedMatches)
  const championId = finalStandings[0].playerId
  if (finalStandings.some((row) => row.won + row.drawn + row.lost !== row.played)) {
    throw new Error('standings played total does not add up')
  }

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)

  await clearFirestore()
  const admin = await ensureAdmin(auth)
  await writeAdminDoc(admin.uid)

  await setDoc(doc(db, 'leagues', LEAGUE_ID), {
    name: 'FC League',
    emoji: '⚽',
    color: '#C5D4FF',
    activeSeasonId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  for (const player of players) {
    await setDoc(doc(db, 'leagues', LEAGUE_ID, 'players', player.id), playerDoc(player))
  }
  await setDoc(doc(db, 'leagues', LEAGUE_ID, 'seasons', 's1'), seasonDoc({
    name: 'Season 1',
    number: 1,
    participantIds: ids,
    legs: 2,
    points: { win: 3, draw: 1, loss: 0 },
    startDate: Timestamp.fromMillis(now - 130 * DAY),
  }))
  await setDoc(doc(db, 'leagues', LEAGUE_ID, 'seasons', 's2'), seasonDoc({
    name: 'Season 2',
    number: 2,
    participantIds: ids,
    legs: 1,
    points: { win: 3, draw: 1, loss: 0 },
    startDate: Timestamp.fromMillis(now - 21 * DAY),
  }))

  await commitAll(db, completedMatches.map((match, index) => (write) => {
    write.set(
      doc(db, 'leagues', LEAGUE_ID, 'seasons', 's1', 'matches', matchId('s1', index)),
      scheduledMatchDoc({
        leagueId: LEAGUE_ID,
        seasonId: 's1',
        matchday: match.matchday,
        homeId: match.homeId,
        awayId: match.awayId,
        scheduledAt: match.scheduledAt,
      }),
    )
  }))
  await commitAll(db, activeMatches.map((match, index) => (write) => {
    write.set(
      doc(db, 'leagues', LEAGUE_ID, 'seasons', 's2', 'matches', matchId('s2', index)),
      scheduledMatchDoc({
        leagueId: LEAGUE_ID,
        seasonId: 's2',
        matchday: match.matchday,
        homeId: match.homeId,
        awayId: match.awayId,
        scheduledAt: match.scheduledAt,
      }),
    )
  }))

  const activate = writeBatch(db)
  activate.update(doc(db, 'leagues', LEAGUE_ID, 'seasons', 's1'), {
    status: 'active',
    updatedAt: serverTimestamp(),
  })
  activate.update(doc(db, 'leagues', LEAGUE_ID), {
    activeSeasonId: 's1',
    updatedAt: serverTimestamp(),
  })
  await activate.commit()

  await commitAll(db, completedMatches.map((match, index) => (write) => {
    write.update(doc(db, 'leagues', LEAGUE_ID, 'seasons', 's1', 'matches', matchId('s1', index)), {
      status: 'played',
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
      playedAt: match.playedAt,
      updatedAt: serverTimestamp(),
    })
  }))

  await updateDoc(doc(db, 'leagues', LEAGUE_ID, 'seasons', 's1'), {
    status: 'completed',
    finalStandings,
    championId,
    endDate: Timestamp.fromMillis(now - 30 * DAY),
    updatedAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'leagues', LEAGUE_ID), {
    activeSeasonId: null,
    updatedAt: serverTimestamp(),
  })

  const open = writeBatch(db)
  open.update(doc(db, 'leagues', LEAGUE_ID, 'seasons', 's2'), {
    status: 'active',
    updatedAt: serverTimestamp(),
  })
  open.update(doc(db, 'leagues', LEAGUE_ID), {
    activeSeasonId: 's2',
    updatedAt: serverTimestamp(),
  })
  await open.commit()

  await commitAll(db, activeMatches.filter((match) => match.status === 'played').map((match) => (write) => {
    const index = activeMatches.indexOf(match)
    write.update(doc(db, 'leagues', LEAGUE_ID, 'seasons', 's2', 'matches', matchId('s2', index)), {
      status: 'played',
      homeGoals: match.homeGoals,
      awayGoals: match.awayGoals,
      playedAt: match.playedAt,
      updatedAt: serverTimestamp(),
    })
  }))

  console.log(`Seeded ${LEAGUE_ID} as admin@fc.local / admin123 (${admin.uid})`)
  console.log(`Season 1 completed: ${completedMatches.length} matches, champion ${championId}`)
  console.log(`Season 2 active: ${activeMatches.filter((match) => match.status === 'played').length}/${activeMatches.length} played`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
