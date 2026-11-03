/**
 * When the next daily check-in push is due. Shared by the subscribe Function
 * (app/pages/functions/api/push) and the sender (workers/push), so it stays
 * free of browser and Worker APIs.
 */

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/

export const isCheckInTime = (value: unknown): value is string =>
  typeof value === 'string' && TIME.test(value)

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/** Wall-clock fields of an instant in a time zone. */
function wallClock(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant))
  const field = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return {
    year: field('year'),
    month: field('month'),
    day: field('day'),
    hour: field('hour'),
    minute: field('minute'),
    second: field('second'),
  }
}

/** Milliseconds the zone is ahead of UTC at an instant. */
function offsetAt(instant: number, timeZone: string): number {
  const wall = wallClock(instant, timeZone)
  const asUtc = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second)
  return asUtc - Math.floor(instant / 1000) * 1000
}

/** The instant a wall-clock time occurs on a calendar day in a zone. */
function instantOf(year: number, month: number, day: number, hour: number, minute: number, timeZone: string) {
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const first = guess - offsetAt(guess, timeZone)
  // Re-read the offset at the candidate: it differs when a DST change sits between.
  return guess - offsetAt(first, timeZone)
}

/** The first occurrence of localTime in timeZone strictly after `after` (Unix ms). */
export function nextCheckInAt(localTime: string, timeZone: string, after: number): number {
  const [, hour, minute] = TIME.exec(localTime)!.map(Number)
  const today = wallClock(after, timeZone)
  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day + dayOffset))
    const at = instantOf(
      date.getUTCFullYear(),
      date.getUTCMonth() + 1,
      date.getUTCDate(),
      hour,
      minute,
      timeZone,
    )
    if (at > after) return at
  }
  return after + 86_400_000
}
