import type { BookRecord } from '@shared/types'
import { AddToLibraryCard } from './AddToLibraryCard'
import { LibraryBookCard } from './LibraryBookCard'

type LibraryViewProps = {
  books: BookRecord[]
  onImport: () => Promise<void>
  onOpen: (bookId: string) => Promise<void>
  onRemove: (bookId: string) => Promise<void>
  showAddTile?: boolean
}

export function LibraryView({ books, onImport, onOpen, onRemove, showAddTile = true }: LibraryViewProps) {
  return (
    <section className="library-view__grid">
      {showAddTile ? <AddToLibraryCard onImport={onImport} /> : null}
      {books.map((book) => (
        <LibraryBookCard key={book.id} book={book} onOpen={onOpen} onRemove={onRemove} />
      ))}
    </section>
  )
}
