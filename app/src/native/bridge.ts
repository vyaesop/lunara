import { registerPlugin } from '@capacitor/core'

const lunaraNativeBridge = registerPlugin('LunaraNative')

/**
 * Returns the single shared Capacitor proxy with a feature-specific type.
 * Keeping registration here avoids duplicate-plugin warnings when multiple
 * native service modules are imported together.
 */
export function getLunaraNativeBridge<T extends object>(): T {
  return lunaraNativeBridge as unknown as T
}
