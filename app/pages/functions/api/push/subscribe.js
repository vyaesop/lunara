// Saves a device's daily check-in (src/web/push.ts). Stored: the push endpoint, the
// clock time and the time zone. Pushes carry no payload, so no encryption keys are kept,
// and nothing about the user's cycle ever reaches this table.
import { isCheckInTime, isTimeZone, nextCheckInAt } from '../../../../src/web/checkInSchedule'

/** Real push services only, so nobody can make the sender POST to arbitrary hosts. */
const PUSH_HOSTS =
  /^(fcm\.googleapis\.com|android\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)$/

export const validEndpoint = (value) => {
  if (typeof value !== 'string' || value.length > 1024) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && PUSH_HOSTS.test(url.hostname)
  } catch {
    return false
  }
}

export const onRequestPost = async ({ request, env }) => {
  const body = await request.json().catch(() => null)
  if (
    !body ||
    !validEndpoint(body.endpoint) ||
    !isCheckInTime(body.localTime) ||
    !isTimeZone(body.timeZone)
  ) {
    return new Response('Bad request', { status: 400 })
  }
  const nextAt = nextCheckInAt(body.localTime, body.timeZone, Date.now())
  await env.DB.prepare(
    `INSERT INTO push_subs (endpoint, local_time, time_zone, next_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(endpoint) DO UPDATE SET local_time = ?2, time_zone = ?3, next_at = ?4, failures = 0`,
  )
    .bind(body.endpoint, body.localTime, body.timeZone, nextAt, new Date().toISOString())
    .run()
  return new Response(null, { status: 204 })
}
