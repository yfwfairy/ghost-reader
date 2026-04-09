import type { BookRecord } from '@shared/types'

type LibraryBookCardProps = {
  book: BookRecord
  onOpen: (bookId: string) => Promise<void>
  onRemove: (bookId: string) => Promise<void>
}

export function LibraryBookCard({ book, onOpen, onRemove }: LibraryBookCardProps) {
  return (
    <article className="library-book-card">
      <button className="library-book-card__open" type="button" onClick={() => void onOpen(book.id)}>
        <div className="library-book-card__cover">
          {book.coverDataUrl ? <img src={book.coverDataUrl} alt={book.title} /> : <span>Preview</span>}
        </div>
        <div className="library-book-card__meta">
          <strong>{book.title}</strong>
          <span>{book.author}</span>
        </div>
      </button>
      <div className="library-book-card__footer">
        <span className="library-book-card__format">{book.format.toUpperCase()}</span>
        <button
          className="library-book-card__remove"
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            void onRemove(book.id)
          }}
        >
          Remove
        </button>
      </div>
    </article>
  )
}
