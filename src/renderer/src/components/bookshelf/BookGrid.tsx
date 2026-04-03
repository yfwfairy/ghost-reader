import type { BookRecord } from '@shared/types'
import { BookCard } from './BookCard'

type BookGridProps = {
  books: BookRecord[]
  onOpen: (bookId: string) => Promise<void>
  onRemove: (bookId: string) => Promise<void>
  onImport: () => Promise<void>
}

export function BookGrid({ books, onOpen, onRemove, onImport }: BookGridProps) {
  if (books.length === 0) {
    return (
      <div className="book-grid-empty">
        <p className="book-grid-empty__eyebrow">Library Empty</p>
        <h2>Drop TXT / EPUB to start your shelf.</h2>
        <p className="book-grid-empty__copy">
          Import a book to build a calm reading surface before the full reader experience arrives.
        </p>
        <button onClick={() => void onImport()}>Import Books</button>
      </div>
    )
  }

  return (
    <section className="book-grid">
      {books.map((book) => (
        <BookCard key={book.id} book={book} onOpen={onOpen} onRemove={onRemove} />
      ))}
    </section>
  )
}
