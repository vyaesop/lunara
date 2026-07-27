import { describe, expect, it } from 'vitest'
import {
  localDateTimeToInstant,
  materializeReminderRequests,
  reminderOccurrenceStatus,
  updateReminderOccurrence,
  validateReminderPlan,
  type ReminderKind,
  type ReminderPlan,
} from './reminders'

function plan(overrides: Partial<ReminderPlan> = {}): ReminderPlan {
  return {
    id: 'daily-check-in',
    kind: 'journaling',
    enabled: true,
    permission: 'granted',
    localTime: '09:00',
    timeZone: 'UTC',
    recurrence: { type: 'daily', startDate: '2026-07-01' },
    ...overrides,
  }
}

describe('reminder schedule model', () => {
  it('rejects invalid local times, timezones, dates, and recurrence intervals', () => {
    expect(() => validateReminderPlan(plan({ localTime: '25:00' }))).toThrow('HH:MM')
    expect(() => validateReminderPlan(plan({ timeZone: 'Moon/Sea-of-Tranquility' }))).toThrow(
      'Unknown time zone',
    )
    expect(() =>
      validateReminderPlan(plan({ recurrence: { type: 'once', date: '2026-02-30' } })),
    ).toThrow('valid calendar date')
    expect(() =>
      validateReminderPlan(
        plan({ recurrence: { type: 'interval-days', startDate: '2026-01-01', every: 0 } }),
      ),
    ).toThrow('positive number')
    expect(() =>
      validateReminderPlan(plan({ recurrence: { type: 'daily', every: 2 } })),
    ).toThrow('require a start date')
  })

  it('materializes only enabled, permitted reminders in chronological order', () => {
    const requests = materializeReminderRequests(
      [
        plan(),
        plan({ id: 'denied', permission: 'denied', localTime: '08:00' }),
        plan({ id: 'disabled', enabled: false, localTime: '07:00' }),
        plan({
          id: 'one-time',
          kind: 'weight',
          localTime: '08:30',
          recurrence: { type: 'once', date: '2026-07-27' },
        }),
      ],
      { now: new Date('2026-07-26T12:00:00.000Z'), horizonDays: 2 },
    )
    expect(requests.map((request) => [request.reminderId, request.fireAt])).toEqual([
      ['one-time', '2026-07-27T08:30:00.000Z'],
      ['daily-check-in', '2026-07-27T09:00:00.000Z'],
      ['daily-check-in', '2026-07-28T09:00:00.000Z'],
    ])
  })

  it('supports weekdays and interval schedules used by user-configured method reminders', () => {
    const requests = materializeReminderRequests(
      [
        plan({
          id: 'weekdays',
          kind: 'movement',
          recurrence: { type: 'weekdays', weekdays: [1, 3, 5] },
        }),
        plan({
          id: 'interval',
          kind: 'contraception-ring',
          localTime: '12:00',
          recurrence: { type: 'interval-days', startDate: '2026-07-01', every: 7 },
        }),
      ],
      { now: new Date('2026-07-26T00:00:00.000Z'), horizonDays: 11 },
    )
    expect(
      requests.filter((request) => request.reminderId === 'weekdays').map((request) => request.fireAt),
    ).toEqual([
      '2026-07-27T09:00:00.000Z',
      '2026-07-29T09:00:00.000Z',
      '2026-07-31T09:00:00.000Z',
      '2026-08-03T09:00:00.000Z',
      '2026-08-05T09:00:00.000Z',
    ])
    expect(
      requests.filter((request) => request.reminderId === 'interval').map((request) => request.fireAt),
    ).toEqual(['2026-07-29T12:00:00.000Z', '2026-08-05T12:00:00.000Z'])
  })

  it('handles normal DST offset changes with IANA timezones', () => {
    expect(
      localDateTimeToInstant('2026-03-07', '09:00', 'America/New_York').toISOString(),
    ).toBe('2026-03-07T14:00:00.000Z')
    expect(
      localDateTimeToInstant('2026-03-09', '09:00', 'America/New_York').toISOString(),
    ).toBe('2026-03-09T13:00:00.000Z')
    // 02:30 does not exist on the spring-forward day, so use the first valid
    // local instant after the gap instead of silently moving to another date.
    expect(
      localDateTimeToInstant('2026-03-08', '02:30', 'America/New_York').toISOString(),
    ).toBe('2026-03-08T07:00:00.000Z')
  })

  it('shifts occurrences outside overnight and daytime quiet hours', () => {
    const requests = materializeReminderRequests(
      [
        plan({
          id: 'overnight',
          localTime: '23:30',
          recurrence: { type: 'daily', startDate: '2026-07-26' },
          quietHours: { enabled: true, start: '22:00', end: '07:00' },
        }),
        plan({
          id: 'daytime',
          localTime: '13:30',
          quietHours: { enabled: true, start: '13:00', end: '14:00' },
        }),
      ],
      { now: new Date('2026-07-26T00:00:00.000Z'), horizonDays: 2 },
    )
    expect(requests.find((request) => request.reminderId === 'daytime')?.fireAt).toBe(
      '2026-07-26T14:00:00.000Z',
    )
    expect(requests.find((request) => request.reminderId === 'overnight')?.fireAt).toBe(
      '2026-07-27T07:00:00.000Z',
    )
  })

  it('tracks completion, snooze, reset, and derived missed state without mutation', () => {
    const original = plan({
      recurrence: { type: 'once', date: '2026-07-27' },
    })
    const key = 'daily-check-in:2026-07-27:09:00'
    const completed = updateReminderOccurrence(
      original,
      key,
      'complete',
      new Date('2026-07-27T09:05:00.000Z'),
    )
    expect(original.occurrenceRecords).toBeUndefined()
    expect(
      materializeReminderRequests([completed], {
        now: new Date('2026-07-26T00:00:00.000Z'),
        horizonDays: 2,
      }),
    ).toEqual([])

    const snoozed = updateReminderOccurrence(
      original,
      key,
      'snooze',
      new Date('2026-07-27T08:55:00.000Z'),
      30,
    )
    const snoozedRequest = materializeReminderRequests([snoozed], {
      now: new Date('2026-07-27T09:00:00.000Z'),
      horizonDays: 1,
    })[0]
    expect(snoozedRequest.state).toBe('snoozed')
    expect(snoozedRequest.fireAt).toBe('2026-07-27T09:25:00.000Z')
    expect(updateReminderOccurrence(snoozed, key, 'reset', new Date()).occurrenceRecords).toEqual({})

    expect(
      reminderOccurrenceStatus(
        original,
        key,
        new Date('2026-07-27T09:00:00.000Z'),
        new Date('2026-07-27T11:01:00.000Z'),
      ).state,
    ).toBe('missed')
  })

  it('uses privacy-safe text for every supported reminder kind', () => {
    const kinds: ReminderKind[] = [
      'cycle-estimate',
      'period-log',
      'pregnancy-week',
      'bbt',
      'opk',
      'pregnancy-test',
      'medication',
      'contraception-pill',
      'contraception-ring',
      'contraception-patch',
      'contraception-injection',
      'contraception-iud',
      'contraception-implant',
      'prenatal-vitamin',
      'water',
      'sleep',
      'weight',
      'movement',
      'journaling',
    ]
    const requests = materializeReminderRequests(
      kinds.map((kind) =>
        plan({
          id: kind,
          kind,
          preview: { mode: 'category' },
          recurrence: { type: 'once', date: '2026-07-27' },
        }),
      ),
      { now: new Date('2026-07-26T00:00:00.000Z'), horizonDays: 2, limit: 128 },
    )
    expect(requests).toHaveLength(kinds.length)
    for (const request of requests) {
      expect(request.body.toLowerCase()).not.toMatch(
        /fertile|safe sex|contraception|pregnan(t|cy)|period|ovulat|positive|negative|late/,
      )
      expect(request.body).not.toContain(request.kind)
    }
  })

  it('deduplicates deterministic IDs, respects date lists/monthly recurrence, and caps output', () => {
    const requests = materializeReminderRequests(
      [
        plan({
          id: 'estimated-days',
          kind: 'cycle-estimate',
          recurrence: { type: 'dates', dates: ['2026-07-27', '2026-07-30'] },
        }),
        plan({
          id: 'monthly',
          kind: 'contraception-injection',
          recurrence: { type: 'monthly', day: 1 },
        }),
      ],
      { now: new Date('2026-07-26T00:00:00.000Z'), horizonDays: 40, limit: 2 },
    )
    expect(requests).toHaveLength(2)
    expect(new Set(requests.map((request) => request.id)).size).toBe(2)
    expect(
      materializeReminderRequests(
        [
          plan({
            id: 'estimated-days',
            kind: 'cycle-estimate',
            recurrence: { type: 'dates', dates: ['2026-07-27', '2026-07-30'] },
          }),
        ],
        { now: new Date('2026-07-26T00:00:00.000Z'), horizonDays: 40 },
      )[0].id,
    ).toBe(
      materializeReminderRequests(
        [
          plan({
            id: 'estimated-days',
            kind: 'cycle-estimate',
            recurrence: { type: 'dates', dates: ['2026-07-27', '2026-07-30'] },
          }),
        ],
        { now: new Date('2026-07-26T00:00:00.000Z'), horizonDays: 40 },
      )[0].id,
    )
  })
})
