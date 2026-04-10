import type { PropsWithChildren } from 'react'
import { useTranslation } from '../../hooks/useTranslation'

type ReaderLayoutProps = PropsWithChildren<{
  title: string
  meta?: string
}>

export function ReaderLayout({
  title,
  meta,
  children,
}: ReaderLayoutProps) {
  const { t } = useTranslation()

  return (
    <section className="reader-page">
      <section className="reader-page__shell">
        <div className="reader-page__body">
          <div className="reader-page__content">{children}</div>
        </div>
      </section>

      {/* 底部导航栏 */}
      <nav className="reader-bottom-nav">
        <div className="reader-bottom-nav__actions">
          <button className="reader-bottom-nav__btn" type="button">
            <span className="material-symbols-outlined" aria-hidden="true">menu_book</span>
            <span>{t('reader.chapters')}</span>
          </button>
          <button className="reader-bottom-nav__btn" type="button">
            <span className="material-symbols-outlined" aria-hidden="true">palette</span>
            <span>{t('reader.appearance')}</span>
          </button>
        </div>
      </nav>
    </section>
  )
}
