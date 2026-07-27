/**
 * Reminder email templates. HARD RULE: these must never contain any health,
 * cycle, or symptom term — the whole privacy stance depends on the message
 * being content-free. The wording is generic on purpose; the app decides
 * locally what the reminder is about. Enforced by templates.test.js.
 */

export function subjectFor(appName) {
  return `A reminder from ${appName}`
}

export function bodyFor(appName, unsubUrl) {
  return {
    text: `You have a reminder waiting in ${appName}. Open the app to see it.\n\nTo stop these emails: ${unsubUrl}`,
    html: `<p>You have a reminder waiting in ${appName}. Open the app to see it.</p><p style="color:#8a7580;font-size:12px">To stop these emails, <a href="${unsubUrl}">unsubscribe</a>.</p>`,
  }
}

/** Words that must never appear in any reminder — the test asserts this. */
export const FORBIDDEN_TERMS = [
  'period',
  'cycle',
  'ovulation',
  'ovulating',
  'fertile',
  'fertility',
  'pregnan',
  'menstrual',
  'menstruation',
  'symptom',
  'flow',
  'bleeding',
  'pill',
  'birth control',
  'bbt',
  'temperature',
  'perimenopause',
  'menopause',
  'discharge',
  'cramps',
  'due date',
]
