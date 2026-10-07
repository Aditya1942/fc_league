import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { usePlayerMatches } from '../../data/index.js'
import { playerCareer } from '../../engine/index.js'
import { useActiveSeasonData, useLeagueData } from '../../hooks/index.js'
import {
  Chip,
  ClayButton,
  ClayCard,
  Crest,
  EmptyState,
  FormChips,
  IconChevronRight,
  IconUsers,
  Skeleton,
} from '../../ui/index.js'
import { LoadingCards } from './components/LoadingCards.jsx'
import { MatchList } from './components/MatchList.jsx'
import { Section } from './components/Section.jsx'
import { StatGrid } from './components/StatGrid.jsx'
import { clubName, matchPath, ordinal, signed, sortByKickoff } from './format.js'

function CurrentSeason({ season, row }) {
  if (!season || !row) return null
  return (
    <Section title={season.name ?? 'Current season'}>
      <ClayCard className='v-stack'>
        <div className='v-row'>
          <span>
            <strong>{ordinal(row.position)}</strong>
            <span className='v-muted'>{` · ${row.points} pts`}</span>
          </span>
          <FormChips form={row.form ?? []} />
        </div>
        <StatGrid
          items={[
            { label: 'P', value: row.played },
            { label: 'W', value: row.won },
            { label: 'D', value: row.drawn },
            { label: 'L', value: row.lost },
            { label: 'GF', value: row.goalsFor },
            { label: 'GA', value: row.goalsAgainst },
            { label: 'GD', value: signed(row.goalDiff) },
            { label: 'Pts', value: row.points },
          ]}
        />
      </ClayCard>
    </Section>
  )
}

function Finishes({ finishes, activeSeasonId }) {
  if (!finishes.length) return null
  return (
    <Section title='Season by season'>
      <div className='v-stack'>
        {[...finishes].reverse().map((finish) => (
          <ClayCard
            key={finish.seasonId}
            as={Link}
            to={finish.seasonId === activeSeasonId ? `/table?season=${finish.seasonId}` : `/history/${finish.seasonId}`}
            className='v-row-link'
          >
            <span className='v-player__names'>
              <strong>{finish.name ?? 'Season'}</strong>
              <span className='v-muted v-small'>
                {`${finish.played} played · ${finish.points} pts · GD ${signed(finish.goalDiff)}`}
              </span>
            </span>
            <span className='v-row-link__end'>
              {finish.title ? <Chip tone='peach'>🏆 Champion</Chip> : null}
              {finish.status === 'active' ? <Chip tone='mint'>Live</Chip> : null}
              <Chip tone='blue'>{ordinal(finish.position)}</Chip>
              <IconChevronRight />
            </span>
          </ClayCard>
        ))}
      </div>
    </Section>
  )
}

function Records({ career, playersById }) {
  const win = career.biggestWin
  return (
    <Section title='Records'>
      <ClayCard>
        <ul className='v-list'>
          <li className='v-list__item'>
            <span className='v-muted'>Biggest win</span>
            {win ? (
              <Link to={matchPath({ seasonId: win.seasonId, id: win.matchId })}>
                <strong>{`${win.goalsFor}–${win.goalsAgainst} vs ${playersById[win.opponentId]?.shortCode ?? clubName(playersById[win.opponentId])}`}</strong>
              </Link>
            ) : <strong>–</strong>}
          </li>
          <li className='v-list__item'>
            <span className='v-muted'>Longest winning streak</span>
            <strong>{career.longestWinStreak}</strong>
          </li>
          <li className='v-list__item'>
            <span className='v-muted'>Longest unbeaten run</span>
            <strong>{career.longestUnbeatenStreak}</strong>
          </li>
        </ul>
      </ClayCard>
    </Section>
  )
}

