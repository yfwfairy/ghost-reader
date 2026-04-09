import type { BookshelfBook } from '../../hooks/useBookshelfData'

type RecentBookCardProps = {
  book: BookshelfBook
  onOpen: (bookId: string) => void | Promise<void>
}

function clampPercentage(value: number) {
  if (value < 0) {
    return 0
  }
  if (value > 100) {
    return 100
  }
  return value
}

function formatLastOpened(updatedAt: number) {
  return new Date(updatedAt).toISOString().slice(0, 10)
}

export function RecentBookCard({ book, onOpen }: RecentBookCardProps) {
  const progressPercentage = clampPercentage(Math.round((book.progress?.percentage ?? 0) * 100))
  const lastOpenedLabel = formatLastOpened(book.progress?.updatedAt ?? book.updatedAt)

  return (
    <article className="recent-book-card">
      <button
        type="button"
        className="recent-book-card__open"
        aria-label={`Open ${book.title} in reader`}
        onClick={() => void onOpen(book.id)}
      >
        <div className="recent-book-card__cover">
          {book.coverDataUrl ? <img src={book.coverDataUrl} alt={book.title} /> : <span>Preview</span>}
          <div className="recent-book-card__cover-fade" />
        </div>
        <div className="recent-book-card__body">
          <h3 className="recent-book-card__title">{book.title}</h3>
          <p className="recent-book-card__author">{book.author}</p>
          <div className="recent-book-card__progress-section">
            <div className="recent-book-card__stats">
              <span>{progressPercentage}% read</span>
              <span>Last opened {lastOpenedLabel}</span>
            </div>
            <div className="recent-book-card__progress" role="presentation" aria-hidden>
              <span style={{ width: `${progressPercentage}%` }} />
            </div>
          </div>
        </div>
      </button>
    </article>
  )
}
