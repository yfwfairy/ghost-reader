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

  it('upserts books by id without reordering existing rows', () => {
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

    const replaced = upsertBook(
      [
        next[0],
        {
          id: 'book-2',
          title: 'Second Book',
          author: 'Unknown',
          format: 'txt',
          filePath: '/tmp/book-2.txt',
          importedAt: 2,
          updatedAt: 2,
        },
      ],
      {
        id: 'book-1',
        title: 'Updated Book',
        author: 'Unknown',
        format: 'txt',
        filePath: '/tmp/book.txt',
        importedAt: 1,
        updatedAt: 0,
      },
    )

    expect(replaced).toHaveLength(2)
    expect(replaced.map((book) => book.id)).toEqual(['book-1', 'book-2'])
    expect(replaced[0].title).toBe('Updated Book')
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
