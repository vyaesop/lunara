/**
 * Lunara daily check-in sender.
 *
 * Every 5 minutes, push to the devices whose chosen check-in time has come. Pushes
 * carry no payload: the phone's service worker (app/public/push-sw.js) writes the
 * notification from reminders stored on the device. One VAPID signature per push
 * service covers every device on it, which keeps a run well inside the free plan's
 * 10 ms CPU. Rows are written by the Pages Functions in app/pages/functions/api/push.
 */
import { nextCheckInAt } from '../../../app/src/web/checkInSchedule'

/** Free Workers allow 50 subrequests per invocation; anything left waits 5 minutes. */
const BATCH = 40
const MAX_FAILURES = 5
/** A check-in hours late (sender down, backlog) is skipped, not sent at night. */
const STALE_MS = 3 * 3600 * 1000
/** How long a push service keeps trying a phone that is offline. */
const TTL_SECONDS = 4 * 3600

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sendDue(env))
  },

  async fetch() {
    return new Response('Not found', { status: 404 })
  },
}

const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

/** `Authorization: vapid ...` for one push service (audience), valid 12 hours. */
async function vapidHeader(env, key, endpoint) {
  const part = (value) => b64url(new TextEncoder().encode(JSON.stringify(value)))
  const claims = {
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: env.VAPID_SUBJECT,
  }
  const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part(claims)}`
  // WebCrypto returns the raw r||s signature JWS expects.
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(unsigned),
  )
  return `vapid t=${unsigned}.${b64url(signature)}, k=${env.VAPID_PUBLIC_KEY}`
}

export async function sendDue(env) {
  if (!env.VAPID_PRIVATE_KEY) return { skipped: 'VAPID_PRIVATE_KEY is not set' }
  const now = Date.now()
  const { results } = await env.DB.prepare(
    'SELECT endpoint, local_time, time_zone, next_at, failures FROM push_subs WHERE next_at <= ? ORDER BY next_at LIMIT ?',
  )
    .bind(now, BATCH)
    .all()
  if (!results.length) return { sent: 0 }

  const key = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(env.VAPID_PRIVATE_KEY),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const headers = new Map()
  const outcome = { sent: 0, stale: 0, gone: 0, failed: 0 }
  const statements = []

  await Promise.all(
    results.map(async (row) => {
      const nextAt = nextCheckInAt(row.local_time, row.time_zone, now)
      if (now - row.next_at > STALE_MS) {
        outcome.stale++
        statements.push(env.DB.prepare('UPDATE push_subs SET next_at = ? WHERE endpoint = ?').bind(nextAt, row.endpoint))
        return
      }
      const origin = new URL(row.endpoint).origin
      if (!headers.has(origin)) headers.set(origin, vapidHeader(env, key, row.endpoint))
      let status = 0
      try {
        const response = await fetch(row.endpoint, {
          method: 'POST',
          headers: {
            Authorization: await headers.get(origin),
            TTL: String(TTL_SECONDS),
            Urgency: 'normal',
            // A newer check-in replaces an undelivered older one.
            Topic: 'check-in',
            'Content-Length': '0',
          },
        })
        status = response.status
      } catch {
        status = 0
      }
      if (status >= 200 && status < 300) {
        outcome.sent++
        statements.push(
          env.DB.prepare('UPDATE push_subs SET next_at = ?, failures = 0 WHERE endpoint = ?').bind(nextAt, row.endpoint),
        )
      } else if (status === 404 || status === 410) {
        outcome.gone++
        statements.push(env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(row.endpoint))
      } else {
        // Do not retry every 5 minutes: try again at tomorrow's check-in.
        outcome.failed++
        statements.push(
          env.DB.prepare('UPDATE push_subs SET next_at = ?, failures = failures + 1 WHERE endpoint = ?').bind(
            nextAt,
            row.endpoint,
          ),
        )
      }
    }),
  )

  statements.push(env.DB.prepare('DELETE FROM push_subs WHERE failures >= ?').bind(MAX_FAILURES))
  await env.DB.batch(statements)
  return outcome
}
