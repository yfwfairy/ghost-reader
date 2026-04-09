import { useEffect, useState } from 'react'
import type { BookRecord } from '@shared/types'

/** @deprecated Use useBookshelfData for bookshelf state and mutations. */
export function useLibrary() {
  const [books, setBooks] = useState<BookRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void window.api.getAllBooks().then((rows) => {
      setBooks(rows)
      setLoading(false)
    })
  }, [])

  async function addBooks(paths: string[]) {
    const imported = await window.api.importBooks(paths)
    setBooks((current) => [
      ...imported,
      ...current.filter((book) => !imported.some((incoming) => incoming.id === book.id)),
    ])
  }

  async function removeBook(bookId: string) {
    await window.api.removeBook(bookId)
    setBooks((current) => current.filter((book) => book.id !== bookId))
  }

  return {
    books,
    loading,
    addBooks,
    removeBook,
  }
}
