import { useEffect, useId, useRef, type ReactNode } from 'react'

/** Bottom sheet with backdrop. Swipe-to-dismiss lands with the gesture pass (M5). */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const titleId = useId()
  const closeButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', dismissOnEscape)
    closeButton.current?.focus({ preventScroll: true })
    return () => {
      window.removeEventListener('keydown', dismissOnEscape)
      previousFocus?.focus({ preventScroll: true })
    }
  }, [onClose])

  return (
    <>
      <button
        type="button"
        className="sheet-backdrop"
        aria-label={`Close ${title}`}
        onClick={onClose}
      />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-grip" />
        <div className="sheet-head">
          <span className="sheet-head-spacer" aria-hidden="true" />
          <div className="sheet-title" id={titleId}>{title}</div>
          <button
            ref={closeButton}
            type="button"
            className="sheet-close"
            aria-label="Close"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m7 7 10 10M17 7 7 17" />
            </svg>
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </>
  )
}
