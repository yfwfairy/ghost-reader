import type { BookshelfBook } from '../../hooks/useBookshelfData'
import { AddToLibraryCard } from './AddToLibraryCard'
import { LibraryBookCard } from './LibraryBookCard'

type LibraryViewProps = {
  books: BookshelfBook[]
  onImport: () => Promise<void>
  onOpen: (bookId: string) => Promise<void>
  onRemove: (bookId: string) => Promise<void>
  showAddTile?: boolean
}

export function LibraryView({ books, onImport, onOpen, onRemove, showAddTile = true }: LibraryViewProps) {
  return (
    <section className="library-view">
      <header className="library-view__header">
        <div className="library-view__header-text">
          <h2 className="library-view__title">Your Sanctuary</h2>
          <p className="library-view__subtitle">
            {books.length === 0
              ? 'Your glass shelf awaits its first title.'
              : `${books.length} work${books.length === 1 ? '' : 's'} currently suspended in glass.`}
          </p>
        </div>
        <div className="library-view__search">
          <span className="material-symbols-outlined">search</span>
          <input type="text" placeholder="Filter archive..." />
        </div>
      </header>
      <div className="library-view__grid">
        {showAddTile ? <AddToLibraryCard onImport={onImport} /> : null}
        {books.map((book) => (
          <LibraryBookCard key={book.id} book={book} onOpen={onOpen} onRemove={onRemove} />
        ))}
      </div>
    </section>
  )
}
