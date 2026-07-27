import {
  addDays,
  daysBetween,
  fertileWindow,
  getCycleDay,
  isForecastAnchorLive,
  STALE_HISTORY_DAYS,
  type EngineInput,
  type ISODate,
  type Prediction,
} from './cycle'

export type ForecastEvidenceKind = 'calendar' | 'opk-suggestive' | 'bbt-retrospective'

export interface ForecastEvidence {
  kind: ForecastEvidenceKind
  date?: ISODate
  window?: { start: ISODate; end: ISODate }
  explanation: string
}

export interface CycleForecastDiagnostics {
  completedCycleCount: number
  includedCycleLengths: number[]
  excludedCycleLengths: number[]
  robustCycleLengthDays: number | null
  robustLutealLengthDays: number | null
  medianAbsoluteDeviationDays: number | null
  forecastAnchor: 'none' | 'baseline' | 'cycle-median' | 'bbt-luteal'
  /**
   * True when the most recent period start is too old to extrapolate from.
   * Current-cycle figures are withheld rather than counted across the gap.
   */
  stale: boolean
  /** Days since the most recent logged period start, or null when none exists. */
  daysSinceLastPeriodStart: number | null
  periodWindow: { start: ISODate; end: ISODate } | null
  ovulationWindow: { start: ISODate; end: ISODate } | null
  fertileWindowRange: { start: ISODate; end: ISODate } | null
  evidence: ForecastEvidence[]
  methodology: string
}

export interface CycleForecast {
  prediction: Prediction
  diagnostics: CycleForecastDiagnostics
}

export interface CycleForecastOptions {
  /** User-reported typical length, used only before a completed cycle exists. */
  baselineCycleLength?: number
  /** Number of recent completed cycles retained. */
  historyLimit?: number
  /** Positive OPK dates in the current or prior cycles. */
  positiveOpkDates?: ISODate[]
  /** Retrospective BBT-shift estimates, never described as confirmation. */
  bbtShiftDates?: ISODate[]
}

const MIN_DATA_INTERVAL = 15
const MAX_DATA_INTERVAL = 90

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

function uniqueSorted(dates: ISODate[]): ISODate[] {
  return [...new Set(dates)].sort()
}

function completedIntervals(periodStarts: ISODate[]): number[] {
  const starts = uniqueSorted(periodStarts)
  const intervals: number[] = []
  for (let index = 0; index < starts.length - 1; index++) {
    intervals.push(daysBetween(starts[index], starts[index + 1]))
  }
  return intervals
}

function completedLutealIntervals(
  periodStarts: ISODate[],
  ovulations: ISODate[],
): number[] {
  const starts = uniqueSorted(periodStarts)
  const intervals: number[] = []
  for (const ovulation of uniqueSorted(ovulations)) {
    const nextPeriod = starts.find((start) => start > ovulation)
    if (!nextPeriod) continue
    const interval = daysBetween(ovulation, nextPeriod)
    if (interval >= 9 && interval <= 18) intervals.push(interval)
  }
  return intervals.slice(-6)
}

function uncertaintyFromHistory(lengths: number[], mad: number): number {
  if (lengths.length === 0) return 7
  if (lengths.length === 1) return 7
  if (lengths.length === 2) {
    return Math.min(14, Math.max(5, Math.ceil(Math.abs(lengths[1] - lengths[0]) / 2) + 3))
  }

  const center = median(lengths)
  const residuals = lengths
    .map((length) => Math.abs(length - center))
    .sort((left, right) => left - right)
  const coverageResidual = residuals[Math.ceil((residuals.length - 1) * 0.8)]
  // 1.4826 × MAD approximates standard deviation for a stable distribution.
  // The extra two days prevents a falsely precise one-day forecast.
  const robustSpread = Math.ceil(Math.max(mad * 1.4826, coverageResidual) + 2)
  return Math.min(14, Math.max(2, robustSpread))
}

function evidenceFor(
  today: ISODate,
  latestPeriodStart: ISODate | undefined,
  options: CycleForecastOptions,
): ForecastEvidence[] {
  const evidence: ForecastEvidence[] = [
    {
      kind: 'calendar',
      explanation:
        'The calendar estimate uses the median of recent completed cycle lengths and displays a range.',
    },
  ]

  const currentCycle = (date: ISODate) =>
    !latestPeriodStart || (date >= latestPeriodStart && date <= today)

  const lastPositiveOpk = uniqueSorted(options.positiveOpkDates ?? [])
    .filter(currentCycle)
    .at(-1)
  if (lastPositiveOpk) {
    evidence.push({
      kind: 'opk-suggestive',
      date: lastPositiveOpk,
      window: { start: lastPositiveOpk, end: addDays(lastPositiveOpk, 2) },
      explanation:
        'A positive OPK suggests an LH surge. It can support a short ovulation window but does not confirm ovulation.',
    })
  }

  const lastBbtShift = uniqueSorted(options.bbtShiftDates ?? [])
    .filter(currentCycle)
    .at(-1)
  if (lastBbtShift) {
    evidence.push({
      kind: 'bbt-retrospective',
      date: lastBbtShift,
      window: { start: lastBbtShift, end: lastBbtShift },
      explanation:
        'A sustained temperature shift adds retrospective support for an estimate; it does not confirm an exact ovulation day.',
    })
  }

  return evidence
}

/**
 * Transparent v2 cycle forecast.
 *
 * This deliberately avoids a universal 28-day assumption and resists one
 * unusual interval by using a recent median and median absolute deviation.
 * Intervals outside 15–90 days are surfaced as data-quality exclusions rather
 * than silently becoming health conclusions. Context such as hormonal
 * contraception, pregnancy, PCOS, or perimenopause is applied by the separate
 * prediction policy layer.
 */
