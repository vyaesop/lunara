import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'

/**
 * Direct-manipulation horizontal swipe.
 *
 * The content tracks the pointer from the first pixel of movement rather than
 * waiting for the gesture to end and then jumping — a threshold-on-release
 * swipe feels unresponsive because nothing acknowledges the drag while it is
 * happening.
 *
 * The gesture commits on either distance or flick velocity, so a short fast
 * flick works as well as a slow deliberate drag. Vertical intent is detected
 * within a small slop and hands the gesture back to the scroller untouched.
 */

export type DragDirection = -1 | 1

/** Past this much movement we decide whether the gesture is a swipe or a scroll. */
const AXIS_LOCK_SLOP = 6
/** Fraction of the element's width that counts as a committed drag. */
const COMMIT_DISTANCE_RATIO = 0.2
/** px per ms — a flick this fast commits regardless of distance. */
const COMMIT_VELOCITY = 0.35
/** Movement beyond one full extent is damped rather than followed 1:1. */
const OVERDRAG_RESISTANCE = 0.35
const SETTLE_MS = 280

interface DragOrigin {
  id: number
  x: number
  y: number
  extent: number
  axis: 'unknown' | 'x' | 'y'
}

interface Sample {
  x: number
  t: number
}

export interface HorizontalDragOptions {
  /** Direction is +1 when dragging left (towards the next item). */
  onCommit: (direction: DragDirection) => void
  enabled?: boolean
}

export interface HorizontalDrag {
  /** Live pointer offset in px, or the settle target while animating. */
  offset: number
  dragging: boolean
  settling: boolean
  /** True while a tap should be swallowed because a drag just happened. */
  shouldSuppressClick: () => boolean
  handlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void
    onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void
    onPointerUp: (event: ReactPointerEvent<HTMLElement>) => void
    onPointerCancel: (event: ReactPointerEvent<HTMLElement>) => void
    onClickCapture: (event: ReactMouseEvent<HTMLElement>) => void
  }
}

function damped(distance: number, extent: number): number {
  const limit = extent || 1
  if (Math.abs(distance) <= limit) return distance
  const excess = Math.abs(distance) - limit
  return Math.sign(distance) * (limit + excess * OVERDRAG_RESISTANCE)
}

export function useHorizontalDrag({
  onCommit,
  enabled = true,
}: HorizontalDragOptions): HorizontalDrag {
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [settling, setSettling] = useState(false)
  const origin = useRef<DragOrigin | null>(null)
  const samples = useRef<Sample[]>([])
  const suppressClick = useRef(false)
  const settleTimer = useRef<number | undefined>(undefined)

  useEffect(
    () => () => {
      if (settleTimer.current !== undefined) window.clearTimeout(settleTimer.current)
    },
    [],
  )

  const finish = useCallback(
    (direction: DragDirection | null, extent: number) => {
      setDragging(false)
      setSettling(true)
      // Commit animates the content the rest of the way out; a rejected drag
      // springs back to centre. Both use the same settle duration so the
      // gesture always resolves with the same weight.
      setOffset(direction === null ? 0 : -direction * extent)
      if (settleTimer.current !== undefined) window.clearTimeout(settleTimer.current)
      settleTimer.current = window.setTimeout(() => {
        setSettling(false)
        setOffset(0)
        if (direction !== null) onCommit(direction)
      }, SETTLE_MS)
    },
    [onCommit],
  )

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || !event.isPrimary) return
      // Interrupting a settle would strand the offset mid-animation.
      if (settleTimer.current !== undefined) {
        window.clearTimeout(settleTimer.current)
        settleTimer.current = undefined
        setSettling(false)
        setOffset(0)
      }
      origin.current = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        extent: event.currentTarget.getBoundingClientRect().width,
        axis: 'unknown',
      }
      samples.current = [{ x: event.clientX, t: event.timeStamp }]
      suppressClick.current = false
    },
    [enabled],
  )

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const start = origin.current
    if (!start || start.id !== event.pointerId) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y

    if (start.axis === 'unknown') {
      if (Math.abs(dx) < AXIS_LOCK_SLOP && Math.abs(dy) < AXIS_LOCK_SLOP) return
      start.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (start.axis === 'x') {
        // Capture only once the gesture is ours, so a vertical scroll started
        // inside this element still reaches the page scroller. Capture is an
        // optimisation for pointers that leave the element — if the browser
        // refuses it, the drag must still work.
        try {
          event.currentTarget.setPointerCapture(event.pointerId)
        } catch {
          // No capture available; pointer events still arrive while inside.
        }
        setDragging(true)
      }
    }
    if (start.axis !== 'x') return

    suppressClick.current = true
    samples.current.push({ x: event.clientX, t: event.timeStamp })
    if (samples.current.length > 6) samples.current.shift()
    setOffset(damped(dx, start.extent))
  }, [])

  const settle = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const start = origin.current
      origin.current = null
      if (!start || start.id !== event.pointerId) return
      if (start.axis !== 'x') {
        setDragging(false)
        return
      }

      const dx = event.clientX - start.x
      const window_ = samples.current
      const first = window_[0]
      const last = window_[window_.length - 1]
      const elapsed = last && first ? last.t - first.t : 0
      const velocity = elapsed > 0 ? (last.x - first.x) / elapsed : 0
      samples.current = []

      const travelled = Math.abs(dx) >= start.extent * COMMIT_DISTANCE_RATIO
      const flicked = Math.abs(velocity) >= COMMIT_VELOCITY
      // A flick must agree with the drag direction, or a quick reversal would
      // commit the way the finger no longer intends.
      const direction: DragDirection = dx < 0 ? 1 : -1
      const flickAgrees = velocity === 0 || Math.sign(velocity) === Math.sign(dx)

      if (dx !== 0 && (travelled || flicked) && flickAgrees) {
        finish(direction, start.extent)
      } else {
        finish(null, start.extent)
      }

      // Release the tap guard after the click that ends this gesture.
      window.setTimeout(() => {
        suppressClick.current = false
      }, 0)
    },
    [finish],
  )

  return {
    offset,
    dragging,
    settling,
    shouldSuppressClick: () => suppressClick.current,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: settle,
      onPointerCancel: settle,
      onClickCapture: (event) => {
        if (!suppressClick.current) return
        event.preventDefault()
        event.stopPropagation()
      },
    },
  }
}
