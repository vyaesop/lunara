import { describe, expect, it } from 'vitest'
import {
  describeRange,
  filterByRange,
  filterDatesByRange,
  isWithinRange,
  normalizeRange,
  rangeLengthDays,
  resolveRange,
} from './dateRange'

const TODAY = '2026-07-26'

describe('report date ranges', () => {
  it('resolves presets to inclusive windows ending today', () => {
    expect(resolveRange({ preset: 'last-30-days', today: TODAY })).toEqual({
      start: '2026-06-27',
      end: TODAY,
    })
    expect(rangeLengthDays(resolveRange({ preset: 'last-30-days', today: TODAY }))).toBe(30)
    expect(rangeLengthDays(resolveRange({ preset: 'last-12-months', today: TODAY }))).toBe(365)
  })

  it('spans from the earliest entry for all-time, and collapses when there is none', () => {
    expect(resolveRange({ preset: 'all', today: TODAY, earliestEntry: '2025-01-09' })).toEqual({
      start: '2025-01-09',
      end: TODAY,
    })
    expect(resolveRange({ preset: 'all', today: TODAY, earliestEntry: null })).toEqual({
      start: TODAY,
      end: TODAY,
    })
  })

  it('orders reversed custom bounds instead of yielding an empty range', () => {
    expect(
      resolveRange({
        preset: 'custom',
        today: TODAY,
        custom: { start: '2026-05-01', end: '2026-03-01' },
      }),
    ).toEqual({ start: '2026-03-01', end: '2026-05-01' })
  })

  it('never lets a range run past today', () => {
    expect(normalizeRange('2026-07-01', '2027-01-01', TODAY)).toEqual({
      start: '2026-07-01',
      end: TODAY,
    })
    // A window entirely in the future collapses onto today rather than inverting.
    expect(normalizeRange('2027-01-01', '2027-02-01', TODAY)).toEqual({
      start: TODAY,
      end: TODAY,
    })
  })

  it('falls back to a sane custom window when bounds are missing or malformed', () => {
    expect(resolveRange({ preset: 'custom', today: TODAY, custom: { start: 'nope' } })).toEqual({
      start: '2026-06-27',
      end: TODAY,
    })
  })

  it('filters inclusively on both bounds', () => {
    const range = { start: '2026-07-01', end: '2026-07-03' }
    expect(isWithinRange('2026-07-01', range)).toBe(true)
    expect(isWithinRange('2026-07-03', range)).toBe(true)
    expect(isWithinRange('2026-06-30', range)).toBe(false)
    expect(isWithinRange('2026-07-04', range)).toBe(false)
    expect(filterDatesByRange(['2026-06-30', '2026-07-02', '2026-07-09'], range)).toEqual([
      '2026-07-02',
    ])
    expect(
      filterByRange([{ date: '2026-07-02' }, { date: '2026-08-02' }], range),
    ).toEqual([{ date: '2026-07-02' }])
  })

  it('counts a single-day range as one day', () => {
    expect(rangeLengthDays({ start: TODAY, end: TODAY })).toBe(1)
    expect(describeRange({ start: TODAY, end: TODAY })).toContain('1 day')
  })

  it('describes the span so an exported report states its own window', () => {
    expect(describeRange({ start: '2026-01-03', end: '2026-07-26' })).toBe(
      'Jan 3 – Jul 26, 2026 (205 days)',
    )
    expect(describeRange({ start: '2025-12-30', end: '2026-01-02' })).toContain('2025')
  })
})
