import { describe, expect, it } from 'vitest'
import type { DailyLog } from '../db/schema'
import {
  buildPerimenopauseSummary,
  periMonthlyTimeline,
  periWindowSummary,
} from './perimenopause'

describe('periWindowSummary', () => {
  it('scores burden among logged days and reports coverage separately', () => {
    const logs: DailyLog[] = [
      { date: '2026-04-24', symptoms: ['Hot flashes', 'Insomnia'] },
      { date: '2026-04-25', moods: ['Calm'] },
      { date: '2026-04-26', symptoms: ['Brain fog'] },
      { date: '2026-04-27', symptoms: ['Night sweats'], moods: ['Irritable'] },
    ]
    const result = periWindowSummary(logs, '2026-04-30')
    expect(result.loggedDays).toBe(4)
    expect(result.trackingCoverage).toBe(14)
    expect(result.score).toBeGreaterThan(0)
    expect(result.domains.find((domain) => domain.id === 'temperature')?.activeDays).toBe(2)
  })

  it('does not treat missing days as symptom-free observations', () => {
    const sparse = periWindowSummary(
      [{ date: '2026-04-30', symptoms: ['Hot flashes'] }],
      '2026-04-30',
    )
    expect(sparse.score).toBe(33)
    expect(sparse.trackingCoverage).toBe(4)
  })
})

describe('buildPerimenopauseSummary', () => {
  it('compares equal windows only with adequate tracking', () => {
    const logs: DailyLog[] = []
    for (let day = 1; day <= 6; day++) {
      logs.push({ date: `2026-03-${String(day + 19).padStart(2, '0')}`, moods: ['Calm'] })
      logs.push({
        date: `2026-04-${String(day + 20).padStart(2, '0')}`,
        symptoms: ['Hot flashes', 'Insomnia'],
      })
    }
    const result = buildPerimenopauseSummary(logs, [], '2026-04-30')
    expect(result.trend).toBe('increasing')
    expect(result.trendPoints).toBeGreaterThan(0)
  })

  it('surfaces descriptive cycle observations without staging menopause', () => {
    const periods = ['2025-10-01', '2025-10-24', '2025-11-28', '2025-12-24', '2026-01-30']
    const logs: DailyLog[] = [
      ...periods.map((date) => ({ date, flow: 'medium' as const })),
      { date: '2025-10-02', flow: 'medium' },
      { date: '2025-10-03', flow: 'medium' },
      { date: '2025-10-04', flow: 'medium' },
      { date: '2025-10-05', flow: 'medium' },
      { date: '2025-10-06', flow: 'medium' },
      { date: '2025-10-07', flow: 'medium' },
      { date: '2025-10-08', flow: 'medium' },
      { date: '2025-10-09', flow: 'light' },
    ]
    const result = buildPerimenopauseSummary(logs, periods, '2026-04-30')
    expect(result.observations.some((item) => item.id === 'cycle-variation')).toBe(true)
    expect(result.observations.some((item) => item.id === 'long-bleeding')).toBe(true)
    expect(result.methodology).toContain('not a hormone measure')
  })

  it('builds deterministic 28-day trend windows', () => {
    const result = periMonthlyTimeline([], '2026-04-30', 3)
    expect(result).toHaveLength(3)
    expect(result.map((window) => window.end)).toEqual([
      '2026-03-05',
      '2026-04-02',
      '2026-04-30',
    ])
  })
})
