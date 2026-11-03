import { useState } from 'react'
import { useInstallMode } from '../web/install'
import { InstallSheet } from './InstallSheet'

const SNOOZE_KEY = 'lunara.installCardSnoozedUntil'
const SNOOZE_MS = 7 * 86_400_000

function snoozed(): boolean {
  try {
    return Number(localStorage.getItem(SNOOZE_KEY) ?? 0) > Date.now()
  } catch {
    return false
  }
}

/** Web build: a dismissible nudge to add Lunara to the home screen. */
export function InstallCard() {
  const mode = useInstallMode()
  const [hidden, setHidden] = useState(snoozed)
  const [sheetOpen, setSheetOpen] = useState(false)

  if (mode === 'native' || mode === 'installed') return null

  function dismiss() {
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS))
    } catch {
      // Private mode: the card simply comes back next visit.
    }
    setHidden(true)
  }

  return (
    <>
      {!hidden && (
        <aside className="card install-card">
          <div>
            <strong>Get the Lunara app</strong>
            <p className="muted">Add it to your home screen for offline use and a daily check-in.</p>
          </div>
          <div className="install-card-actions">
            <button type="button" className="install-card-primary" onClick={() => setSheetOpen(true)}>
              Install
            </button>
            <button type="button" className="install-card-dismiss" onClick={dismiss}>
              Not now
            </button>
          </div>
        </aside>
      )}
      {sheetOpen && <InstallSheet onClose={() => setSheetOpen(false)} />}
    </>
  )
}
