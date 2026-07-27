import { describe, expect, it } from 'vitest'
import { screenAssistantUrgency } from './assistantSafety'

describe('assistant deterministic safety screen', () => {
  it.each([
    ['I want to kill myself', 'immediate-danger'],
    ['I am pregnant and bleeding', 'urgent-pregnancy'],
    ['positive pregnancy test and severe one-sided pain', 'urgent-pregnancy'],
    ['I have chest pain', 'urgent-physical'],
    ['I am soaking a pad every hour', 'urgent-physical'],
  ])('intercepts %s before a provider call', (message, category) => {
    expect(screenAssistantUrgency(message)?.category).toBe(category)
  })

  it.each([
    'Why can cramps happen?',
    'What does spotting sometimes mean?',
    'How do I explain cycle variation to my clinician?',
  ])('does not overclaim urgency for a general question: %s', (message) => {
    expect(screenAssistantUrgency(message)).toBeNull()
  })
})
