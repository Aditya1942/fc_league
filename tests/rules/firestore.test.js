import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { leagueDoc, playerDoc, scheduledMatchDoc, seasonDoc } from '../../src/data/documents.js'

const PROJECT_ID = 'fc-league-26061'
const ADMIN_ID = 'admin-1'
const VIEWER_ID = 'viewer-1'
const START = Timestamp.fromDate(new Date('2026-01-04T00:00:00Z'))

let testEnv

function dbOf(context) {
  return context.firestore()
}

async function grantAdmin(uid) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(dbOf(context), 'admins', uid), {
      createdAt: serverTimestamp(),
    })
  })
}

async function seedDraft() {
  await grantAdmin(ADMIN_ID)
  const db = dbOf(testEnv.authenticatedContext(ADMIN_ID))
  await assertSucceeds(setDoc(doc(db, 'leagues/lg'), leagueDoc({
    name: 'FC League',
    emoji: '⚽',
    color: '#C5D4FF',
  })))
  await assertSucceeds(setDoc(doc(db, 'leagues/lg/players/p1'), playerDoc({
    name: 'Ada',
    clubName: 'Northside',
    shortCode: 'NOR',
    color: '#C5D4FF',
    emoji: '🦁',
  })))
  await assertSucceeds(setDoc(doc(db, 'leagues/lg/players/p2'), playerDoc({
    name: 'Bea',
    clubName: 'River End',
    shortCode: 'RIV',
    color: '#F6C6D0',
    emoji: '🐯',
  })))
  await assertSucceeds(setDoc(doc(db, 'leagues/lg/seasons/s1'), seasonDoc({
    name: 'Season 1',
    number: 1,
    participantIds: ['p1', 'p2'],
    legs: 1,
    points: { win: 3, draw: 1, loss: 0 },
    startDate: START,
  })))
  return db
}

function scheduled() {
  return scheduledMatchDoc({
    leagueId: 'lg',
    seasonId: 's1',
    matchday: 1,
    homeId: 'p1',
    awayId: 'p2',
  })
}

function standing(row) {
  return {
    playerId: row.playerId,
    position: row.position,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goalsFor,
    goalsAgainst: row.goalsAgainst,
    goalDiff: row.goalsFor - row.goalsAgainst,
    points: row.points,
    form: row.form,
  }
}

