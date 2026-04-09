import type { BookshelfBook } from '../../hooks/useBookshelfData'

type LibraryBookCardProps = {
  book: BookshelfBook
  onOpen: (bookId: string) => Promise<void>
  onRemove: (bookId: string) => Promise<void>
}

export function LibraryBookCard({ book, onOpen, onRemove }: LibraryBookCardProps) {
  const progress = book.progress

  return (
    <article className="library-book-card">
      <div className="library-book-card__cover">
        <button className="library-book-card__open" type="button" onClick={() => void onOpen(book.id)}>
          {book.coverDataUrl ? (
            <img src={book.coverDataUrl} alt={book.title} />
          ) : (
            <span aria-hidden="true">{book.format.toUpperCase()}</span>
          )}
        </button>
        <div className="library-book-card__overlay" />
        <button
          className="library-book-card__remove"
          type="button"
          aria-label={`Remove ${book.title}`}
          onClick={() => void onRemove(book.id)}
        >
          <span className="material-symbols-outlined" aria-hidden="true">delete</span>
        </button>
      </div>
      <button className="library-book-card__meta" type="button" onClick={() => void onOpen(book.id)}>
        <strong>{book.title}</strong>
        <span>{book.author}</span>
        {progress ? (
          <div className="library-book-card__progress">
            <span style={{ width: `${Math.round(progress.percentage * 100)}%` }} />
          </div>
        ) : null}
      </button>
    </article>
  )
}