export function buildCycleForecast(
  input: EngineInput,
  options: CycleForecastOptions = {},
): CycleForecast {
  const historyLimit = Math.max(1, Math.trunc(options.historyLimit ?? 6))
  const allIntervals = completedIntervals(input.periodStarts)
  const includedCycleLengths = allIntervals
    .filter((days) => days >= MIN_DATA_INTERVAL && days <= MAX_DATA_INTERVAL)
    .slice(-historyLimit)
  const excludedCycleLengths = allIntervals.filter(
    (days) => days < MIN_DATA_INTERVAL || days > MAX_DATA_INTERVAL,
  )
  const latestPeriodStart = uniqueSorted(input.periodStarts).at(-1)
  const currentBbtShift = uniqueSorted(options.bbtShiftDates ?? input.ovulations)
    .filter(
      (date) =>
        date <= input.today &&
        (latestPeriodStart === undefined || date >= latestPeriodStart),
    )
    .at(-1)
  const lutealIntervals = completedLutealIntervals(
    input.periodStarts,
    options.bbtShiftDates ?? input.ovulations,
  )
  const robustLutealLength =
    lutealIntervals.length > 0 ? median(lutealIntervals) : null
  const robustLength =
    includedCycleLengths.length > 0
      ? median(includedCycleLengths)
      : options.baselineCycleLength !== undefined &&
          Number.isFinite(options.baselineCycleLength)
        ? Math.min(60, Math.max(15, options.baselineCycleLength))
        : null
  const mad =
    includedCycleLengths.length > 0 && robustLength !== null
      ? median(includedCycleLengths.map((length) => Math.abs(length - robustLength)))
      : null
  const uncertaintyDays = uncertaintyFromHistory(includedCycleLengths, mad ?? 0)

  // Staleness is decided before anything is derived. Once the newest period
  // start is older than the policy window, the gap — not the cycle — is what
  // any further arithmetic would be measuring.
  const daysSinceLastPeriodStart =
    latestPeriodStart === undefined ? null : daysBetween(latestPeriodStart, input.today)
  const stale =
    daysSinceLastPeriodStart !== null && daysSinceLastPeriodStart > STALE_HISTORY_DAYS

  const anchorCandidate = stale
    ? null
    : currentBbtShift && robustLutealLength !== null
      ? addDays(currentBbtShift, Math.round(robustLutealLength))
      : latestPeriodStart && robustLength !== null
        ? addDays(latestPeriodStart, Math.round(robustLength))
        : null
  // An anchor keeps its value while a period can still be described as late.
  // Past that it has expired, and reporting it would clamp to "in 0 days".
  const nextPeriodStart =
    anchorCandidate !== null &&
    isForecastAnchorLive(anchorCandidate, input.today, uncertaintyDays)
      ? anchorCandidate
      : null
  const periodWindow =
    nextPeriodStart === null
      ? null
      : {
          start: addDays(nextPeriodStart, -uncertaintyDays),
          end: addDays(nextPeriodStart, uncertaintyDays),
        }

  // Calendar-only ovulation timing is expressed as a window: roughly 10–16
  // days before the next period window. The point is retained only for compact
  // UI compatibility and must always be accompanied by the displayed range.
  const ovulationDate = stale
    ? null
    : (currentBbtShift ?? (nextPeriodStart ? addDays(nextPeriodStart, -14) : null))
  const ovulationWindow =
    periodWindow === null
      ? null
      : {
          start: addDays(periodWindow.start, -16),
          end: addDays(periodWindow.end, -10),
        }
  const fertileWindowRange =
    ovulationWindow === null
      ? null
      : {
          start: addDays(ovulationWindow.start, -5),
          end: ovulationWindow.end,
        }

  const prediction: Prediction = {
    nextPeriodStart,
    ovulationDate,
    fertileWindow: ovulationDate ? fertileWindow(ovulationDate) : null,
    uncertaintyDays,
    cycleDay: getCycleDay(input.periodStarts, input.today, input.today),
    averageCycleLength:
      includedCycleLengths.length > 0
        ? includedCycleLengths.reduce((sum, value) => sum + value, 0) /
          includedCycleLengths.length
        : robustLength ?? 0,
    source:
      stale || nextPeriodStart === null
        ? 'insufficient-data'
        : currentBbtShift && robustLutealLength !== null
          ? 'luteal'
        : includedCycleLengths.length === 0
          ? 'baseline'
          : 'basic',
  }

  return {
    prediction,
    diagnostics: {
      completedCycleCount: includedCycleLengths.length,
      includedCycleLengths,
      excludedCycleLengths,
      robustCycleLengthDays: robustLength,
      robustLutealLengthDays: robustLutealLength,
      medianAbsoluteDeviationDays: mad,
      forecastAnchor:
        stale || nextPeriodStart === null
          ? 'none'
          : currentBbtShift && robustLutealLength !== null
            ? 'bbt-luteal'
            : includedCycleLengths.length === 0
              ? 'baseline'
              : 'cycle-median',
      stale,
      daysSinceLastPeriodStart,
      periodWindow,
      ovulationWindow,
      fertileWindowRange,
      evidence: evidenceFor(input.today, latestPeriodStart, options),
      methodology:
        'Recent completed cycle intervals are summarized with a median. The range uses median absolute deviation plus a minimum uncertainty floor; it is an estimate, not birth control, conception advice, or confirmation of ovulation.',
    },
  }
}
