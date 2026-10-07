import { useMemo } from 'react'
import { useLeague, usePlayers, useSeasons } from '../data/index.js'
import { LeagueContext } from '../hooks/leagueContext.js'

export function LeagueDataProvider({ children }) {
  const league = useLeague()
  const leagueId = league.data?.id
  const players = usePlayers(leagueId)
  const seasons = useSeasons(leagueId)

  const value = useMemo(() => {
    const playersById = Object.fromEntries(players.data.map((player) => [player.id, player]))
    const names = Object.fromEntries(players.data.map((player) => [player.id, player.name ?? '']))
    const activeSeasonId = league.data?.activeSeasonId ?? null
    return {
      league: league.data,
      leagueId,
      players: players.data,
      playersById,
      names,
      seasons: seasons.data,
      activeSeason: seasons.data.find((season) => season.id === activeSeasonId) ?? null,
      loading: league.loading || players.loading || seasons.loading,
      error: league.error || players.error || seasons.error,
    }
  }, [league, leagueId, players, seasons])

  return <LeagueContext.Provider value={value}>{children}</LeagueContext.Provider>
}
