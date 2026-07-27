import type { DailyLog } from '../db/schema'
import { PERI_SYMPTOMS } from '../db/taxonomy'
import { addDays, daysBetween, toEpochDay, type ISODate } from './cycle'
import { completedCycles, periodEpisodes } from './stats'

export type PeriDomainId =
  | 'temperature'
  | 'sleep'
  | 'thinking'
  | 'mood'
  | 'body'
  | 'cycle'

export interface PeriDomainScore {
  id: PeriDomainId
  label: string
  activeDays: number
  score: number
  signals: string[]
}

export interface PeriWindowSummary {
  start: ISODate
  end: ISODate
  score: number
  loggedDays: number
  trackingCoverage: number
  domains: PeriDomainScore[]
}

export interface PeriObservation {
  id: string
  title: string
  detail: string
  level: 'note' | 'worth-discussing'
}

export interface PerimenopauseSummary extends PeriWindowSummary {
  trend: 'not-enough-data' | 'easing' | 'steady' | 'increasing'
  trendPoints: number | null
  observations: PeriObservation[]
  methodology: string
}

interface DomainRule {
  id: Exclude<PeriDomainId, 'cycle'>
  label: string
  signals: readonly string[]
}

const DOMAIN_RULES: DomainRule[] = [
  {
    id: 'temperature',
    label: 'Hot flashes & sweats',
    signals: ['Hot flashes', 'Night sweats'],
  },
  {
    id: 'sleep',
    label: 'Sleep',
    signals: [
      'Insomnia',
      'Interrupted sleep',
      'Trouble falling asleep',
      'Woke too early',
      'Light sleep',
    ],
  },
  {
    id: 'thinking',
    label: 'Focus & memory',
    signals: ['Brain fog', 'Low energy', 'Fatigue'],
  },
  {
    id: 'mood',
    label: 'Mood',
    signals: ['Mood swings', 'Irritable', 'Anxious', 'Sad', 'Sensitive', 'Restless'],
  },
  {
    id: 'body',
    label: 'Body discomfort',
    signals: ['Joint pain', 'Muscle aches', 'Headache', 'Migraine', 'Dry skin'],
  },
]

function logSignals(log: DailyLog): string[] {
  return [...(log.symptoms ?? []), ...(log.moods ?? []), ...(log.events ?? [])]
}

function hasAnyEntry(log: DailyLog): boolean {
  return Boolean(
    log.flow ||
      log.symptoms?.length ||
      log.moods?.length ||
      log.events?.length ||
      log.discharge ||
      log.sex ||
      log.bbt !== undefined ||
      log.opk ||
      log.weightKg !== undefined ||
      log.waterMl !== undefined ||
      log.sleepMinutes !== undefined ||
      log.steps !== undefined ||
      log.notes,
  )
}

function inRange(date: ISODate, start: ISODate, end: ISODate): boolean {
  return toEpochDay(date) >= toEpochDay(start) && toEpochDay(date) <= toEpochDay(end)
}

/**
 * A self-tracking burden score, not a menopause likelihood score. Each logged
 * day contributes up to three active symptom domains. Unlogged days are
 * excluded from burden and included only in the separate coverage figure.
 */
export function periWindowSummary(
  logs: DailyLog[],
  end: ISODate,
  days = 28,
): PeriWindowSummary {
  const start = addDays(end, -(days - 1))
  const windowLogs = logs.filter((log) => hasAnyEntry(log) && inRange(log.date, start, end))
  const byDate = new Map<ISODate, DailyLog[]>()
  for (const log of windowLogs) {
    const dateLogs = byDate.get(log.date) ?? []
    dateLogs.push(log)
    byDate.set(log.date, dateLogs)
  }

  const domainActiveDays = new Map<PeriDomainId, Set<ISODate>>()
  for (const rule of DOMAIN_RULES) domainActiveDays.set(rule.id, new Set())
  let dailyBurdenTotal = 0

  for (const [date, dateLogs] of byDate) {
    const signals = new Set(dateLogs.flatMap(logSignals))
    const activeDomains = DOMAIN_RULES.filter((rule) =>
      rule.signals.some((signal) => signals.has(signal)),
    )
    for (const domain of activeDomains) domainActiveDays.get(domain.id)?.add(date)
    dailyBurdenTotal += Math.min(activeDomains.length, 3) / 3
  }

  const loggedDays = byDate.size
  const domains: PeriDomainScore[] = DOMAIN_RULES.map((rule) => {
    const activeDates = domainActiveDays.get(rule.id) ?? new Set()
    const observedSignals = new Set<string>()
    for (const log of windowLogs) {
      for (const signal of logSignals(log)) {
        if (rule.signals.includes(signal)) observedSignals.add(signal)
      }
    }
    return {
      id: rule.id,
      label: rule.label,
      activeDays: activeDates.size,
      score: loggedDays ? Math.round((activeDates.size / loggedDays) * 100) : 0,
      signals: [...observedSignals],
    }
  })

  return {
    start,
    end,
    score: loggedDays ? Math.round((dailyBurdenTotal / loggedDays) * 100) : 0,
    loggedDays,
    trackingCoverage: Math.round((loggedDays / days) * 100),
    domains,
  }
}

