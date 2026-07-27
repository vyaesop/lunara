import { describe, expect, it } from 'vitest'
import { PERIMENOPAUSE_RELIEF } from './perimenopauseRelief'
import {
  PREGNANCY_CHECKLISTS,
  pregnancyWeekDetail,
} from './pregnancyGuide'
import {
  DEFAULT_TRACKER_ORDER,
  TRACKER_CATALOG,
  normalizeTrackerCustomization,
} from './trackerCatalog'

describe('pregnancy guide content', () => {
  it('returns bounded week details across the full supported range', () => {
    expect(pregnancyWeekDetail(-4).week).toBe(0)
    expect(pregnancyWeekDetail(14).trimester).toBe(2)
    expect(pregnancyWeekDetail(28).trimester).toBe(3)
    expect(pregnancyWeekDetail(50).week).toBe(42)
    expect(pregnancyWeekDetail(42).focus.length).toBeGreaterThan(20)
  })

  it('uses unique persistent checklist ids', () => {
    const ids = PREGNANCY_CHECKLISTS.flatMap((group) => group.items.map((item) => item.id))
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('tracker customization', () => {
  it('keeps known supplied order and appends new catalog sections', () => {
    const normalized = normalizeTrackerCustomization({
      order: ['notes', 'flow', 'unknown'],
      hidden: ['mood', 'unknown'],
    })
    expect(normalized.order.slice(0, 2)).toEqual(['notes', 'flow'])
    expect(normalized.order).toHaveLength(TRACKER_CATALOG.length)
    expect(normalized.hidden).toEqual(['mood'])
  })

  it('falls back safely for malformed values', () => {
    expect(normalizeTrackerCustomization('bad')).toEqual({
      order: DEFAULT_TRACKER_ORDER,
      hidden: [],
    })
  })
})

describe('perimenopause relief content', () => {
  it('contains one option per supported domain', () => {
    expect(new Set(PERIMENOPAUSE_RELIEF.map((item) => item.domain))).toEqual(
      new Set(['temperature', 'sleep', 'thinking', 'mood', 'body', 'cycle']),
    )
  })
})
