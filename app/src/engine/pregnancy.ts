import { addDays, daysBetween, type ISODate } from './cycle'

export const GESTATION_DAYS = 280 // 40 weeks from LMP (Naegele's rule)

export interface GestationInfo {
  week: number // completed weeks, 1-based display convention below
  dayOfWeek: number // 0–6 within the current week
  dueDate: ISODate
  trimester: 1 | 2 | 3
  daysRemaining: number
}

export function gestation(lmp: ISODate, today: ISODate): GestationInfo | null {
  const elapsed = daysBetween(lmp, today)
  if (elapsed < 0 || elapsed > GESTATION_DAYS + 21) return null
  const week = Math.floor(elapsed / 7)
  return {
    week,
    dayOfWeek: elapsed % 7,
    dueDate: addDays(lmp, GESTATION_DAYS),
    // ACOG ranges: first through 13w6d, second 14w0d–27w6d,
    // third from 28w0d.
    trimester: week < 14 ? 1 : week < 28 ? 2 : 3,
    daysRemaining: Math.max(GESTATION_DAYS - elapsed, 0),
  }
}
