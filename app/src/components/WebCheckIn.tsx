import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { getSetting, setSetting, SK } from '../db/schema'
import {
  DEFAULT_CHECK_IN_TIME,
  disableCheckIn,
  enableCheckIn,
  updateCheckInTime,
  usePushState,
} from '../web/push'

/** Web build: the one daily push that carries the reminders above. */
export function WebCheckIn({ onInstall }: { onInstall: () => void }) {
  const [state, setState] = usePushState()
  const time = useLiveQuery(() => getSetting(SK.webCheckInTime), []) ?? DEFAULT_CHECK_IN_TIME
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the daily check-in.')
    } finally {
      setBusy(false)
    }
  }

  const toggle = (on: boolean) =>
    run(async () => {
      if (on) {
        await setSetting(SK.webCheckInTime, time)
        setState(await enableCheckIn(time))
      } else {
        await disableCheckIn()
        setState('off')
      }
    })

  const changeTime = (next: string) =>
    run(async () => {
      if (!next) return
      await setSetting(SK.webCheckInTime, next)
      if (state === 'on') await updateCheckInTime(next)
    })

  const detail =
    state === 'needs-install'
      ? 'On iPhone, notifications work once Lunara is on your Home Screen.'
      : state === 'denied'
        ? 'Notifications are blocked for this site in your browser settings.'
        : state === 'unsupported'
          ? 'This browser cannot receive notifications.'
          : 'One notification a day with today’s reminders. The server knows only this time.'

  return (
    <div className="reminder-quiet-block web-check-in">
      <label className="reminder-privacy-row">
        <span>
          <strong>Daily check-in</strong>
          <small>{detail}</small>
        </span>
        {state === 'needs-install' ? (
          <button type="button" className="web-check-in-install" onClick={onInstall}>
            Install
          </button>
        ) : (
          <span className="reminder-switch">
            <input
              type="checkbox"
              checked={state === 'on'}
              disabled={busy || state === null || state === 'denied' || state === 'unsupported'}
              onChange={(event) => void toggle(event.currentTarget.checked)}
              aria-label="Daily check-in notification"
            />
            <span aria-hidden="true" />
          </span>
        )}
      </label>
      {state === 'on' && (
        <div className="reminder-quiet-times">
          <label>
            <span>Every day at</span>
            <input
              type="time"
              value={time}
              disabled={busy}
              onChange={(event) => void changeTime(event.currentTarget.value)}
            />
          </label>
        </div>
      )}
      {error && (
        <p className="muted" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
