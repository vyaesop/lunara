import type { ContraceptionMethod, HealthProfile } from '../db/schema'
import { addDays, daysBetween, toEpochDay, type ISODate, type Prediction } from './cycle'

export type PredictionEvidenceMode =
  | 'suppressed'
  | 'insufficient'
  | 'baseline-calendar'
  | 'cycle-history'
  | 'cycle-history-plus-signals'

export type PredictionReasonCode =
  | 'pregnancy'
  | 'hormonal-contraception'
  | 'irregular-cycles'
  | 'pcos'
  | 'perimenopause'
  | 'limited-history'
  | 'calendar-estimate'
  | 'bbt-retrospective'
  | 'opk-suggestive'

export interface PredictionReason {
  code: PredictionReasonCode
  effect: 'suppresses' | 'widens' | 'limits' | 'supports'
  message: string
}

export interface PredictionEvidence {
  completedCycles?: number
  bbtShiftEstimateCount?: number
  positiveOpkThisCycle?: boolean
}

export interface PersonalizedPrediction {
  prediction: Prediction
  eligibility: {
    periodForecast: boolean
    ovulationForecast: boolean
    fertileWindow: boolean
    pregnancyChanceEstimate: boolean
  }
  evidenceMode: PredictionEvidenceMode
  evidence: {
    calendar: boolean
    bbtRetrospective: boolean
    opkSuggestive: boolean
  }
  reasons: PredictionReason[]
}

export type PeriodTimingStatus =
  | {
      state: 'unknown'
      lowerBound: null
      upperBound: null
      daysBeyondWindow: 0
    }
  | {
      state: 'before-estimated-window' | 'within-estimated-window' | 'beyond-estimated-window'
      lowerBound: ISODate
      upperBound: ISODate
      daysBeyondWindow: number
    }

const HORMONAL_CONTRACEPTION = new Set<ContraceptionMethod>([
  'combined-pill-patch-ring',
  'progestin-only-pill',
  'injection',
  'implant',
  'hormonal-iud',
])

export function isHormonalContraception(method: ContraceptionMethod): boolean {
  return HORMONAL_CONTRACEPTION.has(method)
}

function hasCycleFlag(profile: HealthProfile, flag: string): boolean {
  return profile.cycle.abnormalities.some((value) => value.toLowerCase() === flag)
}

/**
 * Apply durable profile context to a raw cycle-engine result.
 *
 * The cycle engine stays a deterministic calculator. This policy layer decides
 * whether a result is appropriate to display, adjusts uncertainty, and returns
 * reader-facing reasons. It never turns onboarding answers into a diagnosis.
 */
