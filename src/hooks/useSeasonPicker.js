import { useMemo } from 'react'
import { useAuth } from '../auth/index.js'
import { useLeagueData } from './useLeagueData.js'
import { useQueryParam } from './useQueryParam.js'

const STATUS_SUFFIX = {
  active: ' · Live',
  draft: ' · Draft',
}

export function useSeasonPicker() {
  const { league, seasons } = useLeagueData()
  const { isAdmin } = useAuth()
  const [param, setSeasonId] = useQueryParam('season')

  const visible = useMemo(
    () => seasons.filter((season) => isAdmin || season.status !== 'draft'),
    [seasons, isAdmin],
  )
  const fallback = league?.activeSeasonId || visible[0]?.id || ''
  const seasonId = visible.some((season) => season.id === param) ? param : fallback

  const options = useMemo(
    () => visible.map((season) => ({
      value: season.id,
      label: `${season.name ?? 'Season'}${STATUS_SUFFIX[season.status] ?? ''}`,
    })),
    [visible],
  )

  return { seasonId, setSeasonId, options }
}
