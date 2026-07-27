import { describe, expect, it } from 'vitest'
import {
  createDefaultHealthProfile,
  type HealthProfile,
  type HealthProfilePatch,
} from '../db/schema'
import type { Prediction } from './cycle'
import {
  applyPredictionContext,
  isHormonalContraception,
  periodTimingStatus,
} from './predictionContext'

const RAW: Prediction = {
  nextPeriodStart: '2026-08-20',
  ovulationDate: '2026-08-06',
  fertileWindow: { start: '2026-08-01', end: '2026-08-06' },
  uncertaintyDays: 2,
  cycleDay: 12,
  averageCycleLength: 28,
  source: 'basic',
}

function profile(patch: HealthProfilePatch = {}): HealthProfile {
  const base = createDefaultHealthProfile('2026-07-26T12:00:00.000Z')
  return {
    ...base,
    ...patch,
    cycle: { ...base.cycle, ...patch.cycle },
    reproductive: { ...base.reproductive, ...patch.reproductive },
    wellbeing: { ...base.wellbeing, ...patch.wellbeing },
    biometrics: { ...base.biometrics, ...patch.biometrics },
    permissions: { ...base.permissions, ...patch.permissions },
    privacy: { ...base.privacy, ...patch.privacy },
  }
}

describe('applyPredictionContext', () => {
  it('suppresses cycle and fertility forecasts during a pregnancy context', () => {
    const result = applyPredictionContext(
      RAW,
      profile({
        primaryGoal: 'pregnancy',
        goals: ['pregnancy'],
        reproductive: { contraception: 'none', pregnancyLmp: '2026-06-10' },
      }),
    )

    expect(result.eligibility).toEqual({
      periodForecast: false,
      ovulationForecast: false,
      fertileWindow: false,
      pregnancyChanceEstimate: false,
    })
    expect(result.prediction).toMatchObject({
      nextPeriodStart: null,
      ovulationDate: null,
      fertileWindow: null,
      cycleDay: null,
    })
    expect(result.evidenceMode).toBe('suppressed')
    expect(result.reasons.map((reason) => reason.code)).toContain('pregnancy')
  })

  it('keeps period tracking but suppresses ovulation claims on hormonal contraception', () => {
    const result = applyPredictionContext(
      RAW,
      profile({
        reproductive: { contraception: 'combined-pill-patch-ring' },
      }),
    )

    expect(result.eligibility.periodForecast).toBe(true)
    expect(result.eligibility.ovulationForecast).toBe(false)
    expect(result.prediction.nextPeriodStart).toBe(RAW.nextPeriodStart)
    expect(result.prediction.ovulationDate).toBeNull()
    expect(result.prediction.fertileWindow).toBeNull()
    expect(result.reasons.map((reason) => reason.code)).toContain('hormonal-contraception')
  })

  it('does not treat retained pregnancy dating history as the active mode', () => {
    const result = applyPredictionContext(
      RAW,
      profile({
        primaryGoal: 'cycle',
        goals: ['cycle', 'pregnancy'],
        reproductive: {
          contraception: 'none',
          pregnancyDating: {
            method: 'clinician-edd',
            inputDate: '2025-12-01',
            estimatedDueDate: '2025-12-01',
            gestationalStart: '2025-02-24',
            authority: 'clinician-assigned',
            provisional: false,
            updatedAt: '2026-07-26T12:00:00.000Z',
          },
        },
      }),
    )

    expect(result.eligibility.periodForecast).toBe(true)
    expect(result.prediction.nextPeriodStart).toBe(RAW.nextPeriodStart)
    expect(result.reasons.map((reason) => reason.code)).not.toContain('pregnancy')
  })

  it('does not suppress forecasts for nonhormonal methods', () => {
    const result = applyPredictionContext(
      RAW,
      profile({
        reproductive: { contraception: 'copper-iud' },
      }),
    )

    expect(result.eligibility.ovulationForecast).toBe(true)
    expect(result.prediction.ovulationDate).toBe(RAW.ovulationDate)
    expect(isHormonalContraception('copper-iud')).toBe(false)
    expect(isHormonalContraception('hormonal-iud')).toBe(true)
  })

  it('widens uncertainty for irregular timing, PCOS, and perimenopause', () => {
    const irregular = applyPredictionContext(
      RAW,
      profile({ cycle: { regularity: 'irregular' } }),
    )
    const pcos = applyPredictionContext(RAW, profile({ conditions: ['pcos'] }))
    const peri = applyPredictionContext(
      RAW,
      profile({ primaryGoal: 'peri', goals: ['peri'] }),
    )

    expect(irregular.prediction.uncertaintyDays).toBeGreaterThan(RAW.uncertaintyDays)
    expect(pcos.prediction.uncertaintyDays).toBeGreaterThan(
      irregular.prediction.uncertaintyDays,
    )
    expect(peri.prediction.uncertaintyDays).toBeGreaterThan(
      pcos.prediction.uncertaintyDays,
    )
  })

  it('labels calendar-plus-signals evidence without treating signals as confirmation', () => {
    const result = applyPredictionContext(RAW, profile(), {
      completedCycles: 5,
      bbtShiftEstimateCount: 1,
      positiveOpkThisCycle: true,
    })

    expect(result.evidenceMode).toBe('cycle-history-plus-signals')
    expect(result.evidence).toEqual({
      calendar: true,
      bbtRetrospective: true,
      opkSuggestive: true,
    })
    expect(result.reasons.find((reason) => reason.code === 'bbt-retrospective')?.message).toContain(
      'does not confirm',
    )
  })
})

describe('periodTimingStatus', () => {
  it('waits until the upper uncertainty bound is passed', () => {
    expect(periodTimingStatus('2026-08-21', '2026-08-20', 3).state).toBe(
      'within-estimated-window',
    )
    expect(periodTimingStatus('2026-08-23', '2026-08-20', 3).state).toBe(
      'within-estimated-window',
    )
    expect(periodTimingStatus('2026-08-24', '2026-08-20', 3)).toMatchObject({
      state: 'beyond-estimated-window',
      upperBound: '2026-08-23',
      daysBeyondWindow: 1,
    })
  })
})
