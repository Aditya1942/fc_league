import { useActiveSeasonData, useLeagueData } from '../../hooks/index.js'
import { Chip, EmptyState, IconUsers } from '../../ui/index.js'
import { LoadingCards } from './components/LoadingCards.jsx'
import { PlayerRow } from './components/PlayerRow.jsx'
import { Section } from './components/Section.jsx'
import { ordinal } from './format.js'

export default function PlayersPage() {
  const { players, seasons, loading } = useLeagueData()
  const { standings } = useActiveSeasonData()

  if (loading) return <LoadingCards count={5} height='72px' />
  if (!players.length) {
    return <EmptyState icon={<IconUsers />} title='No players yet' message='Players appear here once the admin adds them.' />
  }

  const rank = new Map(standings.map((row) => [row.playerId, row.position]))
  const titles = new Map()
  for (const season of seasons) {
    if (season.championId) titles.set(season.championId, (titles.get(season.championId) ?? 0) + 1)
  }
  const active = players.filter((player) => !player.archived)
  const former = players.filter((player) => player.archived)

  const row = (player) => (
    <PlayerRow
      key={player.id}
      player={player}
      to={`/players/${player.id}`}
      trailing={(
        <>
          {titles.get(player.id) ? <Chip tone='peach'>{`🏆 ${titles.get(player.id)}`}</Chip> : null}
          {rank.has(player.id) ? <Chip tone='blue'>{ordinal(rank.get(player.id))}</Chip> : null}
        </>
      )}
    />
  )

  return (
    <div className='v-page'>
      <Section title={`Clubs (${active.length})`}>
        <div className='v-stack'>{active.map(row)}</div>
      </Section>
      {former.length ? (
        <Section title='Former clubs'>
          <div className='v-stack'>{former.map(row)}</div>
        </Section>
      ) : null}
    </div>
  )
}
