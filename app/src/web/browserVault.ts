/**
 * Browser fallback for the native keychain/keystore vault.
 *
 * Secrets are sealed with AES-256-GCM under a non-extractable device key. The
 * key lives in IndexedDB as a CryptoKey object, so page scripts can use it but
 * never read its bytes out. This is weaker than a hardware keychain (the
 * browser profile still holds both), and Settings labels it that way.
 */

const DB_NAME = 'lunara-web-vault'
const STORE = 'items'
const DEVICE_KEY = '__device-key'

interface SealedSecret {
  iv: Uint8Array<ArrayBuffer>
  data: ArrayBuffer
}

function openVault(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const database = await openVault()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(database.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result as T)
      request.onerror = () => reject(request.error)
    })
  } finally {
    database.close()
  }
}

async function deviceKey(): Promise<CryptoKey> {
  const existing = await run<CryptoKey | undefined>('readonly', (store) => store.get(DEVICE_KEY))
  if (existing) return existing
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ])
  await run('readwrite', (store) => store.put(key, DEVICE_KEY))
  return key
}

export async function browserVaultSet(name: string, value: string): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await deviceKey(),
    new TextEncoder().encode(value),
  )
  await run('readwrite', (store) => store.put({ iv, data } satisfies SealedSecret, name))
}

export async function browserVaultGet(name: string): Promise<string | null> {
  const sealed = await run<SealedSecret | undefined>('readonly', (store) => store.get(name))
  if (!sealed) return null
  try {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: sealed.iv },
      await deviceKey(),
      sealed.data,
    )
    return new TextDecoder().decode(plain)
  } catch {
    // The device key was cleared by the browser; the secret cannot be recovered.
    return null
  }
}

export async function browserVaultDelete(name: string): Promise<void> {
  await run('readwrite', (store) => store.delete(name))
}

/** Removes every secret and the device key itself. */
export async function browserVaultClear(): Promise<void> {
  await run('readwrite', (store) => store.clear())
}

export const browserVaultAvailable = () =>
  typeof indexedDB !== 'undefined' && typeof crypto?.subtle !== 'undefined'
