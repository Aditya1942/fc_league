import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import '../index.css'
import './showcase.css'
import {
  BottomNav,
  Chip,
  ClayButton,
  ClayCard,
  Crest,
  EmptyState,
  Field,
  FormChips,
  IconBack,
  IconBall,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconEdit,
  IconHistory,
  IconHome,
  IconLogout,
  IconPlus,
  IconSettings,
  IconTable,
  IconTrash,
  IconTrophy,
  IconUsers,
  Input,
  MatchCard,
  MatchdayRail,
  ScoreStepper,
  SegmentedTabs,
  Select,
  Sheet,
  Skeleton,
  Spinner,
  StandingsTable,
  StatBar,
  Toast,
  TopBar,
  IconButton,
} from './index.js'

const players = {
  p1: { name: 'Asha', clubName: 'Blue Herons', shortCode: 'HER', color: '#C5D4FF', emoji: '🐦' },
  p2: { name: 'Rohan', clubName: 'Pink Comets', shortCode: 'COM', color: '#F6C6D0', emoji: '☄️' },
  p3: { name: 'Mia', clubName: 'Mint Foxes', shortCode: 'FOX', color: '#BFE6D0', emoji: '🦊' },
}

const rows = [
  { playerId: 'p1', position: 1, played: 4, won: 3, drawn: 1, lost: 0, goalsFor: 9, goalsAgainst: 3, goalDiff: 6, points: 10, form: ['W', 'W', 'D', 'W', 'W'] },
  { playerId: 'p3', position: 2, played: 4, won: 2, drawn: 0, lost: 2, goalsFor: 6, goalsAgainst: 6, goalDiff: 0, points: 6, form: ['L', 'W', 'L', 'W'] },
  { playerId: 'p2', position: 3, played: 4, won: 0, drawn: 1, lost: 3, goalsFor: 2, goalsAgainst: 8, goalDiff: -6, points: 1, form: ['L', 'L', 'D', 'L'] },
]

const zones = [
  { label: 'Champion', positions: [1], tone: 'champion' },
  { label: 'Last place', positions: [3], tone: 'last' },
]

const nav = [
  { to: '/', label: 'Home', icon: <IconHome /> },
  { to: '/matches', label: 'Matches', icon: <IconBall /> },
  { to: '/table', label: 'Table', icon: <IconTable /> },
  { to: '/history', label: 'History', icon: <IconHistory /> },
  { to: '/players', label: 'Players', icon: <IconUsers /> },
]

const icons = [
  ['Home', IconHome],
  ['Ball', IconBall],
  ['Table', IconTable],
  ['History', IconHistory],
  ['Users', IconUsers],
  ['Plus', IconPlus],
  ['Edit', IconEdit],
  ['Trash', IconTrash],
  ['Left', IconChevronLeft],
  ['Right', IconChevronRight],
  ['Up', IconChevronUp],
  ['Down', IconChevronDown],
  ['Back', IconBack],
  ['Logout', IconLogout],
  ['Settings', IconSettings],
  ['Trophy', IconTrophy],
]

