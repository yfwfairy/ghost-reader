import type { BookRecord } from '@shared/types'

type BookCardProps = {
  book: BookRecord
  onOpen: (bookId: string) => Promise<void>
  onRemove: (bookId: string) => Promise<void>
}

export function BookCard({ book, onOpen, onRemove }: BookCardProps) {
  return (
    <article className="book-card" onClick={() => void onOpen(book.id)}>
      <div className="book-card__cover">
        {book.coverDataUrl ? <img src={book.coverDataUrl} alt={book.title} /> : <span>{book.title}</span>}
      </div>
      <div className="book-card__meta">
        <strong>{book.title}</strong>
        <span>{book.author}</span>
        <button
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
