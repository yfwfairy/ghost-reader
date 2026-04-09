import { useEffect, useState } from 'react'
import type { BookRecord, ReadingProgress } from '@shared/types'

export type BookshelfBook = BookRecord & {
  progress: ReadingProgress | null
}

export function useBookshelfData() {
  const [libraryBooks, setLibraryBooks] = useState<BookshelfBook[]>([])
  const [loading, setLoading] = useState(true)

  async function getProgressOrNull(bookId: string) {
    try {
      return await window.api.getProgress(bookId)
    } catch {
      return null
    }
  }

  async function addProgress(books: BookRecord[]) {
    return Promise.all(
      books.map(async (book) => ({
        ...book,
        progress: await getProgressOrNull(book.id),
      })),
    )
  }

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const books = await window.api.getAllBooks()
        const booksWithProgress = await addProgress(books)
        if (!active) {
          return
        }

        setLibraryBooks((current) => [
          ...current,
          ...booksWithProgress.filter((book) => !current.some((existing) => existing.id === book.id)),
        ])
      } catch {
        if (!active) {
          return
        }
        setLibraryBooks([])
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const recentBooks = [...libraryBooks]
    .filter((book) => book.progress !== null)
    .sort((left, right) => (right.progress?.updatedAt ?? 0) - (left.progress?.updatedAt ?? 0))

  async function addBooks(paths: string[]) {
    const imported = await window.api.importBooks(paths)
    const importedWithProgress = await addProgress(imported)
    setLibraryBooks((current) => [
      ...importedWithProgress,
      ...current.filter((book) => !importedWithProgress.some((incoming) => incoming.id === book.id)),
    ])
  }

  async function removeBook(bookId: string) {
    await window.api.removeBook(bookId)
    setLibraryBooks((current) => current.filter((book) => book.id !== bookId))
  }

  return { libraryBooks, recentBooks, loading, addBooks, removeBook }
}