describe('firestore rules', () => {
  beforeAll(async () => {
    const rulesPath = join(dirname(fileURLToPath(import.meta.url)), '../../firestore.rules')
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(rulesPath, 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    })
  }, 30000)

  afterAll(async () => {
    if (testEnv) await testEnv.cleanup()
  })

  beforeEach(async () => {
    await testEnv.clearFirestore()
  })

  it('lets anyone read leagues, players, seasons, and matches', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = dbOf(context)
      await setDoc(doc(db, 'admins/admin-1'), { createdAt: Timestamp.now() })
      await setDoc(doc(db, 'leagues/lg'), {
        name: 'FC League',
        emoji: '⚽',
        color: '#C5D4FF',
        activeSeasonId: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      await setDoc(doc(db, 'leagues/lg/players/p1'), {
        name: 'Ada',
        clubName: 'Northside',
        shortCode: 'NOR',
        color: '#C5D4FF',
        emoji: '🦁',
        archived: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      await setDoc(doc(db, 'leagues/lg/seasons/s1'), {
        name: 'Season 1',
        number: 1,
        status: 'active',
        participantIds: ['p1', 'p2'],
        legs: 1,
        points: { win: 3, draw: 1, loss: 0 },
        startDate: START,
        endDate: null,
        championId: null,
        finalStandings: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
      await setDoc(doc(db, 'leagues/lg/seasons/s1/matches/m1'), {
        leagueId: 'lg',
        seasonId: 's1',
        matchday: 1,
        homeId: 'p1',
        awayId: 'p2',
        playerIds: ['p1', 'p2'],
        status: 'scheduled',
        homeGoals: null,
        awayGoals: null,
        scheduledAt: null,
        playedAt: null,
        details: null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    })

    const anon = dbOf(testEnv.unauthenticatedContext())
    expect((await getDoc(doc(anon, 'leagues/lg'))).exists()).toBe(true)
    expect((await getDoc(doc(anon, 'leagues/lg/players/p1'))).exists()).toBe(true)
    expect((await getDoc(doc(anon, 'leagues/lg/seasons/s1'))).exists()).toBe(true)
    expect((await getDoc(doc(anon, 'leagues/lg/seasons/s1/matches/m1'))).exists()).toBe(true)

    const viewer = dbOf(testEnv.authenticatedContext(VIEWER_ID))
    expect((await getDoc(doc(viewer, 'leagues/lg'))).exists()).toBe(true)

    const byPlayer = await getDocs(query(
      collectionGroup(anon, 'matches'),
      where('playerIds', 'array-contains', 'p1'),
      orderBy('playedAt', 'desc'),
    ))
    expect(byPlayer.size).toBe(1)

    const byLeague = await getDocs(query(
      collectionGroup(anon, 'matches'),
      where('leagueId', '==', 'lg'),
      orderBy('playedAt', 'desc'),
    ))
    expect(byLeague.size).toBe(1)
  })

  it('denies anonymous and non-admin writes', async () => {
    const payload = leagueDoc({ name: 'FC League', emoji: '⚽', color: '#C5D4FF' })
    const anon = dbOf(testEnv.unauthenticatedContext())
    const viewer = dbOf(testEnv.authenticatedContext(VIEWER_ID))
    await assertFails(setDoc(doc(anon, 'leagues/lg'), payload))
    await assertFails(setDoc(doc(viewer, 'leagues/lg'), payload))
    await assertFails(setDoc(doc(viewer, 'leagues/lg/players/p1'), playerDoc({
      name: 'Ada',
      clubName: 'Northside',
      shortCode: 'NOR',
      color: '#C5D4FF',
      emoji: '🦁',
    })))
  })

  it('keeps admins readable only by that uid and not client-writable', async () => {
    await grantAdmin(ADMIN_ID)
    const admin = dbOf(testEnv.authenticatedContext(ADMIN_ID))
    const viewer = dbOf(testEnv.authenticatedContext(VIEWER_ID))
    const anon = dbOf(testEnv.unauthenticatedContext())

    expect((await getDoc(doc(admin, 'admins', ADMIN_ID))).exists()).toBe(true)
    await assertFails(getDoc(doc(viewer, 'admins', ADMIN_ID)))
    await assertFails(getDoc(doc(anon, 'admins', ADMIN_ID)))
    await assertFails(getDocs(collection(admin, 'admins')))
    await assertFails(setDoc(doc(admin, 'admins', ADMIN_ID), { createdAt: serverTimestamp() }))
    await assertFails(setDoc(doc(viewer, 'admins', VIEWER_ID), { createdAt: serverTimestamp() }))
    await assertFails(updateDoc(doc(admin, 'admins', ADMIN_ID), { createdAt: serverTimestamp() }))
    await assertFails(deleteDoc(doc(admin, 'admins', ADMIN_ID)))
  })

  it('lets an admin create a league, player, season, and match', async () => {
    const db = await seedDraft()
    await assertSucceeds(setDoc(doc(db, 'leagues/lg/seasons/s1/matches/m1'), scheduled()))
    await assertSucceeds(updateDoc(doc(db, 'leagues/lg'), {
      name: 'Friends League',
      updatedAt: serverTimestamp(),
    }))
  })

  it('rejects client timestamps and unknown fields', async () => {
    await grantAdmin(ADMIN_ID)
    const db = dbOf(testEnv.authenticatedContext(ADMIN_ID))
    const past = Timestamp.fromDate(new Date('2024-01-01T00:00:00Z'))
    await assertFails(setDoc(doc(db, 'leagues/lg'), {
      ...leagueDoc({ name: 'FC League', emoji: '⚽', color: '#C5D4FF' }),
      createdAt: past,
      updatedAt: past,
    }))
    await assertFails(setDoc(doc(db, 'leagues/lg'), {
      ...leagueDoc({ name: 'FC League', emoji: '⚽', color: '#C5D4FF' }),
      extra: 'no',
    }))
  })

  it('rejects the same player on both sides, bad scores, and goals before the match is played', async () => {
    const db = await seedDraft()
    await assertFails(setDoc(doc(db, 'leagues/lg/seasons/s1/matches/bad'), scheduledMatchDoc({
      leagueId: 'lg',
      seasonId: 's1',
      matchday: 1,
      homeId: 'p1',
      awayId: 'p1',
    })))
    await assertFails(setDoc(doc(db, 'leagues/lg/seasons/s1/matches/scored'), {
      ...scheduled(),
      homeGoals: 1,
      awayGoals: 0,
    }))
    await assertSucceeds(setDoc(doc(db, 'leagues/lg/seasons/s1/matches/m1'), scheduled()))
    await assertFails(updateDoc(doc(db, 'leagues/lg/seasons/s1/matches/m1'), {
      homeGoals: 2,
      awayGoals: 1,
      updatedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(doc(db, 'leagues/lg/seasons/s1/matches/m1'), {
      status: 'played',
      homeGoals: 100,
      awayGoals: 0,
      playedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(doc(db, 'leagues/lg/seasons/s1/matches/m1'), {
      status: 'played',
      homeGoals: -1,
      awayGoals: 0,
      playedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(doc(db, 'leagues/lg/seasons/s1/matches/m1'), {
      status: 'played',
      homeGoals: 1.5,
      awayGoals: 0,
      playedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(doc(db, 'leagues/lg/seasons/s1/matches/m1'), {
      status: 'played',
      homeGoals: '2',
      awayGoals: 0,
      playedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
  })

  it('activates, records a result, completes, and reopens a season', async () => {
    const db = await seedDraft()
    const matchRef = doc(db, 'leagues/lg/seasons/s1/matches/m1')
    await assertSucceeds(setDoc(matchRef, scheduled()))
    await assertSucceeds(deleteDoc(matchRef))
    await assertSucceeds(setDoc(matchRef, scheduled()))

    const activate = writeBatch(db)
    activate.update(doc(db, 'leagues/lg/seasons/s1'), {
      status: 'active',
      updatedAt: serverTimestamp(),
    })
    activate.update(doc(db, 'leagues/lg'), {
      activeSeasonId: 's1',
      updatedAt: serverTimestamp(),
    })
    await assertSucceeds(activate.commit())
    await assertFails(deleteDoc(matchRef))

    await assertSucceeds(setDoc(doc(db, 'leagues/lg/seasons/s2'), seasonDoc({
      name: 'Season 2',
      number: 2,
      participantIds: ['p1', 'p2'],
      startDate: START,
    })))
    const steal = writeBatch(db)
    steal.update(doc(db, 'leagues/lg/seasons/s2'), {
      status: 'active',
      updatedAt: serverTimestamp(),
    })
    steal.update(doc(db, 'leagues/lg'), {
      activeSeasonId: 's2',
      updatedAt: serverTimestamp(),
    })
    await assertFails(steal.commit())

    await assertSucceeds(updateDoc(matchRef, {
      status: 'played',
      homeGoals: 2,
      awayGoals: 0,
      playedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))

    const finalStandings = [
      standing({
        playerId: 'p1',
        position: 1,
        played: 1,
        won: 1,
        drawn: 0,
        lost: 0,
        goalsFor: 2,
        goalsAgainst: 0,
        points: 3,
        form: ['W'],
      }),
      standing({
        playerId: 'p2',
        position: 2,
        played: 1,
        won: 0,
        drawn: 0,
        lost: 1,
        goalsFor: 0,
        goalsAgainst: 2,
        points: 0,
        form: ['L'],
      }),
    ]
    const completedPatch = () => ({
      status: 'completed',
      championId: 'p1',
      finalStandings,
      endDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await assertSucceeds(updateDoc(doc(db, 'leagues/lg/seasons/s1'), completedPatch()))
    await assertSucceeds(updateDoc(doc(db, 'leagues/lg'), {
      activeSeasonId: null,
      updatedAt: serverTimestamp(),
    }))
    await assertFails(updateDoc(matchRef, {
      homeGoals: 3,
      updatedAt: serverTimestamp(),
    }))

    const reopen = writeBatch(db)
    reopen.update(doc(db, 'leagues/lg/seasons/s1'), {
      status: 'active',
      championId: null,
      finalStandings: null,
      endDate: null,
      updatedAt: serverTimestamp(),
    })
    reopen.update(doc(db, 'leagues/lg'), {
      activeSeasonId: 's1',
      updatedAt: serverTimestamp(),
    })
    await assertSucceeds(reopen.commit())
  }, 20000)

  it('completes a six-player season', async () => {
    await grantAdmin(ADMIN_ID)
    const db = dbOf(testEnv.authenticatedContext(ADMIN_ID))
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
    await assertSucceeds(setDoc(doc(db, 'leagues/lg'), leagueDoc({
      name: 'FC League',
      emoji: '⚽',
      color: '#C5D4FF',
    })))
    for (const [index, id] of ids.entries()) {
      await assertSucceeds(setDoc(doc(db, `leagues/lg/players/${id}`), playerDoc({
        name: `Player ${index + 1}`,
        clubName: `Club ${index + 1}`,
        shortCode: `C${index}`,
        color: '#C5D4FF',
        emoji: '⚽',
      })))
    }
    await assertSucceeds(setDoc(doc(db, 'leagues/lg/seasons/s1'), seasonDoc({
      name: 'Season 1',
      number: 1,
      participantIds: ids,
      legs: 2,
      startDate: START,
    })))
    const activate = writeBatch(db)
    activate.update(doc(db, 'leagues/lg/seasons/s1'), {
      status: 'active',
      updatedAt: serverTimestamp(),
    })
    activate.update(doc(db, 'leagues/lg'), {
      activeSeasonId: 's1',
      updatedAt: serverTimestamp(),
    })
    await assertSucceeds(activate.commit())
    const finalStandings = ids.map((playerId, index) => standing({
      playerId,
      position: index + 1,
      played: index === 0 ? 1 : 0,
      won: index === 0 ? 1 : 0,
      drawn: 0,
      lost: 0,
      goalsFor: index === 0 ? 1 : 0,
      goalsAgainst: 0,
      points: index === 0 ? 3 : 0,
      form: index === 0 ? ['W'] : [],
    }))
    await assertSucceeds(updateDoc(doc(db, 'leagues/lg/seasons/s1'), {
      status: 'completed',
      championId: 'p1',
      finalStandings,
      endDate: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
    await assertSucceeds(updateDoc(doc(db, 'leagues/lg'), {
      activeSeasonId: null,
      updatedAt: serverTimestamp(),
    }))
  }, 20000)
})