function Gallery() {
  const [filter, setFilter] = useState('upcoming')
  const [venue, setVenue] = useState('all')
  const [matchday, setMatchday] = useState(4)
  const [homeGoals, setHomeGoals] = useState(2)
  const [awayGoals, setAwayGoals] = useState(1)
  const [sheet, setSheet] = useState(false)
  const [toast, setToast] = useState(false)
  const [club, setClub] = useState('Blue Herons')
  const [note, setNote] = useState('')

  return (
    <div className='gallery'>
      <TopBar
        title='FC League'
        left={<IconButton label='Back'><IconBack /></IconButton>}
        right={<IconButton label='Settings'><IconSettings /></IconButton>}
      />

      <section>
        <h2>Buttons</h2>
        <div className='gallery__row'>
          <ClayButton>Primary</ClayButton>
          <ClayButton variant='soft'>Soft</ClayButton>
          <ClayButton variant='danger'>Danger</ClayButton>
          <ClayButton size='sm'>Small</ClayButton>
          <ClayButton size='lg'>Large</ClayButton>
          <ClayButton pressed>Pressed</ClayButton>
          <IconButton label='Add match'><IconPlus /></IconButton>
          <IconButton label='Delete match' variant='danger'><IconTrash /></IconButton>
        </div>
      </section>

      <section>
        <h2>Chips</h2>
        <div className='gallery__row'>
          <Chip tone='blue'>Upcoming</Chip>
          <Chip tone='mint'>Played</Chip>
          <Chip tone='peach'>Postponed</Chip>
          <Chip tone='void'>Void</Chip>
          <Chip selected onClick={() => {}}>Selected</Chip>
          <FormChips form={['W', 'D', 'L', 'W', 'L']} />
        </div>
      </section>

      <section>
        <h2>Matchdays</h2>
        <SegmentedTabs
          label='Match filter'
          value={filter}
          onChange={setFilter}
          tabs={[
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'results', label: 'Results' },
            { id: 'all', label: 'All' },
          ]}
        />
        <div className='gallery__stack'>
          <MatchdayRail
            matchdays={[1, 2, 3, 4, 5, 6, 7, 8]}
            value={matchday}
            onChange={setMatchday}
          />
        </div>
      </section>

      <section>
        <h2>Matches</h2>
        <div className='gallery__stack'>
          <MatchCard
            match={{ status: 'played', homeGoals: 2, awayGoals: 1, playedAt: '2026-10-01T18:30:00.000Z' }}
            home={players.p1}
            away={players.p2}
            onClick={() => setToast(true)}
          />
          <MatchCard
            match={{ status: 'scheduled', scheduledAt: '2026-10-11T16:00:00.000Z' }}
            home={players.p3}
            away={players.p1}
            onClick={() => {}}
            adminAction={<ClayButton onClick={() => setSheet(true)}>Enter result</ClayButton>}
          />
          <MatchCard
            match={{ status: 'postponed', scheduledAt: '2026-10-07T18:30:00.000Z' }}
            home={players.p2}
            away={players.p3}
          />
          <MatchCard
            match={{ status: 'void', scheduledAt: '2026-09-20T15:00:00.000Z' }}
            home={players.p1}
            away={players.p3}
          />
        </div>
      </section>

      <section>
        <h2>Table</h2>
        <SegmentedTabs
          label='Venue'
          value={venue}
          onChange={setVenue}
          tabs={[
            { id: 'all', label: 'All' },
            { id: 'home', label: 'Home' },
            { id: 'away', label: 'Away' },
          ]}
        />
        <StandingsTable
          rows={rows}
          players={players}
          zones={zones}
          onRowClick={() => setToast(true)}
        />
      </section>

      <section>
        <h2>Crests and stats</h2>
        <div className='gallery__row'>
          <Crest color='#C5D4FF' emoji='🐦' label='Blue Herons' size='sm' />
          <Crest color='#F6C6D0' emoji='☄️' label='Pink Comets' />
          <Crest color='#BFE6D0' shortCode='FOX' label='Mint Foxes' size='lg' />
        </div>
        <ClayCard>
          <div className='gallery__stack'>
            <StatBar label='Possession' home={62} away={38} />
            <StatBar label='Shots' home={8} away={5} />
            <StatBar label='On target' home={4} away={2} />
          </div>
        </ClayCard>
      </section>

      <section>
        <h2>Fields</h2>
        <Field label='Club name' hint='Shown on the table'>
          <Input value={club} onChange={(event) => setClub(event.target.value)} />
        </Field>
        <Field label='Season' error={note.length > 40 ? 'Keep it short' : undefined}>
          <Select
            value='s3'
            onChange={() => {}}
            options={[
              { value: 's2', label: 'Season 2' },
              { value: 's3', label: 'Season 3' },
            ]}
          />
        </Field>
        <Field label='Note'>
          <Input value={note} placeholder='Optional note' onChange={(event) => setNote(event.target.value)} />
        </Field>
      </section>

      <section>
        <h2>Loading and empty</h2>
        <div className='gallery__stack'>
          <Skeleton height='48px' radius='var(--radius-card)' />
          <Skeleton width='60%' />
          <Spinner />
        </div>
        <EmptyState
          icon={<IconTrophy />}
          title='No season yet'
          message='When an admin starts a season, fixtures and the table show up here.'
          action={<ClayButton variant='soft'>Refresh</ClayButton>}
        />
      </section>

      <section>
        <h2>Icons</h2>
        <div className='gallery__row'>
          {icons.map(([name, Icon]) => (
            <span key={name} className='gallery__icon'>
              <Icon />
              {name}
            </span>
          ))}
        </div>
      </section>

      <Sheet open={sheet} onClose={() => setSheet(false)} title='Enter result'>
        <ScoreStepper label='Home goals' value={homeGoals} onChange={setHomeGoals} />
        <ScoreStepper label='Away goals' value={awayGoals} onChange={setAwayGoals} />
        <ClayButton
          onClick={() => {
            setSheet(false)
            setToast(true)
          }}
        >
          Save result
        </ClayButton>
      </Sheet>

      <Toast
        open={toast}
        tone='mint'
        message='Result saved'
        onClose={() => setToast(false)}
      />
      <BottomNav items={nav} />
    </div>
  )
}

export default function Showcase() {
  return (
    <MemoryRouter>
      <Gallery />
    </MemoryRouter>
  )
}
