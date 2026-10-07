import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../auth/index.js'
import { useLeague, useSeasons } from '../../data/index.js'
import {
  ClayButton,
  ClayCard,
  Crest,
  IconBall,
  IconChevronRight,
  IconHome,
  IconLogout,
  IconSettings,
  IconTrophy,
  IconUsers,
  Skeleton,
} from '../../ui/index.js'
import { AdminPage } from './AdminParts.jsx'

function LinkCard({ to, icon, title, subtitle }) {
  return (
    <ClayCard as={Link} to={to} className='admin-link-card'>
      <span className='admin-link-card__icon' aria-hidden='true'>{icon}</span>
      <span className='admin-grow'>
        <span className='admin-link-card__title'>{title}</span>
        {subtitle ? <span className='admin-muted admin-block'>{subtitle}</span> : null}
      </span>
      <IconChevronRight />
    </ClayCard>
  )
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { data: league, loading } = useLeague()
  const { data: seasons } = useSeasons(league?.id)
  const active = seasons.find((season) => season.id === league?.activeSeasonId)
  const drafts = seasons.filter((season) => season.status === 'draft')

  const onSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <AdminPage title='Admin'>
      <ClayCard>
        {loading ? (
          <Skeleton height='52px' radius='var(--radius-tile)' />
        ) : (
          <div className='admin-list-item'>
            <Crest color={league?.color} emoji={league?.emoji} label={league?.name} />
            <div className='admin-grow'>
              <p className='admin-list-item__name'>{league?.name ?? 'No league yet'}</p>
              <p className='admin-muted'>Signed in as {user?.email}</p>
            </div>
          </div>
        )}
      </ClayCard>

      <div className='admin-stack'>
        {active ? (
          <LinkCard
            to={`/admin/seasons/${active.id}`}
            icon={<IconBall />}
            title={`${active.name} (active)`}
            subtitle='Enter results, complete the season'
          />
        ) : null}
        <LinkCard
          to='/admin/league'
          icon={<IconSettings />}
          title='League'
          subtitle={league ? 'Name, emoji and color' : 'Create your league'}
        />
        <LinkCard to='/admin/players' icon={<IconUsers />} title='Players' subtitle='Add, edit and archive clubs' />
        <LinkCard
          to='/admin/seasons'
          icon={<IconTrophy />}
          title='Seasons'
          subtitle={drafts.length ? `${drafts.length} draft${drafts.length > 1 ? 's' : ''} waiting` : 'Create, activate, complete'}
        />
        <LinkCard to='/' icon={<IconHome />} title='View app' subtitle='See what viewers see' />
      </div>

      <ClayButton variant='soft' onClick={onSignOut}>
        <IconLogout />
        Sign out
      </ClayButton>
    </AdminPage>
  )
}
