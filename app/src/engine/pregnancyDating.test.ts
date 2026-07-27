import { describe, expect, it } from 'vitest'
import {
  pregnancyTimeline,
  resolvePregnancyDating,
  selectPregnancyDating,
} from './pregnancyDating'

describe('resolvePregnancyDating', () => {
  it('keeps an explicitly clinician-assigned EDD authoritative', () => {
    const result = resolvePregnancyDating({
      method: 'clinician-edd',
      date: '2026-11-20',
    })
    expect(result.estimatedDueDate).toBe('2026-11-20')
    expect(result.authority).toBe('clinician-assigned')
    expect(result.provisional).toBe(false)
    expect(result.gestationalStart).toBe('2026-02-13')
  })

  it('calculates a provisional LMP estimate without labeling it clinical', () => {
    const result = resolvePregnancyDating({
      method: 'lmp',
      date: '2026-02-13',
    })
    expect(result.estimatedDueDate).toBe('2026-11-20')
    expect(result.authority).toBe('user-estimated')
    expect(result.provisional).toBe(true)
  })

  it('uses conception and embryo-age adjustments', () => {
    expect(
      resolvePregnancyDating({ method: 'conception', date: '2026-02-27' })
        .estimatedDueDate,
    ).toBe('2026-11-20')
    expect(
      resolvePregnancyDating({ method: 'ivf-day-3', date: '2026-03-02' })
        .estimatedDueDate,
    ).toBe('2026-11-20')
    expect(
      resolvePregnancyDating({ method: 'ivf-day-5', date: '2026-03-04' })
        .estimatedDueDate,
    ).toBe('2026-11-20')
  })
})

describe('selectPregnancyDating', () => {
  it('uses explicit clinical dating ahead of calculated alternatives', () => {
    const result = selectPregnancyDating([
      { method: 'lmp', date: '2026-02-10' },
      { method: 'conception', date: '2026-02-27' },
      { method: 'clinician-edd', date: '2026-11-18' },
    ])
    expect(result?.method).toBe('clinician-edd')
    expect(result?.estimatedDueDate).toBe('2026-11-18')
  })

  it('returns null when no dating source was supplied', () => {
    expect(selectPregnancyDating([])).toBeNull()
  })
})

describe('pregnancyTimeline', () => {
  it('derives a consistent week, trimester, and remaining-day timeline', () => {
    const timeline = pregnancyTimeline(
      { method: 'clinician-edd', date: '2026-11-20' },
      '2026-07-26',
    )
    expect(timeline).toMatchObject({
      week: 23,
      dayOfWeek: 2,
      trimester: 2,
      daysRemaining: 117,
      estimatedDueDate: '2026-11-20',
    })
  })

  it('rejects dates outside the plausible display window', () => {
    expect(
      pregnancyTimeline(
        { method: 'clinician-edd', date: '2026-11-20' },
        '2025-01-01',
      ),
    ).toBeNull()
  })
})
