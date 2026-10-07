import { Link } from 'react-router'
import { ClayCard, Crest, IconChevronRight } from '../../../ui/index.js'
import { clubName } from '../format.js'

export function PlayerBadge({ player, size = 'sm', sub }) {
  return (
    <span className='v-player'>
      <Crest
        color={player?.color}
        emoji={player?.emoji}
        shortCode={player?.shortCode}
        size={size}
        decorative
      />
      <span className='v-player__names'>
        <span className='v-player__club'>{clubName(player)}</span>
        {sub ?? (player?.name ? <span className='v-muted v-small'>{player.name}</span> : null)}
      </span>
    </span>
  )
}

export function PlayerRow({ player, to, trailing, sub }) {
  return (
    <ClayCard as={Link} to={to} className='v-row-link'>
      <PlayerBadge player={player} sub={sub} />
      <span className='v-row-link__end'>
        {trailing}
        <IconChevronRight />
      </span>
    </ClayCard>
  )
}
