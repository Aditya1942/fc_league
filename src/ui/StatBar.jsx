export function StatBar({ label, home = 0, away = 0 }) {
  const homeValue = Number(home) || 0
  const awayValue = Number(away) || 0
  const total = homeValue + awayValue
  const homePct = total === 0 ? 50 : (homeValue / total) * 100
  const awayPct = total === 0 ? 50 : (awayValue / total) * 100

  return (
    <div className='statbar'>
      <div className='statbar__label'>{label}</div>
      <div className='statbar__nums'>
        <span>{homeValue}</span>
        <span>{awayValue}</span>
      </div>
      <div
        className='statbar__track'
        role='img'
        aria-label={`${label}: ${homeValue} to ${awayValue}`}
      >
        <span className='statbar__home' style={{ width: `${homePct}%` }} />
        <span className='statbar__away' style={{ width: `${awayPct}%` }} />
      </div>
    </div>
  )
}
