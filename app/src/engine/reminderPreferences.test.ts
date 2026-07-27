import { describe, expect, it } from 'vitest'
import {
  defaultReminderPreferences,
  parseReminderPreferences,
  serializeReminderPreferences,
  updateReminderPlan,
  withReminderGlobals,
  withReminderPermission,
} from './reminderPreferences'

const options = {
  timeZone: 'America/Chicago',
  startDate: '2026-07-26',
} as const

describe('reminder preferences', () => {
  it('creates reviewed private presets for every settings category', () => {
    const preferences = defaultReminderPreferences(options)
    expect(preferences.plans.map((plan) => plan.id)).toEqual([
      'settings-cycle',
      'settings-contraception',
      'settings-medication',
      'settings-bbt',
      'settings-opk',
      'settings-pregnancy',
      'settings-lifestyle',
    ])
    expect(preferences.plans.every((plan) => plan.preview?.mode === 'private')).toBe(true)
    expect(preferences.plans.every((plan) => plan.quietHours?.enabled)).toBe(true)
  })

  it('migrates the old one-time setting into the cycle check-in without inventing others', () => {
    const preferences = defaultReminderPreferences({ ...options, legacyTime: '08:45' })
    expect(preferences.plans.find((plan) => plan.id === 'settings-cycle')).toMatchObject({
      enabled: true,
      localTime: '08:45',
    })
    expect(preferences.plans.filter((plan) => plan.enabled)).toHaveLength(1)
  })

  it('persists editable state and reapplies global privacy controls to every plan', () => {
    let preferences = defaultReminderPreferences(options)
    preferences = updateReminderPlan(preferences, 'bbt', {
      enabled: true,
      localTime: '06:35',
    })
    preferences = withReminderGlobals(preferences, {
      privatePreviews: false,
      quietHours: { start: '21:30', end: '08:00' },
    })
    preferences = withReminderPermission(preferences, 'granted')
    const restored = parseReminderPreferences(serializeReminderPreferences(preferences), options)

    expect(restored.plans.find((plan) => plan.id === 'settings-bbt')).toMatchObject({
      enabled: true,
      localTime: '06:35',
      permission: 'granted',
    })
    expect(restored.plans.every((plan) => plan.preview?.mode === 'category')).toBe(true)
    expect(restored.plans.every((plan) => plan.quietHours?.start === '21:30')).toBe(true)
  })

  it('falls back safely when persisted JSON or editable fields are malformed', () => {
    expect(parseReminderPreferences('{bad json', options).plans).toHaveLength(7)
    const restored = parseReminderPreferences(
      JSON.stringify({
        privatePreviews: true,
        quietHours: { enabled: true, start: 'noon', end: '07:00' },
        plans: [
          {
            id: 'settings-cycle',
            enabled: true,
            localTime: '29:99',
            permission: 'mystery',
          },
        ],
      }),
      options,
    )
    expect(restored.quietHours.start).toBe('22:00')
    expect(restored.plans[0]).toMatchObject({
      enabled: true,
      localTime: '20:30',
      permission: 'not-requested',
    })
  })
})
