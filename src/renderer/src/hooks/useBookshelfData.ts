import { useEffect, useRef, useState } from 'react'
import type { BookRecord, ReadingProgress } from '@shared/types'

export type BookshelfBook = BookRecord & {
  progress: ReadingProgress | null
}

export function useBookshelfData() {
  const [libraryBooks, setLibraryBooks] = useState<BookshelfBook[]>([])
  const [loading, setLoading] = useState(true)
  const hydrationCompleteRef = useRef(false)
  const preHydrationRemovedIdsRef = useRef<Set<string>>(new Set())

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

  function mergeHydratedBooks(current: BookshelfBook[], hydrated: BookshelfBook[]) {
    const removedIds = preHydrationRemovedIdsRef.current
    const merged = current.filter((book) => !removedIds.has(book.id))
    const existingIds = new Set(merged.map((book) => book.id))

    for (const book of hydrated) {
      if (removedIds.has(book.id) || existingIds.has(book.id)) {
        continue
      }
      merged.push(book)
    }

    return merged
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

        setLibraryBooks((current) => mergeHydratedBooks(current, booksWithProgress))
      } catch {
        if (!active) {
          return
        }
      } finally {
        if (active) {
          hydrationCompleteRef.current = true
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
    if (!hydrationCompleteRef.current) {
      for (const book of importedWithProgress) {
        preHydrationRemovedIdsRef.current.delete(book.id)
      }
    }
    setLibraryBooks((current) => [
      ...importedWithProgress,
      ...current.filter((book) => !importedWithProgress.some((incoming) => incoming.id === book.id)),
    ])
  }

  async function removeBook(bookId: string) {
    const trackForHydration = !hydrationCompleteRef.current
    if (trackForHydration) {
      preHydrationRemovedIdsRef.current.add(bookId)
    }
    try {
      await window.api.removeBook(bookId)
      setLibraryBooks((current) => current.filter((book) => book.id !== bookId))
    } catch (error) {
      if (trackForHydration) {
        preHydrationRemovedIdsRef.current.delete(bookId)
      }
      throw error
    }
  }

  async function resetBooks(bookIds: string[]) {
    await Promise.all(bookIds.map((id) => window.api.resetProgress(id)))
    setLibraryBooks((current) =>
      current.map((book) =>
        bookIds.includes(book.id) ? { ...book, progress: null } : book,
      ),
    )
  }

  // 按导入时间降序，最新添加的排最前
  const sortedLibraryBooks = [...libraryBooks].sort((a, b) => b.importedAt - a.importedAt)

  return { libraryBooks: sortedLibraryBooks, recentBooks, loading, addBooks, removeBook, resetBooks }
}
