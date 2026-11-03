import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { StartupErrorBoundary } from './components/StartupErrorBoundary'
import { initializeNativeRuntime, isNative } from './native/runtime'
import { Onboarding } from './screens/Onboarding'
import { requestPersistentStorage } from './web/install'
import { refreshReminderDigest } from './web/push'
import './styles/base.css'
import './styles/app.css'
import './styles/health-import.css'

if ('serviceWorker' in navigator) {
  if (isNative || import.meta.env.DEV) {
    // The native shells load from disk and own notifications; retire any worker
    // left behind by older builds or a previous web session on this origin.
    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch(() => undefined)
  } else {
    // Installed web app: offline shell plus the daily check-in (public/push-sw.js).
    // Check for a new version whenever the app comes back to the screen, so home-screen
    // installs do not stay on an old build.
    void import('virtual:pwa-register').then(({ registerSW }) =>
      registerSW({
        immediate: true,
        onRegisteredSW(_url, registration) {
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') void registration?.update()
          })
        },
      }),
    )
    void requestPersistentStorage()
    void refreshReminderDigest().catch(() => undefined)
  }
}

void initializeNativeRuntime()

const onboardingPreview =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('preview') === 'onboarding'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StartupErrorBoundary>
      {onboardingPreview ? (
        <Onboarding
          onDone={() => {
            window.location.assign('/')
          }}
        />
      ) : (
        <App />
      )}
    </StartupErrorBoundary>
  </React.StrictMode>,
)
