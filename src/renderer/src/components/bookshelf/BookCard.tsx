import type { BookRecord } from '@shared/types'
import { PlaceholderCover } from './PlaceholderCover'

type BookCardProps = {
  book: BookRecord
  onOpen: (bookId: string) => Promise<void>
  onRemove: (bookId: string) => Promise<void>
}

export function BookCard({ book, onOpen, onRemove }: BookCardProps) {
  return (
    <article className="book-card" onClick={() => void onOpen(book.id)}>
      <div className="book-card__cover">
        {book.coverDataUrl ? <img src={book.coverDataUrl} alt={book.title} /> : <PlaceholderCover bookId={book.id} title={book.title} />}
      </div>
      <div className="book-card__meta">
        <div className="book-card__text">
          <strong>{book.title}</strong>
          {book.author && book.author.toLowerCase() !== 'unknown' && <span>{book.author}</span>}
        </div>
        <div className="book-card__footer">
          <span className="book-card__format">{book.format.toUpperCase()}</span>
          <button
            className="book-card__remove"
            onClick={(event) => {
              event.stopPropagation()
              void onRemove(book.id)
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </article>
  )
}
