export function StatGrid({ items, columns = 4 }) {
  return (
    <dl className='v-stat-grid' style={{ '--cols': columns }}>
      {items.map((item) => (
        <div key={item.label} className='v-stat'>
          <dt className='v-stat__label'>{item.label}</dt>
          <dd className='v-stat__value'>{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
