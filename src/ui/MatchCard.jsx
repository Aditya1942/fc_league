import { ClayCard } from './ClayCard.jsx'
import { Chip } from './Chip.jsx'
import { Crest } from './Crest.jsx'
import { cn } from './cn.js'

function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value.toDate === 'function') return value.toDate()
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000)
  return null
}

function formatKickoff(value) {
  const date = toDate(value)
  if (!date) return 'Date TBC'
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function Side({ player }) {
  const name = player?.clubName || player?.name || 'TBD'
  return (
    <div className='match-side'>
      <Crest
        color={player?.color}
        emoji={player?.emoji}
        shortCode={player?.shortCode}
        size='md'
        decorative
      />
      <span className='match-side__name'>{name}</span>
      {player?.shortCode ? <span className='match-side__code'>{player.shortCode}</span> : null}
    </div>
  )
}

const STATUS_LABEL = {
  postponed: 'Postponed',
  void: 'Void',
}

export function MatchCard({ match = {}, home, away, onClick, adminAction, className }) {
  const played = match.status === 'played'
  const homeGoals = match.homeGoals ?? '–'
  const awayGoals = match.awayGoals ?? '–'
  const when = formatKickoff(match.scheduledAt || match.playedAt)
  const iso = toDate(match.scheduledAt || match.playedAt)?.toISOString()
  const statusLabel = STATUS_LABEL[match.status]
  const homeName = home?.clubName || home?.name || 'Home'
  const awayName = away?.clubName || away?.name || 'Away'
  const summary = [
    played
      ? `${homeName} ${homeGoals}, ${awayName} ${awayGoals}`
      : `${homeName} versus ${awayName}, ${when}`,
    statusLabel,
  ].filter(Boolean).join('. ')

  const body = (
    <>
      <div className='match-card__grid'>
        <Side player={home} />
        <div className='match-card__center'>
          {played ? (
            <span className='pill pill--score' aria-label={`${homeGoals} to ${awayGoals}`}>
              {`${homeGoals}\u2013${awayGoals}`}
            </span>
          ) : (
            <time className='pill pill--date' dateTime={iso}>
              {when}
            </time>
          )}
        </div>
        <Side player={away} />
      </div>
      {statusLabel ? (
        <div className='match-card__status'>
          <Chip tone={match.status}>{statusLabel}</Chip>
        </div>
      ) : null}
    </>
  )

  return (
    <ClayCard padded={false} className={cn('match-card', className)} data-status={match.status} as='article'>
      {onClick ? (
        <button type='button' className='match-card__hit' onClick={onClick} aria-label={summary}>
          {body}
        </button>
      ) : (
        <div className='match-card__hit'>{body}</div>
      )}
      {adminAction ? <div className='match-card__admin'>{adminAction}</div> : null}
    </ClayCard>
  )
}
