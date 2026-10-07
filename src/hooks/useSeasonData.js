import { useMemo } from 'react'
import { useSeasonMatches } from '../data/index.js'
import { currentMatchday } from '../engine/index.js'
import { seasonStandings } from './standings.js'
import { useLeagueData } from './useLeagueData.js'

export function useSeasonData(seasonId, { venue = 'all' } = {}) {
  const { leagueId, seasons, names, loading: leagueLoading, error: leagueError } = useLeagueData()
  const season = seasons.find((item) => item.id === seasonId) ?? null
  const matchesState = useSeasonMatches(leagueId, season ? seasonId : undefined)
  const matches = matchesState.data

  const standings = useMemo(
    () => seasonStandings(season, matches, names, venue),
    [season, matches, names, venue],
  )
  const focusMatchday = useMemo(() => currentMatchday(matches), [matches])
  const matchdays = useMemo(
    () => [...new Set(matches.map((match) => match.matchday).filter(Number.isFinite))].sort((a, b) => a - b),
    [matches],
  )

  return {
    season,
    matches,
    standings,
    matchdays,
    currentMatchday: focusMatchday,
    loading: leagueLoading || matchesState.loading,
    error: leagueError || matchesState.error,
  }
}

export function useActiveSeasonData(options) {
  const { league } = useLeagueData()
  return useSeasonData(league?.activeSeasonId ?? undefined, options)
}
