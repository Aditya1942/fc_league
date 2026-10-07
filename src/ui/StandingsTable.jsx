import { Crest } from './Crest.jsx'
import { FormChips } from './FormChips.jsx'

const COLUMNS = [
  { key: 'played', label: 'P', title: 'Played' },
  { key: 'won', label: 'W', title: 'Won' },
  { key: 'drawn', label: 'D', title: 'Drawn' },
  { key: 'lost', label: 'L', title: 'Lost' },
  { key: 'goalsFor', label: 'GF', title: 'Goals for' },
  { key: 'goalsAgainst', label: 'GA', title: 'Goals against' },
  { key: 'goalDiff', label: 'GD', title: 'Goal difference' },
  { key: 'points', label: 'Pts', title: 'Points' },
]

function zoneColor(zone) {
  if (!zone) return undefined
  if (zone.color) return zone.color
  if (zone.tone === 'last' || zone.id === 'last') return 'var(--zone-last)'
  return 'var(--zone-champion)'
}

function zoneFor(row, zones) {
  return (zones || []).find((zone) => {
    if (zone.positions?.includes(row.position)) return true
    if (zone.playerIds?.includes(row.playerId)) return true
    return false
  }) || null
}

function formatDiff(value) {
  const number = Number(value) || 0
  if (number > 0) return `+${number}`
  return String(number)
}

export function StandingsTable({ rows = [], players = {}, zones = [], onRowClick }) {
  const columnCount = COLUMNS.length + 3

  const onKeyDown = (event, row) => {
    if (!onRowClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowClick(row)
    }
  }

  return (
    <div className='standings'>
      <div className='standings__scroll' tabIndex={0} role='region' aria-label='League table. Position and club stay put. Swipe sideways for the other stats.'>
        <table>
          <caption className='visually-hidden'>League standings</caption>
          <thead>
            <tr>
              <th className='is-pin is-pin-pos' scope='col'>#</th>
              <th className='is-pin is-pin-club' scope='col'>Club</th>
              {COLUMNS.map((column) => (
                <th key={column.key} scope='col' title={column.title} className={column.key === 'points' ? 'standings__pts' : undefined}>
                  {column.label}
                </th>
              ))}
              <th scope='col' title='Last five results'>Form</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className='standings__empty' colSpan={columnCount}>No matches played yet</td>
              </tr>
            ) : rows.map((row) => {
              const player = players[row.playerId] || {}
              const zone = zoneFor(row, zones)
              const club = player.clubName || player.name || row.playerId
              return (
                <tr
                  key={row.playerId}
                  data-zone={zone ? zone.label : undefined}
                  style={zone ? { '--zone': zoneColor(zone) } : undefined}
                  className={onRowClick ? 'is-clickable' : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={(event) => onKeyDown(event, row)}
                >
                  <td className='is-pin is-pin-pos'>{row.position}</td>
                  <td className='is-pin is-pin-club'>
                    <span className='standings__club'>
                      <Crest
                        color={player.color}
                        emoji={player.emoji}
                        shortCode={player.shortCode}
                        size='sm'
                        decorative
                      />
                      <span className='standings__names'>
                        <span className='standings__club-name'>{club}</span>
                        {player.name && player.clubName ? (
                          <span className='standings__player-name'>{player.name}</span>
                        ) : null}
                      </span>
                    </span>
                  </td>
                  {COLUMNS.map((column) => {
                    const raw = row[column.key]
                    const text = column.key === 'goalDiff' ? formatDiff(raw) : raw
                    const diffClass = column.key === 'goalDiff'
                      ? (Number(raw) > 0 ? 'is-plus' : Number(raw) < 0 ? 'is-minus' : undefined)
                      : undefined
                    return (
                      <td
                        key={column.key}
                        className={[column.key === 'points' ? 'standings__pts' : '', diffClass].filter(Boolean).join(' ') || undefined}
                      >
                        {text}
                      </td>
                    )
                  })}
                  <td>
                    <FormChips form={row.form || []} label={`Form for ${club}`} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {zones.length > 0 ? (
        <ul className='legend' aria-label='Table zones'>
          {zones.map((zone) => (
            <li key={zone.label}>
              <span className='legend__swatch' style={{ background: zoneColor(zone) }} aria-hidden='true' />
              {zone.label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
