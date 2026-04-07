import type { PropsWithChildren } from 'react'

type ReaderLayoutProps = PropsWithChildren<{
  title: string
  meta?: string
  backDisabled?: boolean
  onBack: () => void | Promise<void>
}>

export function ReaderLayout({
  title,
  meta,
  backDisabled = false,
  onBack,
  children,
}: ReaderLayoutProps) {
  return (
    <section className="reader-page">
      <section className="reader-page__shell">
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
