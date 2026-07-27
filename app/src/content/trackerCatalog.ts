import {
  ACTIVITY_EVENTS,
  DIGESTION_EVENTS,
  DISCHARGES,
  FLOWS,
  LIFESTYLE_EVENTS,
  MOODS,
  PREGNANCY_TEST_RESULTS,
  SEX_OPTIONS,
  SYMPTOMS,
  TRACKER_GROUPS,
} from '../db/taxonomy'

export interface TrackerSection {
  id: string
  label: string
  description: string
  itemCount: number
}

export interface TrackerCustomization {
  order: string[]
  hidden: string[]
}

export const TRACKER_CUSTOMIZATION_KEY = 'trackerCustomization'

export const TRACKER_CATALOG: readonly TrackerSection[] = [
  {
    id: 'flow',
    label: 'Period flow',
    description: 'Bleeding level and clots',
    itemCount: FLOWS.length,
  },
  {
    id: 'symptoms',
    label: 'Symptoms',
    description: 'Pain, digestion, energy, skin, and body changes',
    itemCount: SYMPTOMS.length,
  },
  {
    id: 'mood',
    label: 'Mood',
    description: 'Emotions, energy, and focus',
    itemCount: MOODS.length,
  },
  {
    id: 'discharge',
    label: 'Discharge',
    description: 'Texture and spotting',
    itemCount: DISCHARGES.length,
  },
  {
    id: 'intimacy',
    label: 'Sex & drive',
    description: 'Private intimacy notes',
    itemCount: SEX_OPTIONS.length,
  },
  {
    id: 'fertility',
    label: 'Fertility',
    description: 'Basal temperature, ovulation tests, and pregnancy tests',
    itemCount: 2 + PREGNANCY_TEST_RESULTS.length,
  },
  {
    id: 'digestion',
    label: 'Digestion',
    description: 'Appetite, nausea, bloating, and stool changes',
    itemCount: DIGESTION_EVENTS.length,
  },
  {
    id: 'movement',
    label: 'Movement',
    description: 'How your body moved today',
    itemCount: ACTIVITY_EVENTS.length,
  },
  {
    id: 'wellbeing',
    label: 'Daily context',
    description: 'Lifestyle events that can add context to patterns',
    itemCount: LIFESTYLE_EVENTS.length,
  },
  ...TRACKER_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    description: group.description,
    itemCount: group.items.length,
  })),
  {
    id: 'measurements',
    label: 'Daily measurements',
    description: 'Weight, water, sleep, and steps',
    itemCount: 4,
  },
  {
    id: 'notes',
    label: 'Notes',
    description: 'Free-form private context',
    itemCount: 1,
  },
]

export const DEFAULT_TRACKER_ORDER = TRACKER_CATALOG.map((section) => section.id)

export function normalizeTrackerCustomization(value: unknown): TrackerCustomization {
  const candidate =
    value && typeof value === 'object'
      ? (value as { order?: unknown; hidden?: unknown })
      : {}
  const known = new Set(DEFAULT_TRACKER_ORDER)
  const suppliedOrder = Array.isArray(candidate.order)
    ? candidate.order.filter((id): id is string => typeof id === 'string' && known.has(id))
    : []
  const order = [...new Set([...suppliedOrder, ...DEFAULT_TRACKER_ORDER])]
  const hidden = Array.isArray(candidate.hidden)
    ? [
        ...new Set(
          candidate.hidden.filter((id): id is string => typeof id === 'string' && known.has(id)),
        ),
      ]
    : []
  return { order, hidden }
}
