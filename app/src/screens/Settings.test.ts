import { describe, expect, it } from 'vitest'
import type { HealthSample } from '../native/health'
import {
  groupHealthSamples,
  groupHealthSamplesWithProvenance,
} from '../native/healthImport'

function sample(type: HealthSample['type'], value: HealthSample['value']): HealthSample {
  return {
    id: `${type}-${String(value)}`,
    type,
    startDate: '2026-07-25T10:00:00.000Z',
    endDate: '2026-07-25T11:00:00.000Z',
    value,
    unit: '',
  }
}

describe('native health import mapping', () => {
  it('normalizes and aggregates supported samples by local tracker day', () => {
    const grouped = groupHealthSamples([
      sample('menstrualFlow', 'heavy'),
      sample('basalBodyTemperature', 36.72),
      sample('ovulationTest', 'positive'),
      sample('weight', 64.36),
      sample('sleep', 180),
      sample('sleep', 245),
      sample('steps', 4200),
      sample('steps', 3100),
    ])

    expect(grouped.get('2026-07-25')).toEqual({
      flow: 'heavy',
      bbt: 3672,
      opk: 'positive',
      weightKg: 64.4,
      sleepMinutes: 425,
      steps: 7300,
    })
  })

  it('does not guess raw platform category enum values', () => {
    const grouped = groupHealthSamples([
      sample('menstrualFlow', 3),
      sample('ovulationTest', 1),
    ])
    expect(grouped.get('2026-07-25')).toBeUndefined()
  })

  it('deduplicates native sample identifiers before summing measurements', () => {
    const duplicate = {
      ...sample('steps', 4200),
      id: 'same-healthkit-uuid',
    }
    const grouped = groupHealthSamples([duplicate, duplicate])
    expect(grouped.get('2026-07-25')?.steps).toBe(4200)
  })

  it('uses the native device-calendar day instead of truncating a UTC timestamp', () => {
    const grouped = groupHealthSamples([
      {
        ...sample('menstrualFlow', 'medium'),
        startDate: '2026-07-26T01:30:00.000Z',
        localDate: '2026-07-25',
      },
    ])
    expect(grouped.get('2026-07-25')?.flow).toBe('medium')
    expect(grouped.has('2026-07-26')).toBe(false)
  })

  it('keeps source UUIDs and HealthKit cycle-start metadata with imported flow', () => {
    const record: HealthSample = {
      ...sample('menstrualFlow', 'light'),
      id: 'flow-uuid',
      source: 'Health',
      sourceBundleIdentifier: 'com.apple.Health',
      metadata: {
        menstrualCycleStart: true,
        wasUserEntered: true,
      },
    }
    const grouped = groupHealthSamplesWithProvenance([record], 'apple-health')
    expect(grouped.days.get('2026-07-25')?.provenance.flow).toEqual({
      provider: 'apple-health',
      sampleIds: ['flow-uuid'],
      sourceNames: ['Health'],
      menstrualCycleStart: true,
    })
  })
})
