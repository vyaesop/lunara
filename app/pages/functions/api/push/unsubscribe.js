// Forgets a device when its user turns the daily check-in off.
import { validEndpoint } from './subscribe'

export const onRequestPost = async ({ request, env }) => {
  const body = await request.json().catch(() => null)
  if (!body || !validEndpoint(body.endpoint)) return new Response('Bad request', { status: 400 })
  await env.DB.prepare('DELETE FROM push_subs WHERE endpoint = ?').bind(body.endpoint).run()
  return new Response(null, { status: 204 })
}
