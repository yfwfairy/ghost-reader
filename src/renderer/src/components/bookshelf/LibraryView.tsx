import { useMemo, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
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
  const { t } = useTranslation()
  const [query, setQuery] = useState('')

  const filteredBooks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return books
    return books.filter((book) =>
      book.title.toLowerCase().includes(q) ||
      book.author.toLowerCase().includes(q)
    )
  }, [books, query])

  const isSearching = query.trim().length > 0

  return (
    <section className="library-view">
      <header className="library-view__header">
        <div className="library-view__header-text">
          <h2 className="library-view__title">{t('library.heading')}</h2>
          <p className="library-view__subtitle">
            {books.length === 0
              ? t('library.empty')
              : isSearching
                ? t('library.searchResult', filteredBooks.length)
                : t('library.subtitle', books.length)}
          </p>
        </div>
        <div className={`library-view__search ${isSearching ? 'library-view__search--active' : ''}`}>
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            placeholder={t('library.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isSearching && (
            <button
              type="button"
              className="library-view__search-clear"
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
      </header>
      {isSearching && filteredBooks.length === 0 ? (
        <p className="library-view__search-empty">{t('library.searchEmpty')}</p>
      ) : (
        <div className="library-view__grid">
          {showAddTile && !isSearching ? <AddToLibraryCard onImport={onImport} /> : null}
          {filteredBooks.map((book) => (
            <LibraryBookCard key={book.id} book={book} onOpen={onOpen} onRemove={onRemove} />
          ))}
        </div>
      )}
    </section>
  )
}