export default function PlayerPage() {
  const { playerId } = useParams()
  const navigate = useNavigate()
  const { league, players, playersById, seasons, names, loading } = useLeagueData()
  const history = usePlayerMatches(playerId)
  const active = useActiveSeasonData()
  const player = playersById[playerId]

  const visibleSeasons = useMemo(() => seasons.filter((season) => season.status !== 'draft'), [seasons])
  const matches = useMemo(() => {
    const ids = new Set(visibleSeasons.map((season) => season.id))
    return history.data.filter((match) => ids.has(match.seasonId))
  }, [history.data, visibleSeasons])
  const career = useMemo(
    () => playerCareer(matches, visibleSeasons, playerId, names),
    [matches, visibleSeasons, playerId, names],
  )
  const upcoming = useMemo(
    () => sortByKickoff(matches.filter((match) => match.status === 'scheduled' || match.status === 'postponed')).slice(0, 5),
    [matches],
  )
  const recent = useMemo(
    () => sortByKickoff(matches.filter((match) => match.status === 'played'), 'desc').slice(0, 5),
    [matches],
  )

  if (loading) {
    return (
      <div className='v-page'>
        <Skeleton height='140px' radius='var(--radius-card)' />
        <LoadingCards count={3} />
      </div>
    )
  }

  if (!player) {
    return <EmptyState icon={<IconUsers />} title='Player not found' message='This player does not exist in the league.' />
  }

  const currentRow = active.standings.find((row) => row.playerId === playerId)
  const rival = players.find((other) => other.id !== playerId && !other.archived)

  return (
    <div className='v-page'>
      <ClayCard className='v-hero v-hero__center'>
        <Crest color={player.color} emoji={player.emoji} shortCode={player.shortCode} size='lg' label={clubName(player)} />
        <h2 className='v-hero__title'>{clubName(player)}</h2>
        <span className='v-muted'>{player.name}</span>
        <div className='v-wrap'>
          {player.shortCode ? <Chip tone='lilac'>{player.shortCode}</Chip> : null}
          {career.titles ? <Chip tone='peach'>{`🏆 ${career.titles} title${career.titles === 1 ? '' : 's'}`}</Chip> : null}
          {player.archived ? <Chip tone='void'>Former club</Chip> : null}
        </div>
        <ClayButton
          variant='soft'
          size='sm'
          onClick={() => navigate(`/h2h?a=${playerId}${rival ? `&b=${rival.id}` : ''}`)}
        >
          Compare head to head
        </ClayButton>
      </ClayCard>

      <CurrentSeason season={league?.activeSeasonId ? active.season : null} row={currentRow} />

      {history.loading ? <LoadingCards count={2} /> : (
        <>
          <Section title='All-time'>
            <ClayCard>
              <StatGrid
                items={[
                  { label: 'Seasons', value: career.seasonsPlayed },
                  { label: 'Titles', value: career.titles },
                  { label: 'Played', value: career.played },
                  { label: 'Win %', value: `${career.winPct}%` },
                  { label: 'W', value: career.won },
                  { label: 'D', value: career.drawn },
                  { label: 'L', value: career.lost },
                  { label: 'Pts', value: career.points },
                  { label: 'GF', value: career.goalsFor },
                  { label: 'GA', value: career.goalsAgainst },
                  { label: 'GD', value: signed(career.goalDiff) },
                ]}
              />
            </ClayCard>
          </Section>

          <Records career={career} playersById={playersById} />
          <Finishes
            finishes={career.finishes.map((finish) => (
              finish.seasonId === league?.activeSeasonId && currentRow
                ? { ...finish, position: currentRow.position }
                : finish
            ))}
            activeSeasonId={league?.activeSeasonId}
          />

          <Section title='Upcoming'>
            <MatchList matches={upcoming} emptyTitle='No upcoming matches' />
          </Section>
          <Section title='Recent results'>
            <MatchList matches={recent} order='desc' emptyTitle='No results yet' />
          </Section>
        </>
      )}
    </div>
  )
}
