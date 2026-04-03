import { describe, expect, it } from 'vitest'
import { DEFAULT_APP_CONFIG } from '../../src/shared/constants'
import { applyConfigPatch, removeBookAndProgress, upsertBook } from '../../src/main/store'
import type { BookRecord, ReadingProgress } from '../../src/shared/types'

describe('store helpers', () => {
  it('merges config patches on top of defaults', () => {
    const merged = applyConfigPatch(DEFAULT_APP_CONFIG, { fontSize: 20 })
    expect(merged.fontSize).toBe(20)
    expect(merged.readingOpacity).toBe(0.85)
  })

  it('upserts books by id', () => {
    const next = upsertBook([], {
      id: 'book-1',
      title: 'Book',
      author: 'Unknown',
      format: 'txt',
      filePath: '/tmp/book.txt',
      importedAt: 1,
      updatedAt: 1,
    })

    expect(next).toHaveLength(1)
    expect(next[0].id).toBe('book-1')
  })

  it('removes both book and progress rows', () => {
    const books: BookRecord[] = [
      {
        id: 'book-1',
        title: 'Book',
        author: 'Unknown',
        format: 'txt',
        filePath: '/tmp/book.txt',
        importedAt: 1,
        updatedAt: 1,
      },
    ]
    const progress: ReadingProgress[] = [
      {
        bookId: 'book-1',
        percentage: 12,
        updatedAt: 1,
        txtScrollTop: 50,
      },
    ]

    const cleaned = removeBookAndProgress(books, progress, 'book-1')
    expect(cleaned.books).toEqual([])
    expect(cleaned.progress).toEqual([])
  })
})
