import { useNavigate } from 'react-router'
import { useAuth } from '../../../auth/index.js'
import { useLeagueData } from '../../../hooks/index.js'
import { EmptyState, IconBall, MatchCard } from '../../../ui/index.js'
import AdminMatchAction from '../../admin/AdminMatchAction.jsx'
import { groupByDate, groupByMatchday, matchPath, sortByKickoff } from '../format.js'

function groupsFor(matches, groupBy, order) {
  if (groupBy === 'date') return groupByDate(matches, order)
  if (groupBy === 'matchday') return groupByMatchday(matches)
  return [{ key: 'all', label: null, matches: sortByKickoff(matches, order) }]
}

export function MatchList({
  matches,
  groupBy = 'date',
  order = 'asc',
  emptyTitle = 'No matches',
  emptyMessage,
}) {
  const navigate = useNavigate()
  const { playersById } = useLeagueData()
  const { isAdmin } = useAuth()

  if (!matches.length) {
    return <EmptyState icon={<IconBall />} title={emptyTitle} message={emptyMessage} />
  }

  return (
    <div className='v-stack'>
      {groupsFor(matches, groupBy, order).map((group) => (
        <div key={group.key} className='v-group'>
          {group.label ? <h3 className='v-group__label'>{group.label}</h3> : null}
          {group.matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              home={playersById[match.homeId]}
              away={playersById[match.awayId]}
              onClick={() => navigate(matchPath(match))}
              adminAction={isAdmin ? <AdminMatchAction match={match} /> : null}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
