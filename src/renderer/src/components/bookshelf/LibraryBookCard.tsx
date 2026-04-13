import type { BookshelfBook } from '../../hooks/useBookshelfData'

function formatWordCount(count: number) {
  if (count < 1000) return `${count}字`
  if (count < 10000) return `${(count / 1000).toFixed(1)}k字`
  return `${(count / 10000).toFixed(2)}w字`
}

type LibraryBookCardProps = {
  book: BookshelfBook
  onOpen: (bookId: string) => Promise<void>
  onRemove: (bookId: string) => Promise<void>
}

export function LibraryBookCard({ book, onOpen, onRemove }: LibraryBookCardProps) {
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
        {book.wordCount != null && (
          <span className="library-book-card__word-count">
            {formatWordCount(book.wordCount)}
          </span>
        )}
      </button>
    </article>
  )
}
