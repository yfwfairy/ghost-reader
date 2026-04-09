import { useEffect, useState } from 'react'
import type { BookRecord, ReadingProgress } from '@shared/types'

export type BookshelfBook = BookRecord & {
  progress: ReadingProgress | null
}

export function useBookshelfData() {
  const [libraryBooks, setLibraryBooks] = useState<BookshelfBook[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    void (async () => {
      const books = await window.api.getAllBooks()
      const booksWithProgress = await Promise.all(
        books.map(async (book) => ({
          ...book,
          progress: await window.api.getProgress(book.id),
        })),
      )

      if (!active) {
        return
      }

      setLibraryBooks(booksWithProgress)
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [])

  const recentBooks = [...libraryBooks]
    .filter((book) => book.progress !== null)
    .sort((left, right) => (right.progress?.updatedAt ?? 0) - (left.progress?.updatedAt ?? 0))

  return { libraryBooks, recentBooks, loading }
}
