import type { MouseEventHandler, PropsWithChildren } from 'react'
import type { ReaderMode } from '@shared/types'

type ReaderLayoutProps = PropsWithChildren<{
  mode: ReaderMode
  onActivate: () => void
  onMouseEnter: MouseEventHandler<HTMLElement>
  onMouseLeave: MouseEventHandler<HTMLElement>
}>

export function ReaderLayout({
  mode,
  onActivate,
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
        {mode === 'hidden' ? (
          <button
            className="reader-window__activation-strip"
            onMouseMove={() => onActivate()}
            aria-label="Activate reader"
          />
        ) : null}
        <div className="reader-window__content">{children}</div>
      </div>
    </section>
  )
}
