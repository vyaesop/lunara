import type { PeriDomainId } from '../engine/perimenopause'

export interface ReliefOption {
  id: string
  domain: PeriDomainId
  title: string
  intro: string
  tryNow: readonly string[]
  askAbout: readonly string[]
  sourceUrl: string
}

/**
 * Low-risk organization prompts drawn from public health guidance. These are
 * not personalized treatment recommendations; medical options are always
 * framed as questions for a qualified professional.
 */
export const PERIMENOPAUSE_RELIEF: readonly ReliefOption[] = [
  {
    id: 'cooling',
    domain: 'temperature',
    title: 'Hot flashes & night sweats',
    intro: 'Small environmental changes can make episodes easier to navigate while you track triggers.',
    tryNow: [
      'Dress in removable layers and keep water nearby.',
      'Keep the sleeping space cool and use breathable bedding.',
      'Note whether stress, alcohol, caffeine, or spicy food precedes an episode for you.',
      'Use slow, steady breathing as an episode begins if it feels calming.',
    ],
    askAbout: [
      'Whether hormone or nonhormone treatment options fit your health history.',
      'Whether another condition or medicine could be contributing.',
    ],
    sourceUrl: 'https://www.nia.nih.gov/health/menopause/hot-flashes-what-can-i-do',
  },
  {
    id: 'sleep',
    domain: 'sleep',
    title: 'Sleep changes',
    intro: 'Sleep can be affected directly or interrupted by sweats, pain, mood, or bladder changes.',
    tryNow: [
      'Keep wake time steady, even after a difficult night.',
      'Build a short wind-down routine with dimmer light and fewer screens.',
      'Track whether caffeine, alcohol, late meals, or night sweats line up with waking.',
      'Keep the room cool, quiet, and dark when possible.',
    ],
    askAbout: [
      'Persistent insomnia, loud snoring, breathing pauses, or severe daytime sleepiness.',
      'Whether cognitive behavioral therapy for insomnia or other treatment is appropriate.',
    ],
    sourceUrl:
      'https://www.nia.nih.gov/health/menopause/sleep-problems-and-menopause-what-can-i-do',
  },
  {
    id: 'thinking',
    domain: 'thinking',
    title: 'Focus & memory',
    intro: 'Stress, sleep, mood, medicines, aging, and health conditions can all affect concentration.',
    tryNow: [
      'Keep one capture place for tasks instead of holding them in memory.',
      'Use calendar prompts for medicines, appointments, and important routines.',
      'Protect sleep, meals, movement, and quiet focus time where possible.',
      'Log when fog feels better or worse to give context to a clinician.',
    ],
    askAbout: [
      'New, rapidly worsening, or safety-affecting memory changes.',
      'Sleep, mood, medicine, thyroid, anemia, and other possible contributors.',
    ],
    sourceUrl: 'https://www.nia.nih.gov/health/menopause/what-menopause',
  },
  {
    id: 'mood',
    domain: 'mood',
    title: 'Mood changes',
    intro: 'Hormone shifts may overlap with stress, disrupted sleep, anxiety, depression, and life changes.',
    tryNow: [
      'Name the mood and its intensity instead of judging it.',
      'Notice connections with sleep, cycle timing, alcohol, stress, and social support.',
      'Use brief movement, daylight, breathing, or connection with someone you trust.',
      'Keep a few notes about impact on work, relationships, and daily function.',
    ],
    askAbout: [
      'Therapy, support groups, medicine, or other treatment when mood affects daily life.',
      'Urgent help for thoughts of self-harm, feeling unsafe, or inability to care for yourself.',
    ],
    sourceUrl: 'https://www.nia.nih.gov/health/menopause/what-menopause',
  },
  {
    id: 'body',
    domain: 'body',
    title: 'Joint & body discomfort',
    intro: 'Pain has many possible causes, so timing, location, and functional impact are useful to track.',
    tryNow: [
      'Use comfortable, gradual movement rather than an all-or-nothing routine.',
      'Track location, severity, stiffness, swelling, and what improves or worsens it.',
      'Alternate demanding activity with recovery time.',
      'Support sleep and hydration while you look for a pattern.',
    ],
    askAbout: [
      'Pain with swelling, weakness, injury, fever, or loss of function.',
      'A personalized movement, physical therapy, or pain-management plan.',
    ],
    sourceUrl: 'https://www.nia.nih.gov/health/menopause/what-menopause',
  },
  {
    id: 'cycle',
    domain: 'cycle',
    title: 'Cycle & bleeding changes',
    intro: 'Timing and flow can change during midlife, but new bleeding patterns still deserve context.',
    tryNow: [
      'Log start dates, bleeding days, flow, clots, and between-period spotting.',
      'Record medicines, contraception, pregnancy possibility, and symptoms such as dizziness.',
      'Bring a six-month summary to an appointment.',
    ],
    askAbout: [
      'Periods very close together, heavy bleeding, bleeding after sex, or bleeding lasting over a week.',
      'Any bleeding after 12 months without a period.',
    ],
    sourceUrl: 'https://www.nia.nih.gov/health/menopause/what-menopause',
  },
]

export const PERIMENOPAUSE_SOURCES = [
  {
    label: 'National Institute on Aging: What is menopause?',
    url: 'https://www.nia.nih.gov/health/menopause/what-menopause',
  },
  {
    label: 'Office on Women’s Health: Menopause',
    url: 'https://womenshealth.gov/menopause',
  },
] as const