export function applyPredictionContext(
  rawPrediction: Prediction,
  profile: HealthProfile,
  evidence: PredictionEvidence = {},
): PersonalizedPrediction {
  const reasons: PredictionReason[] = []
  // Dating records can remain in the local history after someone explicitly
  // switches back to cycle or TTC mode. The active mode—not the mere presence
  // of a historic dating record—controls whether cycle forecasts are paused.
  const pregnancyContext = profile.primaryGoal === 'pregnancy'
  const hormonalContraception = isHormonalContraception(profile.reproductive.contraception)
  const irregular =
    profile.cycle.regularity === 'irregular' ||
    hasCycleFlag(profile, 'unpredictable-cycles') ||
    hasCycleFlag(profile, 'missed-periods')
  const pcos = profile.conditions.includes('pcos')
  const perimenopause =
    profile.primaryGoal === 'peri' ||
    profile.conditions.includes('perimenopause')

  if (pregnancyContext) {
    reasons.push({
      code: 'pregnancy',
      effect: 'suppresses',
      message:
        'Cycle, ovulation, and fertile-window forecasts are paused during a pregnancy context.',
    })
  } else if (hormonalContraception) {
    reasons.push({
      code: 'hormonal-contraception',
      effect: 'suppresses',
      message:
        'Ovulation and fertile-window forecasts are hidden because this hormonal method can change or suppress ovulation.',
    })
  }

  let uncertaintyAdjustment = 0
  if (irregular) {
    uncertaintyAdjustment = Math.max(uncertaintyAdjustment, 4)
    reasons.push({
      code: 'irregular-cycles',
      effect: 'widens',
      message: 'The estimate is wider because cycle timing was described as irregular.',
    })
  }
  if (pcos) {
    uncertaintyAdjustment = Math.max(uncertaintyAdjustment, 5)
    reasons.push({
      code: 'pcos',
      effect: 'widens',
      message:
        'The estimate is wider because PCOS can make calendar-only ovulation timing less reliable.',
    })
  }
  if (perimenopause) {
    uncertaintyAdjustment = Math.max(uncertaintyAdjustment, 6)
    reasons.push({
      code: 'perimenopause',
      effect: 'widens',
      message:
        'The estimate is wider because cycle timing can vary substantially during perimenopause.',
    })
  }

  const limitedHistory =
    rawPrediction.source === 'insufficient-data' ||
    rawPrediction.source === 'baseline' ||
    (evidence.completedCycles !== undefined && evidence.completedCycles < 3)
  if (limitedHistory) {
    reasons.push({
      code: 'limited-history',
      effect: 'limits',
      message: 'There are not yet three completed tracked cycles behind this estimate.',
    })
  } else {
    reasons.push({
      code: 'calendar-estimate',
      effect: 'limits',
      message: 'Calendar timing is an estimate, not confirmation of ovulation or a safe day.',
    })
  }

  const bbtRetrospective = (evidence.bbtShiftEstimateCount ?? 0) > 0
  const opkSuggestive = evidence.positiveOpkThisCycle === true
  if (bbtRetrospective) {
    reasons.push({
      code: 'bbt-retrospective',
      effect: 'supports',
      message:
        'A sustained BBT shift adds retrospective support, but does not confirm an exact ovulation day.',
    })
  }
  if (opkSuggestive) {
    reasons.push({
      code: 'opk-suggestive',
      effect: 'supports',
      message:
        'A positive OPK suggests an LH surge; it does not confirm that ovulation occurred.',
    })
  }

  const periodForecast = !pregnancyContext
  const ovulationForecast = !pregnancyContext && !hormonalContraception
  const adjustedUncertainty = Math.min(
    14,
    rawPrediction.uncertaintyDays + uncertaintyAdjustment,
  )
  const prediction: Prediction = {
    ...rawPrediction,
    nextPeriodStart: periodForecast ? rawPrediction.nextPeriodStart : null,
    ovulationDate: ovulationForecast ? rawPrediction.ovulationDate : null,
    fertileWindow: ovulationForecast ? rawPrediction.fertileWindow : null,
    cycleDay: periodForecast ? rawPrediction.cycleDay : null,
    uncertaintyDays: adjustedUncertainty,
  }

  const suppressed = pregnancyContext || hormonalContraception
  const signalSupported = bbtRetrospective || opkSuggestive
  const evidenceMode: PredictionEvidenceMode = suppressed
    ? 'suppressed'
    : rawPrediction.source === 'insufficient-data'
      ? 'insufficient'
      : rawPrediction.source === 'baseline'
        ? 'baseline-calendar'
        : signalSupported
          ? 'cycle-history-plus-signals'
          : 'cycle-history'

  return {
    prediction,
    eligibility: {
      periodForecast,
      ovulationForecast,
      fertileWindow: ovulationForecast,
      pregnancyChanceEstimate: ovulationForecast,
    },
    evidenceMode,
    evidence: {
      calendar: rawPrediction.source !== 'insufficient-data',
      bbtRetrospective,
      opkSuggestive,
    },
    reasons,
  }
}

/**
 * Treat the period estimate as a range. "Beyond" begins only after the upper
 * uncertainty bound, avoiding a "late" label one day after the point estimate.
 */
export function periodTimingStatus(
  today: ISODate,
  nextPeriodStart: ISODate | null,
  uncertaintyDays: number,
): PeriodTimingStatus {
  if (!nextPeriodStart) {
    return {
      state: 'unknown',
      lowerBound: null,
      upperBound: null,
      daysBeyondWindow: 0,
    }
  }

  const band = Math.max(0, Math.trunc(uncertaintyDays))
  const lowerBound = addDays(nextPeriodStart, -band)
  const upperBound = addDays(nextPeriodStart, band)
  const todayEpoch = toEpochDay(today)
  const lowerEpoch = toEpochDay(lowerBound)
  const upperEpoch = toEpochDay(upperBound)
  return {
    state:
      todayEpoch < lowerEpoch
        ? 'before-estimated-window'
        : todayEpoch <= upperEpoch
          ? 'within-estimated-window'
          : 'beyond-estimated-window',
    lowerBound,
    upperBound,
    daysBeyondWindow: todayEpoch > upperEpoch ? daysBetween(upperBound, today) : 0,
  }
}
