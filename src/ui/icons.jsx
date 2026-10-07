function Svg({ size = 24, children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.8'
      strokeLinecap='round'
      strokeLinejoin='round'
      focusable='false'
      {...props}
      aria-hidden='true'
    >
      {children}
    </svg>
  )
}

export function IconHome(props) {
  return (
    <Svg {...props}>
      <path d='M4 10.8 12 4l8 6.8' />
      <path d='M6.5 9.8V20h11V9.8' />
      <path d='M10 20v-5h4v5' />
    </Svg>
  )
}

export function IconBall(props) {
  return (
    <Svg {...props}>
      <circle cx='12' cy='12' r='8' />
      <path d='M12 4.2v3.1M12 16.7V19.8M4.2 12h3.1M16.7 12h3.1' />
      <path d='M12 7.5 15.1 9.6v4L12 15.7 8.9 13.6v-4z' />
    </Svg>
  )
}

export function IconTable(props) {
  return (
    <Svg {...props}>
      <rect x='4' y='4' width='16' height='16' rx='2.5' />
      <path d='M4 9.5h16M4 14.5h16M9.5 4v16M14.5 4v16' />
    </Svg>
  )
}

export function IconHistory(props) {
  return (
    <Svg {...props}>
      <circle cx='12' cy='12' r='8' />
      <path d='M12 8v4.5l3 2' />
      <path d='M5.2 7.2 4 4.5' />
    </Svg>
  )
}

export function IconUsers(props) {
  return (
    <Svg {...props}>
      <circle cx='9' cy='9' r='3' />
      <path d='M4.2 19c.6-2.7 2.5-4 4.8-4s4.2 1.3 4.8 4' />
      <circle cx='16.6' cy='9.4' r='2.2' />
      <path d='M15 15.2c1.5-.4 2.8-.1 3.8.9.8 1 1.2 2.1 1.4 3' />
    </Svg>
  )
}

export function IconPlus(props) {
  return (
    <Svg {...props}>
      <path d='M12 6v12M6 12h12' />
    </Svg>
  )
}

export function IconEdit(props) {
  return (
    <Svg {...props}>
      <path d='M4 20h4L18.2 9.8a2.1 2.1 0 0 0-3-3L5 17z' />
      <path d='M13.5 8.5l3 3' />
    </Svg>
  )
}

export function IconTrash(props) {
  return (
    <Svg {...props}>
      <path d='M5 7h14' />
      <path d='M9 7V5h6v2' />
      <path d='M7.5 7l.7 12h7.6l.7-12' />
    </Svg>
  )
}

export function IconChevronLeft(props) {
  return (
    <Svg {...props}>
      <path d='M14.5 5.5 8 12l6.5 6.5' />
    </Svg>
  )
}

export function IconChevronRight(props) {
  return (
    <Svg {...props}>
      <path d='M9.5 5.5 16 12l-6.5 6.5' />
    </Svg>
  )
}

export function IconChevronUp(props) {
  return (
    <Svg {...props}>
      <path d='M5.5 14.5 12 8l6.5 6.5' />
    </Svg>
  )
}

export function IconChevronDown(props) {
  return (
    <Svg {...props}>
      <path d='M5.5 9.5 12 16l6.5-6.5' />
    </Svg>
  )
}

export function IconBack(props) {
  return (
    <Svg {...props}>
      <path d='M14.5 5 8 12l6.5 7' />
      <path d='M8 12h11' />
    </Svg>
  )
}

export function IconLogout(props) {
  return (
    <Svg {...props}>
      <path d='M10 6H6v12h4' />
      <path d='M11 12h8' />
      <path d='M16 8.5 19.5 12 16 15.5' />
    </Svg>
  )
}

export function IconSettings(props) {
  return (
    <Svg {...props}>
      <circle cx='12' cy='12' r='3' />
      <path d='M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.9 5.9l1.6 1.6M16.5 16.5l1.6 1.6M18.1 5.9l-1.6 1.6M7.5 16.5 5.9 18.1' />
    </Svg>
  )
}

export function IconTrophy(props) {
  return (
    <Svg {...props}>
      <path d='M8 4h8v5a4 4 0 0 1-8 0z' />
      <path d='M8 6.2H5.6A2.4 2.4 0 0 0 8 9.6' />
      <path d='M16 6.2h2.4A2.4 2.4 0 0 1 16 9.6' />
      <path d='M12 13v3.2' />
      <path d='M9 20h6' />
      <path d='M9.5 16.2h5V20h-5z' />
    </Svg>
  )
}
