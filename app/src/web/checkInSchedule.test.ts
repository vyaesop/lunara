import { describe, expect, it } from 'vitest'
import { isCheckInTime, isTimeZone, nextCheckInAt } from './checkInSchedule'

const iso = (ms: number) => new Date(ms).toISOString()

describe('nextCheckInAt', () => {
  it('returns later today when the time has not passed yet', () => {
    // 10:00 in Addis Ababa (UTC+3) -> 20:00 Addis is 17:00 UTC the same day.
    const after = Date.parse('2026-11-03T07:00:00Z')
    expect(iso(nextCheckInAt('20:00', 'Africa/Addis_Ababa', after))).toBe('2026-11-03T17:00:00.000Z')
  })

  it('rolls to tomorrow once the time has passed', () => {
    const after = Date.parse('2026-11-03T17:00:00Z')
    expect(iso(nextCheckInAt('20:00', 'Africa/Addis_Ababa', after))).toBe('2026-11-04T17:00:00.000Z')
  })

  it('keeps the wall-clock time across a DST change', () => {
    // New York leaves DST on 2026-11-01: 08:00 is 12:00 UTC before, 13:00 UTC after.
    const before = Date.parse('2026-10-31T00:00:00Z')
    expect(iso(nextCheckInAt('08:00', 'America/New_York', before))).toBe('2026-10-31T12:00:00.000Z')
    const after = Date.parse('2026-11-01T00:00:00Z')
    expect(iso(nextCheckInAt('08:00', 'America/New_York', after))).toBe('2026-11-01T13:00:00.000Z')
  })

  it('handles zones ahead of UTC across midnight', () => {
    // 07:30 in Auckland (UTC+13 in November) is 18:30 UTC the previous day.
    const after = Date.parse('2026-11-03T12:00:00Z')
    expect(iso(nextCheckInAt('07:30', 'Pacific/Auckland', after))).toBe('2026-11-03T18:30:00.000Z')
  })
})

describe('input checks', () => {
  it('accepts only HH:MM times', () => {
    expect(isCheckInTime('08:05')).toBe(true)
    expect(isCheckInTime('24:00')).toBe(false)
    expect(isCheckInTime('8:05')).toBe(false)
  })

  it('accepts only real IANA zones', () => {
    expect(isTimeZone('Africa/Addis_Ababa')).toBe(true)
    expect(isTimeZone('Mars/Olympus')).toBe(false)
    expect(isTimeZone(42)).toBe(false)
  })
})
