import { useEffect, useState } from 'react'
import { isNative } from '../native/runtime'

// Chrome and Edge fire beforeinstallprompt once, often before React mounts, so
// it is captured at import time and handed to the install sheet later.

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const subscribers = new Set<() => void>()
const notify = () => subscribers.forEach((subscriber) => subscriber())

if (typeof window !== 'undefined' && !isNative) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferred = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    notify()
  })
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  notify()
  return outcome === 'accepted'
}

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/**
 * How this visitor can install Lunara:
 * native     running inside the iOS or Android shell
 * installed  already opened from the home screen
 * prompt     the browser offered its own install dialog (Chrome, Edge, Samsung Internet)
 * in-app     inside Instagram, Telegram, Facebook...: their viewers cannot install,
 *            so the page has to be opened in the real browser first
 * ios        Safari on iPhone/iPad: Share > Add to Home Screen (no install dialog exists)
 * android    Chrome has not offered its dialog yet: use the menu
 * desktop    the address-bar install icon, or Safari's Add to Dock
 */
export type InstallMode = 'native' | 'installed' | 'prompt' | 'in-app' | 'ios' | 'android' | 'desktop'

const IN_APP_BROWSER =
  /FBAN|FBAV|FB_IAB|Instagram|Line\/|Snapchat|Twitter|Telegram|Reddit|TikTok|musical_ly|; wv\)/i

export function installMode(): InstallMode {
  if (isNative) return 'native'
  if (isStandalone()) return 'installed'
  if (deferred) return 'prompt'
  if (IN_APP_BROWSER.test(navigator.userAgent)) return 'in-app'
  if (isIOS()) return 'ios'
  return /android/i.test(navigator.userAgent) ? 'android' : 'desktop'
}

/**
 * Which iPhone/iPad browser, for the install steps. Safari 26 (iOS 26) hides
 * Share behind the ... button next to the address bar; older Safari shows Share
 * in its toolbar; Chrome has Share in its address bar.
 */
export type IosBrowser = 'safari26' | 'safari' | 'chrome' | 'other'

export function iosBrowser(): IosBrowser {
  const ua = navigator.userAgent
  if (/CriOS/.test(ua)) return 'chrome'
  if (/FxiOS|EdgiOS|OPiOS|YaBrowser|DuckDuckGo/.test(ua)) return 'other'
  const version = Number(/Version\/(\d+)/.exec(ua)?.[1] ?? 0)
  return version >= 26 ? 'safari26' : 'safari'
}

export function useInstallMode(): InstallMode {
  const [mode, setMode] = useState(installMode)
  useEffect(() => {
    const refresh = () => setMode(installMode())
    subscribers.add(refresh)
    return () => void subscribers.delete(refresh)
  }, [])
  return mode
}

/**
 * Ask the browser to keep Lunara's storage under pressure. Installed iPhone
 * apps are exempt from Safari's 7-day eviction; this covers the rest.
 */
export async function requestPersistentStorage(): Promise<void> {
  if (isNative || !navigator.storage?.persist) return
  if (await navigator.storage.persisted().catch(() => false)) return
  await navigator.storage.persist().catch(() => false)
}
