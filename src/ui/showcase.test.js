import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { expect, test } from 'vitest'
import {
  BottomNav,
  ClayButton,
  Crest,
  FormChips,
  IconHome,
  MatchCard,
  ScoreStepper,
  SegmentedTabs,
  StandingsTable,
  Toast,
} from './index.js'
import Showcase from './Showcase.jsx'

const home = { name: 'Asha', clubName: 'Blue Herons', shortCode: 'HER', color: '#C5D4FF', emoji: '🐦' }
const away = { name: 'Rohan', clubName: 'Pink Comets', shortCode: 'COM', color: '#F6C6D0', emoji: '☄️' }

test('form chips name each result', () => {
  const html = renderToStaticMarkup(createElement(FormChips, { form: ['W', 'D', 'L'] }))
  expect(html).toContain('Win')
  expect(html).toContain('Draw')
  expect(html).toContain('Loss')
})

test('match card shows a score, a postponed label, and the admin slot', () => {
  const played = renderToStaticMarkup(createElement(MatchCard, {
    match: { status: 'played', homeGoals: 2, awayGoals: 1 },
    home,
    away,
  }))
  expect(played).toContain('2\u20131')
  expect(played).toContain('Blue Herons')
  expect(played).toContain('Pink Comets')

  const postponed = renderToStaticMarkup(createElement(MatchCard, {
    match: { status: 'postponed', scheduledAt: '2026-10-07T18:30:00.000Z' },
    home,
    away,
    adminAction: createElement('button', { type: 'button' }, 'Enter result'),
  }))
  expect(postponed).toContain('Postponed')
  expect(postponed).toContain('Enter result')
  expect(postponed).not.toContain('2\u20131')
})

test('standings show the club, points header, and zone legend', () => {
  const html = renderToStaticMarkup(createElement(StandingsTable, {
    rows: [{
      playerId: 'p1',
      position: 1,
      played: 1,
      won: 1,
      drawn: 0,
      lost: 0,
      goalsFor: 2,
      goalsAgainst: 0,
      goalDiff: 2,
      points: 3,
      form: ['W'],
    }],
    players: { p1: home },
    zones: [{ label: 'Champion', positions: [1], tone: 'champion' }],
    onRowClick: () => {},
  }))
  expect(html).toContain('Blue Herons')
  expect(html).toContain('Champion')
  expect(html).toContain('Pts')
  expect(html).toContain('+2')
})

test('score stepper, crest, tabs, toast, and nav render their labels', () => {
  expect(renderToStaticMarkup(createElement(ScoreStepper, { value: 0, label: 'Home goals' }))).toContain('Home goals')
  expect(renderToStaticMarkup(createElement(Crest, { shortCode: 'HER', color: '#C5D4FF' }))).toContain('HER')
  const tabs = renderToStaticMarkup(createElement(SegmentedTabs, {
    value: 'home',
    tabs: [{ id: 'home', label: 'Home' }, { id: 'away', label: 'Away' }],
  }))
  expect(tabs).toContain('aria-selected="true"')
  expect(tabs).toContain('Away')
  expect(renderToStaticMarkup(createElement(Toast, { message: 'Result saved' }))).toContain('Result saved')
  expect(renderToStaticMarkup(createElement(Toast, { message: 'Hidden', open: false }))).toBe('')
  expect(renderToStaticMarkup(createElement(ClayButton, { pressed: true }, 'Pressed'))).toContain('aria-pressed="true"')
  const nav = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(BottomNav, {
    items: [{ to: '/', label: 'Home', icon: createElement(IconHome) }],
  })))
  expect(nav).toContain('Home')
  expect(nav).toContain('href="/"')
})

test('showcase renders the clay gallery', () => {
  const html = renderToStaticMarkup(createElement(Showcase))
  expect(html).toContain('FC League')
  expect(html).toContain('Enter result')
  expect(html).toContain('Possession')
  expect(html).toContain('No season yet')
  expect(html).toContain('Last place')
  expect(html).toContain('Void')
})
