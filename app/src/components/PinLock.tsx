import { useEffect, useState } from 'react'
import { hashPin } from '../crypto/vault'
import { getSetting, SK } from '../db/schema'
import {
  authenticateWithBiometrics,
  getBiometricStatus,
  type BiometricKind,
} from '../native/biometrics'
import { useApp } from '../state/appStore'

export function PinLock() {
  const setLocked = useApp((s) => s.setLocked)
  const [entered, setEntered] = useState('')
  const [shake, setShake] = useState(false)
  const [biometricKind, setBiometricKind] = useState<BiometricKind>('none')
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const enabled = (await getSetting(SK.biometricLock)) === '1'
      if (!enabled) return
      const status = await getBiometricStatus()
      if (!alive || !status.available || !status.enrolled) return
      setBiometricKind(status.kind)
      await unlockWithBiometrics()
    })().catch(() => undefined)
    return () => {
      alive = false
    }
  }, [])

  async function unlockWithBiometrics() {
    setAuthBusy(true)
    setAuthError(null)
    try {
      const result = await authenticateWithBiometrics()
      if (result.authenticated) {
        setLocked(false)
      } else if (result.errorCode && result.errorCode !== 'USER_CANCEL') {
        setAuthError('Biometric unlock was unavailable. Use your PIN.')
      }
    } catch {
      setAuthError('Biometric unlock was unavailable. Use your PIN.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function press(d: string) {
    const next = entered + d
    setEntered(next)
    if (next.length === 4) {
      const [salt, hash] = await Promise.all([getSetting(SK.pinSalt), getSetting(SK.pinHash)])
      if (salt && hash && (await hashPin(next, salt)) === hash) {
        setLocked(false)
      } else {
        setShake(true)
        setTimeout(() => {
          setEntered('')
          setShake(false)
        }, 350)
      }
    }
  }

  return (
    <div className="overlay" style={{ zIndex: 60, justifyContent: 'center', gap: 28 }}>
      <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 800 }}>Enter PIN</h2>
      <div className="pin-dots" style={shake ? { animation: 'fade-in 100ms 3 alternate' } : undefined}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`pin-dot${entered.length > i ? ' filled' : ''}`} />
        ))}
      </div>
      {biometricKind !== 'none' && (
        <button className="biometric-unlock" disabled={authBusy} onClick={unlockWithBiometrics}>
          <span aria-hidden="true">{biometricKind === 'face' ? '◎' : '◉'}</span>
          {authBusy
            ? 'Checking…'
            : biometricKind === 'face'
              ? 'Unlock with Face ID'
              : 'Unlock with biometrics'}
        </button>
      )}
      {authError && <p className="error-text" style={{ textAlign: 'center' }}>{authError}</p>}
      <div className="pin-pad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              className="pin-key"
              onClick={() => (k === '⌫' ? setEntered(entered.slice(0, -1)) : press(k))}
            >
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
