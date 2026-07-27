import { describe, expect, it } from 'vitest'
import { buildCycleForecast } from './cycleForecast'

describe('buildCycleForecast', () => {
  it('uses a robust recent median so one long cycle does not dominate', () => {
    const forecast = buildCycleForecast({
      periodStarts: [
        '2026-01-01',
        '2026-01-29',
        '2026-02-26',
        '2026-04-02',
        '2026-04-30',
      ],
      ovulations: [],
      today: '2026-05-10',
    })
    expect(forecast.diagnostics.includedCycleLengths).toEqual([28, 28, 35, 28])
    expect(forecast.diagnostics.robustCycleLengthDays).toBe(28)
    expect(forecast.prediction.nextPeriodStart).toBe('2026-05-28')
    expect(forecast.prediction.uncertaintyDays).toBeGreaterThanOrEqual(4)
  })

  it('keeps the first-cycle baseline visibly separate from observed history', () => {
    const forecast = buildCycleForecast(
      {
        periodStarts: ['2026-04-01'],
        ovulations: [],
        today: '2026-04-20',
      },
      { baselineCycleLength: 31 },
    )
    expect(forecast.prediction.source).toBe('baseline')
    expect(forecast.prediction.nextPeriodStart).toBe('2026-05-02')
    expect(forecast.prediction.uncertaintyDays).toBe(7)
    expect(forecast.diagnostics.completedCycleCount).toBe(0)
  })

  it('does not invent a forecast when neither history nor a baseline exists', () => {
    const forecast = buildCycleForecast({
      periodStarts: ['2026-04-01'],
      ovulations: [],
      today: '2026-04-20',
    })
    expect(forecast.prediction.nextPeriodStart).toBeNull()
    expect(forecast.prediction.source).toBe('insufficient-data')
    expect(forecast.diagnostics.periodWindow).toBeNull()
  })

  it('surfaces implausible data intervals as exclusions', () => {
    const forecast = buildCycleForecast({
      periodStarts: ['2026-01-01', '2026-01-05', '2026-02-02'],
      ovulations: [],
      today: '2026-02-15',
    })
    expect(forecast.diagnostics.excludedCycleLengths).toEqual([4])
    expect(forecast.diagnostics.includedCycleLengths).toEqual([28])
  })

  it('expresses calendar ovulation as a range and keeps the biological fertile span', () => {
    const forecast = buildCycleForecast({
      periodStarts: ['2026-01-01', '2026-01-29', '2026-02-26', '2026-03-26'],
      ovulations: [],
      today: '2026-04-01',
    })
    expect(forecast.prediction.ovulationDate).toBe('2026-04-09')
    expect(forecast.prediction.fertileWindow).toEqual({
      start: '2026-04-04',
      end: '2026-04-09',
    })
    expect(forecast.diagnostics.ovulationWindow).toEqual({
      start: '2026-04-05',
      end: '2026-04-15',
    })
    expect(forecast.diagnostics.fertileWindowRange).toEqual({
      start: '2026-03-31',
      end: '2026-04-15',
    })
  })

  it('keeps OPK and BBT evidence qualified and bounded to the current cycle', () => {
    const forecast = buildCycleForecast(
      {
        periodStarts: ['2026-03-01', '2026-03-29'],
        ovulations: [],
        today: '2026-04-12',
      },
      {
        positiveOpkDates: ['2026-03-15', '2026-04-10'],
        bbtShiftDates: ['2026-03-16', '2026-04-11'],
      },
    )
    expect(forecast.diagnostics.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'opk-suggestive',
          date: '2026-04-10',
          window: { start: '2026-04-10', end: '2026-04-12' },
        }),
        expect.objectContaining({
          kind: 'bbt-retrospective',
          date: '2026-04-11',
        }),
      ]),
    )
  })

  it('can anchor the next-period range to a retrospective BBT shift when luteal history exists', () => {
    const forecast = buildCycleForecast(
      {
        periodStarts: ['2026-01-01', '2026-01-29', '2026-02-26'],
        ovulations: ['2026-01-15', '2026-02-12', '2026-03-12'],
        today: '2026-03-15',
      },
      {
        bbtShiftDates: ['2026-01-15', '2026-02-12', '2026-03-12'],
      },
    )
    expect(forecast.diagnostics.robustLutealLengthDays).toBe(14)
    expect(forecast.diagnostics.forecastAnchor).toBe('bbt-luteal')
    expect(forecast.prediction.source).toBe('luteal')
    expect(forecast.prediction.nextPeriodStart).toBe('2026-03-26')
    expect(forecast.prediction.ovulationDate).toBe('2026-03-12')
  })
})
