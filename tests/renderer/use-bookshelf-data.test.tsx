import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useBookshelfData } from '../../src/renderer/src/hooks/useBookshelfData'

describe('useBookshelfData', () => {
  it('filters recent books to entries with progress and sorts by progress.updatedAt desc', async () => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getAllBooks: vi.fn().mockResolvedValue([
          { id: 'a', title: 'Alpha', author: 'A', format: 'txt', filePath: '/a', importedAt: 1, updatedAt: 1 },
          { id: 'b', title: 'Beta', author: 'B', format: 'txt', filePath: '/b', importedAt: 2, updatedAt: 2 },
          { id: 'c', title: 'Gamma', author: 'C', format: 'txt', filePath: '/c', importedAt: 3, updatedAt: 3 },
        ]),
        getProgress: vi
          .fn()
          .mockResolvedValueOnce({ bookId: 'a', percentage: 0.25, updatedAt: 10 })
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ bookId: 'c', percentage: 0.6, updatedAt: 20 }),
        importBooks: vi.fn().mockResolvedValue([]),
        removeBook: vi.fn(),
      },
    })

    const { result } = renderHook(() => useBookshelfData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.recentBooks.map((book) => book.id)).toEqual(['c', 'a'])
    expect(result.current.libraryBooks.map((book) => book.id)).toEqual(['a', 'b', 'c'])
  })
})
