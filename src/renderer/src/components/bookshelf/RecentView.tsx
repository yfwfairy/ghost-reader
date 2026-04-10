import { useTranslation } from '../../hooks/useTranslation'
import type { BookshelfBook } from '../../hooks/useBookshelfData'
import { RecentBookCard } from './RecentBookCard'

type RecentViewProps = {
  books: BookshelfBook[]
  onOpen: (bookId: string) => void | Promise<void>
  onOpenLibrary: () => void
}

export function RecentView({ books, onOpen, onOpenLibrary }: RecentViewProps) {
  const { t } = useTranslation()

  if (books.length === 0) {
    return (
      <section className="recent-view recent-view--empty">
        <h2 className="sr-only">{t('recent.heading')}</h2>
        <div className="recent-view__empty-center">
          {/* 水晶碎片插画 */}
          <div className="recent-view__crystal crystal-float" aria-hidden="true">
            <div className="recent-view__crystal-glow" />
            <div className="recent-view__crystal-glow recent-view__crystal-glow--pulse" />
            <div className="recent-view__crystal-body">
              <div className="recent-view__crystal-layer recent-view__crystal-layer--back" />
              <div className="recent-view__crystal-layer recent-view__crystal-layer--front" />
              <div className="recent-view__crystal-icons">
                <span className="material-symbols-outlined recent-view__crystal-icon-main">auto_stories</span>
                <div className="recent-view__crystal-divider" />
                <span className="material-symbols-outlined recent-view__crystal-icon-sub">diamond</span>
              </div>
            </div>
          </div>
          <h3 className="recent-view__empty-title">{t('recent.emptyTitle')}</h3>
          <p className="recent-view__empty-copy">
            {t('recent.emptyCopy')}
          </p>
          <button type="button" className="recent-view__empty-action" onClick={onOpenLibrary}>
            <span>{t('recent.emptyAction')}</span>
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </button>
        </div>
        <footer className="recent-view__empty-footer" aria-hidden="true">
          <span>{t('recent.footerSilence')}</span>
          <span className="recent-view__empty-footer-dot" />
          <span>{t('recent.footerFocus')}</span>
          <span className="recent-view__empty-footer-dot" />
          <span>{t('recent.footerImmersion')}</span>
        </footer>
      </section>
    )
  }

  return (
    <section className="recent-view">
      <header className="recent-view__header">
        <h2>{t('recent.heading')}</h2>
        <p>{t('recent.subtitle')}</p>
      </header>
      <div className="recent-view__list">
        {books.map((book) => (
          <RecentBookCard key={book.id} book={book} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}
