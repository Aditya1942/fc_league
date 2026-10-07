import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useActiveSeasonData, useLeagueData } from '../../hooks/index.js'
import {
  Chip,
  ClayButton,
  ClayCard,
  EmptyState,
  IconTrophy,
  Skeleton,
  StandingsTable,
} from '../../ui/index.js'
import { LoadingCards } from './components/LoadingCards.jsx'
import { MatchList } from './components/MatchList.jsx'
import { Section, SeeAll } from './components/Section.jsx'
import { isUpcoming, sortByKickoff } from './format.js'

function SeasonHeader({ season, matches, currentMatchday }) {
  const played = matches.filter((match) => match.status === 'played').length
  const total = matches.filter((match) => match.status !== 'void').length
  return (
    <ClayCard className='v-hero'>
      <span className='v-muted v-small'>Current season</span>
      <h2 className='v-hero__title'>{season.name ?? 'Season'}</h2>
      <div className='v-wrap'>
        <Chip tone='mint'>Live</Chip>
        {currentMatchday != null ? <Chip tone='blue'>{`Matchday ${currentMatchday}`}</Chip> : null}
        <Chip tone='lilac'>{`${played}/${total} played`}</Chip>
      </div>
    </ClayCard>
  )
}

export default function HomePage() {
  const navigate = useNavigate()
  const { league, playersById, loading: leagueLoading } = useLeagueData()
  const { season, matches, standings, currentMatchday, loading } = useActiveSeasonData()

  const upcoming = useMemo(
    () => sortByKickoff(matches.filter((match) => match.status === 'scheduled')).slice(0, 3),
    [matches],
  )
  const latest = useMemo(
    () => sortByKickoff(matches.filter((match) => match.status === 'played'), 'desc').slice(0, 3),
    [matches],
  )
  const pending = matches.filter(isUpcoming).length

  if (leagueLoading || (season && loading)) {
    return (
      <div className='v-page'>
        <Skeleton height='120px' radius='var(--radius-card)' />
        <LoadingCards count={3} />
      </div>
    )
  }

  if (!league) {
    return (
      <EmptyState
        icon={<IconTrophy />}
        title='No league yet'
        message='The admin has not set up the league. Check back soon.'
      />
    )
  }

  if (!season) {
    return (
      <EmptyState
        icon={<IconTrophy />}
        title='No active season'
        message='There is no season running right now. Past seasons live in History.'
        action={<ClayButton variant='soft' onClick={() => navigate('/history')}>Open history</ClayButton>}
      />
    )
  }

  return (
    <div className='v-page'>
      <SeasonHeader season={season} matches={matches} currentMatchday={currentMatchday} />

      <Section title='Next up' action={pending ? <SeeAll to='/matches' /> : null}>
        <MatchList
          matches={upcoming}
          groupBy='date'
          emptyTitle='No upcoming matches'
          emptyMessage='Every fixture of this season has been played.'
        />
      </Section>

      <Section title='Latest results' action={latest.length ? <SeeAll to='/matches?tab=results' /> : null}>
        <MatchList
          matches={latest}
          groupBy='date'
          order='desc'
          emptyTitle='No results yet'
          emptyMessage='Results appear here as soon as they are entered.'
        />
      </Section>

      <Section title='Top of the table' action={<SeeAll to='/table'>Full table</SeeAll>}>
        <StandingsTable
          rows={standings.slice(0, 4)}
          players={playersById}
          onRowClick={(row) => navigate(`/players/${row.playerId}`)}
        />
      </Section>
    </div>
  )
}