function periodObservations(
  logs: DailyLog[],
  periodStarts: ISODate[],
  today: ISODate,
): PeriObservation[] {
  const observations: PeriObservation[] = []
  const cycles = completedCycles([...new Set(periodStarts)].sort()).slice(-6)
  const lengths = cycles.map((cycle) => cycle.length)
  const episodes = periodEpisodes(logs.filter((log) => log.flow).map((log) => log.date)).slice(-6)

  if (lengths.length >= 3) {
    const range = Math.max(...lengths) - Math.min(...lengths)
    if (range >= 7) {
      observations.push({
        id: 'cycle-variation',
        title: 'Cycle timing has shifted',
        detail: `Your last ${lengths.length} completed cycles span ${Math.min(...lengths)}–${Math.max(...lengths)} days, a ${range}-day range.`,
        level: 'worth-discussing',
      })
    }
  }

  const outlyingLengths = lengths.filter((length) => length < 21 || length > 35)
  if (outlyingLengths.length) {
    observations.push({
      id: 'cycle-lengths',
      title: 'Some recent cycles sit outside 21–35 days',
      detail: `${outlyingLengths.length} of your last ${lengths.length} completed cycles were shorter than 21 or longer than 35 days.`,
      level: 'note',
    })
  }

  if (lengths.some((length) => length >= 60)) {
    observations.push({
      id: 'long-gap',
      title: 'A 60-day gap appears in your history',
      detail:
        'Long gaps can have many causes. Save the dates for a conversation with a healthcare professional.',
      level: 'worth-discussing',
    })
  }

  if (episodes.some((episode) => episode.days > 7)) {
    observations.push({
      id: 'long-bleeding',
      title: 'Bleeding longer than seven days was logged',
      detail:
        'A clinician can help review the amount, timing, medicines, contraception, and other possible causes.',
      level: 'worth-discussing',
    })
  }

  const lastStart = [...periodStarts].sort().at(-1)
  if (lastStart && daysBetween(lastStart, today) >= 90) {
    observations.push({
      id: 'no-recent-period',
      title: 'No period start is logged in at least 90 days',
      detail:
        'Pregnancy, medications, health conditions, and the menopausal transition are among many possible explanations. This tracker cannot tell which applies.',
      level: 'worth-discussing',
    })
  }

  const periSignals = logs
    .filter((log) => inRange(log.date, addDays(today, -27), today))
    .flatMap(logSignals)
    .filter((signal) => PERI_SYMPTOMS.includes(signal as (typeof PERI_SYMPTOMS)[number]))
  if (periSignals.length) {
    observations.push({
      id: 'symptom-log',
      title: 'Midlife-associated symptoms are in your recent log',
      detail: `${new Set(periSignals).size} tracked symptom ${new Set(periSignals).size === 1 ? 'type appears' : 'types appear'} in the current 28-day view.`,
      level: 'note',
    })
  }

  return observations
}

export function buildPerimenopauseSummary(
  logs: DailyLog[],
  periodStarts: ISODate[],
  today: ISODate,
): PerimenopauseSummary {
  const current = periWindowSummary(logs, today)
  const previousEnd = addDays(current.start, -1)
  const previous = periWindowSummary(logs, previousEnd)
  const canCompare = current.loggedDays >= 5 && previous.loggedDays >= 5
  const trendPoints = canCompare ? current.score - previous.score : null
  let trend: PerimenopauseSummary['trend'] = 'not-enough-data'
  if (trendPoints !== null) {
    trend = trendPoints >= 10 ? 'increasing' : trendPoints <= -10 ? 'easing' : 'steady'
  }

  return {
    ...current,
    trend,
    trendPoints,
    observations: periodObservations(logs, periodStarts, today),
    methodology:
      'The score summarizes symptom-domain burden among days containing an entry. It is not a hormone measure, perimenopause stage, diagnosis, or comparison with other people.',
  }
}

export function periMonthlyTimeline(
  logs: DailyLog[],
  today: ISODate,
  windows = 6,
): PeriWindowSummary[] {
  const output: PeriWindowSummary[] = []
  for (let index = windows - 1; index >= 0; index--) {
    output.push(periWindowSummary(logs, addDays(today, -(index * 28))))
  }
  return output
}
