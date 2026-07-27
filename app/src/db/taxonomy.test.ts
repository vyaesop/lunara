import { describe, expect, it } from 'vitest'
import {
  ACTIVITY_EVENTS,
  DIGESTION_EVENTS,
  DISCHARGES,
  LIFESTYLE_EVENTS,
  PREGNANCY_TEST_RESULTS,
  SEX_OPTIONS,
  SYMPTOM_IMPAIRMENTS,
  SYMPTOM_SEVERITIES,
} from './taxonomy'

describe('daily logger taxonomy', () => {
  it('covers the extended discharge observations without diagnostic labels', () => {
    expect(DISCHARGES.map((item) => item.id)).toEqual(
      expect.arrayContaining(['none', 'unusual', 'clumpy-white', 'gray']),
    )
  })

  it('supports multi-event intimacy and drive tracking', () => {
    expect(SEX_OPTIONS.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'no-sex',
        'protected',
        'unprotected',
        'oral',
        'anal',
        'masturbation',
        'sensual-touch',
        'sex-toys',
        'orgasm',
        'neutral-drive',
        'high-drive',
        'low-drive',
      ]),
    )
  })

  it('provides structured detail families for symptom impact and daily context', () => {
    expect(SYMPTOM_SEVERITIES).toHaveLength(3)
    expect(SYMPTOM_IMPAIRMENTS.map((item) => item.id)).toContain('limited-routine')
    expect(PREGNANCY_TEST_RESULTS.map((item) => item.id)).toEqual([
      'not-taken',
      'positive',
      'negative',
      'faint',
    ])
    expect(DIGESTION_EVENTS.length).toBeGreaterThanOrEqual(8)
    expect(ACTIVITY_EVENTS.length).toBeGreaterThanOrEqual(10)
    expect(LIFESTYLE_EVENTS.length).toBeGreaterThanOrEqual(10)
  })
})
