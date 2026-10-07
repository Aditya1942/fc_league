import { useContext } from 'react'
import { LeagueContext } from './leagueContext.js'

export function useLeagueData() {
  const value = useContext(LeagueContext)
  if (!value) throw new Error('useLeagueData must be used within LeagueDataProvider')
  return value
}
