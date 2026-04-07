import type { PropsWithChildren } from 'react'

type ReaderLayoutProps = PropsWithChildren<{
  frameTitle: string
  title: string
  meta?: string
  alwaysOnTop: boolean | null
  onToggleAlwaysOnTop: () => void | Promise<void>
  backDisabled?: boolean
  onBack: () => void | Promise<void>
}>

export function ReaderLayout({
  frameTitle,
  title,
  meta,
  alwaysOnTop,
  onToggleAlwaysOnTop,
  backDisabled = false,
  onBack,
  children,
}: ReaderLayoutProps) {
  const pinLoading = alwaysOnTop === null
  const pinAriaLabel = pinLoading ? 'Loading pin state' : alwaysOnTop ? 'Unpin window' : 'Pin window'

  return (
    <section className="reader-page">
      <section className="reader-page__shell">
        <header className="reader-page__topbar">
          <p className="reader-page__frame-title">{frameTitle}</p>
          <div className="reader-page__actions no-drag">
            <button
              className={`reader-page__pin ${alwaysOnTop ? 'reader-page__pin--active' : ''}`}
              type="button"
              aria-label={pinAriaLabel}
              disabled={pinLoading}
              onClick={() => void onToggleAlwaysOnTop()}
            >
              {alwaysOnTop ? 'Pinned' : 'Pin'}
            </button>
          </div>
        </header>
        <div className="reader-page__body">
          <header className="reader-page__toolbar">
            <button
              className="reader-page__back"
              type="button"
              aria-label="Back to bookshelf"
              disabled={backDisabled}
              onClick={() => void onBack()}
            >
              Back to bookshelf
            </button>
            <div className="reader-page__heading">
              <h1 className="reader-page__title">{title}</h1>
              {meta ? <p className="reader-page__meta">{meta}</p> : null}
            </div>
          </header>
          <div className="reader-page__content">{children}</div>
        </div>
      </section>
    </section>
  )
}
