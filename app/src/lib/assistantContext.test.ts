import { describe, expect, it } from 'vitest'
import type { DailyLog } from '../db/schema'
import {
  buildApprovedAssistantContext,
  NO_ASSISTANT_CONSENT,
  parseAssistantConsent,
  type AssistantContextSource,
} from './assistantContext'

const source: AssistantContextSource = {
  today: '2026-07-26',
  goal: 'ttc',
  pregnancyLMP: '2026-06-10',
  periodStarts: ['2026-05-01', '2026-05-29', '2026-06-27'],
  ovulations: ['2026-06-13'],
  logs: [
    {
      date: '2026-07-20',
      symptoms: ['cramps'],
      moods: ['calm'],
      notes: 'private free text',
      bbt: 3670,
      opk: 'positive',
      sex: 'unprotected',
    },
  ] satisfies DailyLog[],
}

describe('assistant context consent boundary', () => {
  it('returns no metadata or tracker data when every category is off', () => {
    expect(buildApprovedAssistantContext(source, NO_ASSISTANT_CONSENT)).toEqual({})
  })

  it('includes only the selected category', () => {
    const context = buildApprovedAssistantContext(source, {
      cycle: false,
      symptoms: true,
      fertility: false,
      notes: false,
    })

    expect(context.sharedCategories).toEqual(['symptoms'])
    expect(context.symptoms).toEqual([
      {
        date: '2026-07-20',
        symptoms: ['cramps'],
        moods: ['calm'],
        events: undefined,
      },
    ])
    expect(context).not.toHaveProperty('cycle')
    expect(context).not.toHaveProperty('fertilityAndPregnancy')
    expect(context).not.toHaveProperty('notes')
    expect(JSON.stringify(context)).not.toContain('private free text')
    expect(JSON.stringify(context)).not.toContain('unprotected')
  })

  it('does not include pregnancy timing outside pregnancy mode', () => {
    const context = buildApprovedAssistantContext(source, {
      cycle: false,
      symptoms: false,
      fertility: true,
      notes: false,
    })
    expect(
      (context.fertilityAndPregnancy as { pregnancyLMP?: string }).pregnancyLMP,
    ).toBeUndefined()
  })

  it('treats malformed persisted consent as no consent', () => {
    expect(parseAssistantConsent('{broken')).toEqual(NO_ASSISTANT_CONSENT)
    expect(parseAssistantConsent('{"cycle":true,"notes":"yes"}')).toEqual({
      cycle: true,
      symptoms: false,
      fertility: false,
      notes: false,
    })
  })
})
