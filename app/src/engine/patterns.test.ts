import { describe, expect, it } from 'vitest'
import type { DailyLog } from '../db/schema'
import { analyzePatterns, buildCycleReport, cycleContext } from './patterns'

const PERIODS = ['2026-01-01', '2026-01-29', '2026-02-26', '2026-03-26']

describe('cycleContext', () => {
  it('uses only bounded completed cycles', () => {
    expect(cycleContext(PERIODS, '2026-01-01')).toMatchObject({
      key: '2026-01-01',
      day: 1,
      phase: 'menstrual',
    })
    expect(cycleContext(PERIODS, '2026-01-25')).toMatchObject({
      day: 25,
      phase: 'luteal',
    })
    expect(cycleContext(PERIODS, '2026-04-01')).toBeNull()
  })
})

describe('analyzePatterns', () => {
  const logs: DailyLog[] = [
    { date: '2026-01-10', checkInComplete: true, moods: ['Calm'] },
    { date: '2026-01-25', checkInComplete: true, symptoms: ['Cramps', 'Headache'] },
    { date: '2026-02-07', checkInComplete: true, moods: ['Calm'] },
    { date: '2026-02-22', checkInComplete: true, symptoms: ['Cramps', 'Headache'] },
    { date: '2026-03-08', checkInComplete: true, moods: ['Calm'] },
    { date: '2026-03-22', checkInComplete: true, symptoms: ['Cramps', 'Headache'] },
  ]

  it('finds explainable phase and day-cluster patterns', () => {
    const insights = analyzePatterns(logs, PERIODS)
    const phase = insights.find(
      (insight) => insight.kind === 'phase-association' && insight.signal === 'Cramps',
    )
    expect(phase).toMatchObject({
      confidence: 'early',
      evidence: { occurrences: 3, cyclesObserved: 3, phase: 'luteal' },
    })
    expect(
      insights.find(
        (insight) => insight.kind === 'cycle-day-cluster' && insight.signal === 'Cramps',
      ),
    ).toMatchObject({ evidence: { cycleDayRange: { start: 25, end: 25 } } })
  })

  it('finds repeated same-day associations without claiming causation', () => {
    const insight = analyzePatterns(logs, PERIODS).find(
      (item) => item.kind === 'co-occurrence' && item.signal === 'Cramps',
    )
    expect(insight?.evidence.pairedSignal).toBe('Headache')
    expect(insight?.explanation).toContain('not evidence')
  })

  it('requires repeated observations across cycles', () => {
    expect(
      analyzePatterns(
        [
          { date: '2026-01-25', symptoms: ['Cramps'] },
          { date: '2026-01-26', symptoms: ['Cramps'] },
          { date: '2026-01-27', symptoms: ['Cramps'] },
        ],
        PERIODS,
      ),
    ).toEqual([])
  })

  it('does not treat partial or missing check-ins as symptom-free phase evidence', () => {
    const partial: DailyLog[] = [
      { date: '2026-01-25', symptoms: ['Cramps'] },
      { date: '2026-02-22', symptoms: ['Cramps'] },
      { date: '2026-03-22', symptoms: ['Cramps'] },
    ]
    expect(analyzePatterns(partial, PERIODS)).toEqual([])
  })
})

describe('buildCycleReport', () => {
  it('summarizes cycle and coverage data without filling in missing days', () => {
    const logs: DailyLog[] = [
      { date: '2026-01-01', checkInComplete: true, flow: 'medium', symptoms: ['Cramps'] },
      { date: '2026-01-02', checkInComplete: true, flow: 'light' },
      { date: '2026-01-29', checkInComplete: true, flow: 'medium' },
      { date: '2026-02-26', checkInComplete: true, flow: 'medium' },
      { date: '2026-03-26', checkInComplete: true, flow: 'medium' },
    ]
    const report = buildCycleReport(logs, PERIODS, '2026-03-30')
    expect(report.completedCycleCount).toBe(3)
    expect(report.averageCycleDays).toBe(28)
    expect(report.shortestCycleDays).toBe(28)
    expect(report.trackingCoverageLast90).toBe(6)
    expect(report.completeness.completeCheckInDays).toBe(5)
    expect(report.cycleWindows.six.sampleSize).toBe(3)
    expect(report.bleedingTrend.sampleSize).toBe(4)
    expect(report.symptomPhaseSummaries[0]).toMatchObject({
      signal: 'Cramps',
      phase: 'menstrual',
      completedCheckInsInPhase: 4,
    })
    expect(report.methodology).toContain('do not establish')
  })
})
