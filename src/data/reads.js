import { useEffect, useRef, useState } from 'react'
import {
  collection,
  collectionGroup,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { db } from '../lib/firebase.js'

const EMPTY_LIST = []

function withId(snap) {
  return { id: snap.id, ...snap.data() }
}

function keyOf(...parts) {
  if (parts.some((part) => part == null || part === '')) return ''
  return parts.join('/')
}

function useSnapshot(queryKey, empty, subscribe) {
  const subscribeRef = useRef(subscribe)
  const [state, setState] = useState(() => ({
    data: empty,
    loading: queryKey !== '',
    error: null,
  }))
  const [seenKey, setSeenKey] = useState(queryKey)

  if (seenKey !== queryKey) {
    setSeenKey(queryKey)
    setState({
      data: empty,
      loading: queryKey !== '',
      error: null,
    })
  }

  useEffect(() => {
    subscribeRef.current = subscribe
  })

  useEffect(() => {
    if (queryKey === '') return undefined
    let active = true
    const unsubscribe = subscribeRef.current(
      (data) => {
        if (active) setState({ data, loading: false, error: null })
      },
      (error) => {
        if (active) setState({ data: empty, loading: false, error })
      },
    )
    return () => {
      active = false
      unsubscribe()
    }
  }, [queryKey, empty])

  return state
}

export function useLeague() {
  return useSnapshot('leagues', null, (onData, onError) => onSnapshot(
    query(collection(db, 'leagues'), orderBy('createdAt', 'asc'), limit(1)),
    (snap) => onData(snap.docs[0] ? withId(snap.docs[0]) : null),
    onError,
  ))
}

export function usePlayers(leagueId) {
  return useSnapshot(keyOf(leagueId), EMPTY_LIST, (onData, onError) => onSnapshot(
    query(collection(db, 'leagues', leagueId, 'players'), orderBy('name', 'asc')),
    (snap) => onData(snap.docs.map(withId)),
    onError,
  ))
}

export function useSeasons(leagueId) {
  return useSnapshot(keyOf(leagueId), EMPTY_LIST, (onData, onError) => onSnapshot(
    query(collection(db, 'leagues', leagueId, 'seasons'), orderBy('number', 'desc')),
    (snap) => onData(snap.docs.map(withId)),
    onError,
  ))
}

export function useSeason(leagueId, seasonId) {
  return useSnapshot(keyOf(leagueId, seasonId), null, (onData, onError) => onSnapshot(
    doc(db, 'leagues', leagueId, 'seasons', seasonId),
    (snap) => onData(snap.exists() ? withId(snap) : null),
    onError,
  ))
}

export function useSeasonMatches(leagueId, seasonId) {
  return useSnapshot(keyOf(leagueId, seasonId), EMPTY_LIST, (onData, onError) => onSnapshot(
    query(
      collection(db, 'leagues', leagueId, 'seasons', seasonId, 'matches'),
      orderBy('matchday', 'asc'),
    ),
    (snap) => onData(snap.docs.map(withId)),
    onError,
  ))
}

export function useMatch(leagueId, seasonId, matchId) {
  return useSnapshot(keyOf(leagueId, seasonId, matchId), null, (onData, onError) => onSnapshot(
    doc(db, 'leagues', leagueId, 'seasons', seasonId, 'matches', matchId),
    (snap) => onData(snap.exists() ? withId(snap) : null),
    onError,
  ))
}

export function usePlayerMatches(playerId) {
  return useSnapshot(keyOf(playerId), EMPTY_LIST, (onData, onError) => onSnapshot(
    query(
      collectionGroup(db, 'matches'),
      where('playerIds', 'array-contains', playerId),
      orderBy('playedAt', 'desc'),
    ),
    (snap) => onData(snap.docs.map(withId)),
    onError,
  ))
}

export function useAllMatches(leagueId) {
  return useSnapshot(keyOf(leagueId), EMPTY_LIST, (onData, onError) => onSnapshot(
    query(
      collectionGroup(db, 'matches'),
      where('leagueId', '==', leagueId),
      orderBy('playedAt', 'desc'),
    ),
    (snap) => onData(snap.docs.map(withId)),
    onError,
  ))
}
