import type { MouseEventHandler, PropsWithChildren } from 'react'
import type { ReaderMode } from '@shared/types'

type ReaderLayoutProps = PropsWithChildren<{
  mode: ReaderMode
  onClose: () => void
  onMouseEnter: MouseEventHandler<HTMLElement>
  onMouseLeave: MouseEventHandler<HTMLElement>
}>

export function ReaderLayout({
  mode,
  onClose,
  onMouseEnter,
  onMouseLeave,
  children,
}: ReaderLayoutProps) {
  return (
    <section
      className={`reader-window reader-window--${mode}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="reader-window__panel">
        <div className="reader-window__drag-rail" />
        <div className="reader-window__toolbar">
          <p className="reader-window__mode">{mode === 'hidden' ? 'Hidden Lens' : 'Reading Lens'}</p>
          <button className="reader-window__hide-button" onClick={onClose} aria-label="Close reader">
            Close
          </button>
        </div>
        <div className="reader-window__content">{children}</div>
      </div>
    </section>
  )
}
