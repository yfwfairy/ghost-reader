import type { BookshelfBook } from '../../hooks/useBookshelfData'
import { RecentBookCard } from './RecentBookCard'

type RecentViewProps = {
  books: BookshelfBook[]
  onOpen: (bookId: string) => void | Promise<void>
  onOpenLibrary: () => void
}

export function RecentView({ books, onOpen, onOpenLibrary }: RecentViewProps) {
  if (books.length === 0) {
    return (
      <section className="recent-view recent-view--empty">
        <h2 className="sr-only">Recent Encounters</h2>
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
          <h3 className="recent-view__empty-title">The void remains silent.</h3>
          <p className="recent-view__empty-copy">
            Your recent encounters have yet to be etched into the monolith.
            <br />
            Begin a new journey from your library.
          </p>
          <button type="button" className="recent-view__empty-action" onClick={onOpenLibrary}>
            <span>Browse Library</span>
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </button>
        </div>
        <footer className="recent-view__empty-footer" aria-hidden="true">
          <span>Silence</span>
          <span className="recent-view__empty-footer-dot" />
          <span>Focus</span>
          <span className="recent-view__empty-footer-dot" />
          <span>Immersion</span>
        </footer>
      </section>
    )
  }

  return (
    <section className="recent-view">
      <header className="recent-view__header">
        <h2>Recent Encounters</h2>
        <p>Resuming your nocturnal drifts.</p>
      </header>
      <div className="recent-view__list">
        {books.map((book) => (
          <RecentBookCard key={book.id} book={book} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}
