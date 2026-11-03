# Lunara daily check-in (web build)

Web Push for the installable web app at https://lunara-ecm.pages.dev. iPhone web
apps cannot schedule notifications on the device, so a server has to send them.
To keep cycle timing off the server, it sends **one content-free push a day**, at
a clock time the user picks.

- **Stored per device** (D1 `lunara-push`, `schema.sql`): the push endpoint, the
  `HH:MM` time, the IANA time zone and the next send time. No push encryption
  keys, no health data, no account.
- **Written by** the Pages Functions in `app/pages/functions/api/push/`
  (`subscribe`, `unsubscribe`), same origin as the app.
- **Sent by** this Worker: cron every 5 minutes, up to 40 devices per run, VAPID
  signed, no payload. Gone devices (404/410) are deleted; 5 failures in a row
  deletes a device. A check-in more than 3 hours late is skipped, not sent at night.
- **Shown by** `app/public/push-sw.js`: the phone reads today's reminders from the
  digest the app keeps in Cache Storage (`app/src/web/push.ts`) and writes the
  notification itself, in the user's private-preview wording.

Both sides compute send times with `app/src/web/checkInSchedule.ts` (tested).

## Deploy

```sh
npx wrangler d1 execute lunara-push --remote --file schema.sql   # once
npx wrangler secret put VAPID_PRIVATE_KEY < .secrets/vapid-private.jwk.json
npx wrangler deploy
```

Cost: one cron trigger, 288 runs a day, one indexed D1 read per run plus one write
per send. Free tier.

The email relay in `workers/reminders` is a separate, undeployed experiment.
