import { useCallback, useEffect, useState } from 'react'
import { getSetting } from '../db/schema'
import { parseReminderPreferences, REMINDER_SETTINGS_KEY } from '../engine/reminderPreferences'
import { materializeReminderRequests, type ReminderPlan } from '../engine/reminders'
import { localToday } from '../lib/dates'
import { isNative } from '../native/runtime'
import { isIOS, isStandalone } from './install'

/**
 * Web build only: one daily check-in push at a time the user picks.
 *
 * The server (app/pages/functions/api/push, workers/push) stores just the push
 * endpoint, that clock time and the time zone. Pushes carry no content: the
 * service worker (public/push-sw.js) wakes, reads today's reminders from the
 * digest this module leaves in Cache Storage, and writes the notification on
 * the phone. Cycle timing never leaves the device.
 */

/** Same key as VAPID_PUBLIC_KEY in workers/push/wrangler.jsonc. */
const VAPID_PUBLIC_KEY =
  'BH7E9Eiandhl6KWLzuvADZDiu3AwNW1CnTrY_gu-bjJ6cUiKluV8O_fM9XqnW5U6GsPOEQ-yXYntuDhv2434Sek'

export const DIGEST_CACHE = 'lunara-reminders'
export const DIGEST_PATH = '/__digest'
export const DEFAULT_CHECK_IN_TIME = '20:00'

/** on/off, or why the check-in cannot be turned on here. */
export type PushState = 'on' | 'off' | 'denied' | 'needs-install' | 'unsupported'

const supported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function blockedState(): PushState | null {
  if (isNative) return 'unsupported'
  // Safari on iPhone and iPad offers push only to apps added to the Home Screen.
  if (!supported()) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return null
}

const keyBytes = (b64url: string) =>
  Uint8Array.from(atob(b64url.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

/** getRegistration answers at once; serviceWorker.ready would wait forever without a worker. */
const currentSubscription = async () =>
  (await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription()) ?? null

async function save(endpoint: string, localTime: string): Promise<void> {
  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint,
      localTime,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  })
  if (!response.ok) throw new Error('Could not reach the check-in service. Try again later.')
}

/** Must run from a tap: browsers only ask for permission after a user gesture. */
export async function enableCheckIn(localTime: string): Promise<PushState> {
  const blocked = blockedState()
  if (blocked) return blocked
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'
  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
    }))
  await save(subscription.endpoint, localTime)
  return 'on'
}

export async function updateCheckInTime(localTime: string): Promise<void> {
  const subscription = await currentSubscription()
  if (subscription) await save(subscription.endpoint, localTime)
}

export async function disableCheckIn(): Promise<void> {
  if (isNative || !supported()) return
  const subscription = await currentSubscription()
  if (!subscription) return
  await fetch('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  }).catch(() => undefined)
  await subscription.unsubscribe()
}

/** The device's real check-in state (null while checking). */
export function usePushState() {
  const [state, setState] = useState<PushState | null>(null)
  const refresh = useCallback(async () => {
    const blocked = blockedState()
    if (blocked) return setState(blocked)
    try {
      setState(
        (await currentSubscription()) && Notification.permission === 'granted' ? 'on' : 'off',
      )
    } catch {
      setState('unsupported')
    }
  }, [])
  useEffect(() => void refresh(), [refresh])
  return [state, setState] as const
}

/**
 * Leave the next 30 days of reminder copy where the service worker can read it.
 * The copy is the same lock-screen-safe text the native shells schedule, so
 * private previews stay private.
 */
export async function shareRemindersWithWorker(plans: ReminderPlan[]): Promise<void> {
  if (isNative || !('caches' in window)) return
  const requests = materializeReminderRequests(plans, {
    now: new Date(),
    horizonDays: 30,
    limit: 128,
  }).map(({ fireAt, title, body }) => ({ fireAt, title, body }))
  const cache = await caches.open(DIGEST_CACHE)
  await cache.put(
    DIGEST_PATH,
    new Response(JSON.stringify({ updatedAt: new Date().toISOString(), requests }), {
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

/** Roll the 30-day digest forward on each launch, from the saved reminder settings. */
export async function refreshReminderDigest(): Promise<void> {
  if (isNative) return
  const raw = await getSetting(REMINDER_SETTINGS_KEY)
  if (!raw) return
  const preferences = parseReminderPreferences(raw, {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    startDate: localToday(),
  })
  await shareRemindersWithWorker(preferences.plans)
}

export async function clearReminderDigest(): Promise<void> {
  if (isNative || !('caches' in window)) return
  await caches.delete(DIGEST_CACHE).catch(() => false)
}
