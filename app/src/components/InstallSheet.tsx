import { useState } from 'react'
import { iosBrowser, promptInstall, useInstallMode, type InstallMode } from '../web/install'
import { Sheet } from './Sheet'

function stepsFor(mode: InstallMode): string[] {
  switch (mode) {
    case 'ios':
      switch (iosBrowser()) {
        case 'safari26':
          return [
            'Tap the ••• button next to the address bar.',
            'Tap Share, then scroll down and tap Add to Home Screen.',
            'Keep “Open as Web App” on and tap Add.',
          ]
        case 'safari':
          return [
            'Tap the Share button (the square with an arrow) in the toolbar.',
            'Scroll down and tap Add to Home Screen.',
            'Tap Add.',
          ]
        case 'chrome':
          return [
            'Tap the Share button in the address bar.',
            'Tap Add to Home Screen, then Add.',
          ]
        default:
          return [
            'Open this page in Safari. Other iPhone browsers may not offer Add to Home Screen.',
            'In Safari, tap Share, then Add to Home Screen.',
          ]
      }
    case 'android':
      return [
        'Open the browser menu (⋮ in the top corner).',
        'Tap Install app or Add to Home screen.',
      ]
    case 'desktop':
      return [
        'Chrome or Edge: click the install icon at the right end of the address bar.',
        'Safari on Mac: choose File › Add to Dock.',
      ]
    case 'in-app':
      return [
        'This in-app viewer cannot install apps. Copy the link below.',
        'Paste it into Safari (iPhone) or Chrome (Android), then install from there.',
      ]
    default:
      return []
  }
}

export function InstallSheet({ onClose }: { onClose: () => void }) {
  const mode = useInstallMode()
  const [copied, setCopied] = useState(false)
  const steps = stepsFor(mode)

  async function copyLink() {
    await navigator.clipboard?.writeText(location.origin).catch(() => undefined)
    setCopied(true)
  }

  return (
    <Sheet title="Install Lunara" onClose={onClose}>
      {mode === 'installed' || mode === 'native' ? (
        <p className="install-lead">Lunara is installed on this device.</p>
      ) : (
        <>
          <p className="install-lead">
            Add Lunara to your home screen and it opens like any other app: full screen, offline, and
            with a daily check-in notification.
          </p>
          {mode === 'prompt' ? (
            <button className="cta" type="button" onClick={() => void promptInstall()}>
              Install Lunara
            </button>
          ) : (
            <ol className="install-steps">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          )}
          {mode === 'in-app' && (
            <button className="cta secondary" type="button" onClick={() => void copyLink()}>
              {copied ? 'Link copied' : 'Copy link'}
            </button>
          )}
          {mode === 'ios' && iosBrowser().startsWith('safari') && (
            <p className="muted">These buttons are in Safari’s bar below this sheet. Close it first.</p>
          )}
        </>
      )}
      <p className="muted">
        Everything you log stays on this device. Removing the home-screen app also removes its
        history, so export a backup from Settings first.
      </p>
    </Sheet>
  )
}
