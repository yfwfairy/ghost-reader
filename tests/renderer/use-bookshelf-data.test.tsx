import { act, renderHook, waitFor } from '@testing-library/react'
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

  it('updates libraryBooks immediately when adding and removing books', async () => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getAllBooks: vi.fn().mockResolvedValue([
          { id: 'a', title: 'Alpha', author: 'A', format: 'txt', filePath: '/a', importedAt: 1, updatedAt: 1 },
        ]),
        getProgress: vi.fn().mockResolvedValue(null),
        importBooks: vi.fn().mockResolvedValue([
          { id: 'b', title: 'Beta', author: 'B', format: 'txt', filePath: '/b', importedAt: 2, updatedAt: 2 },
        ]),
        removeBook: vi.fn().mockResolvedValue(undefined),
      },
    })

    const { result } = renderHook(() => useBookshelfData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    await act(async () => {
      await result.current.addBooks(['/b'])
    })

    expect(result.current.libraryBooks.map((book) => book.id)).toEqual(['b', 'a'])

    await act(async () => {
      await result.current.removeBook('a')
    })

    expect(result.current.libraryBooks.map((book) => book.id)).toEqual(['b'])
  })

  it('keeps imported books when import happens before initial hydration resolves', async () => {
    let resolveBooks: ((books: Array<{ id: string; title: string; author: string; format: 'txt'; filePath: string; importedAt: number; updatedAt: number }>) => void) | null = null

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getAllBooks: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveBooks = resolve
            }),
        ),
        getProgress: vi
          .fn()
          .mockImplementation(async (bookId: string) => {
            if (bookId === 'b') {
              throw new Error('progress unavailable')
            }
            return { bookId, percentage: 0.4, updatedAt: 4 }
          }),
        importBooks: vi.fn().mockResolvedValue([
          { id: 'b', title: 'Beta', author: 'B', format: 'txt', filePath: '/b', importedAt: 2, updatedAt: 2 },
        ]),
        removeBook: vi.fn().mockResolvedValue(undefined),
      },
    })

    const { result } = renderHook(() => useBookshelfData())

    await act(async () => {
      await result.current.addBooks(['/b'])
    })

    expect(result.current.libraryBooks.map((book) => book.id)).toEqual(['b'])
    expect(result.current.libraryBooks[0]?.progress).toBeNull()

    await act(async () => {
      resolveBooks?.([
        { id: 'a', title: 'Alpha', author: 'A', format: 'txt', filePath: '/a', importedAt: 1, updatedAt: 1 },
      ])
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.libraryBooks.map((book) => book.id)).toEqual(['b', 'a'])
  })

  it('sets loading false with empty data when initial getAllBooks fails', async () => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getAllBooks: vi.fn().mockRejectedValue(new Error('db unavailable')),
        getProgress: vi.fn(),
        importBooks: vi.fn().mockResolvedValue([]),
        removeBook: vi.fn().mockResolvedValue(undefined),
      },
    })

    const { result } = renderHook(() => useBookshelfData())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.libraryBooks).toEqual([])
    expect(result.current.recentBooks).toEqual([])
  })

  it('does not re-add a removed book when hydration resolves after a pre-hydration removal', async () => {
    let resolveBooks:
      | ((books: Array<{ id: string; title: string; author: string; format: 'txt'; filePath: string; importedAt: number; updatedAt: number }>) => void)
      | null = null

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getAllBooks: vi.fn().mockImplementation(
          () =>
            new Promise((resolve) => {
              resolveBooks = resolve
            }),
        ),
        getProgress: vi.fn().mockResolvedValue(null),
        importBooks: vi.fn().mockResolvedValue([]),
        removeBook: vi.fn().mockResolvedValue(undefined),
      },
    })

    const { result } = renderHook(() => useBookshelfData())

    await act(async () => {
      await result.current.removeBook('a')
    })

    await act(async () => {
      resolveBooks?.([
        { id: 'a', title: 'Alpha', author: 'A', format: 'txt', filePath: '/a', importedAt: 1, updatedAt: 1 },
      ])
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.libraryBooks.map((book) => book.id)).toEqual([])
  })

  it('keeps pre-hydration imports when initial getAllBooks fails', async () => {
    let rejectBooks: ((error: Error) => void) | null = null

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getAllBooks: vi.fn().mockImplementation(
          () =>
            new Promise((_, reject) => {
              rejectBooks = reject
            }),
        ),
        getProgress: vi.fn().mockResolvedValue(null),
        importBooks: vi.fn().mockResolvedValue([
          { id: 'b', title: 'Beta', author: 'B', format: 'txt', filePath: '/b', importedAt: 2, updatedAt: 2 },
        ]),
        removeBook: vi.fn().mockResolvedValue(undefined),
      },
    })

    const { result } = renderHook(() => useBookshelfData())

    await act(async () => {
      await result.current.addBooks(['/b'])
    })

    expect(result.current.libraryBooks.map((book) => book.id)).toEqual(['b'])

    await act(async () => {
      rejectBooks?.(new Error('db unavailable'))
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.libraryBooks.map((book) => book.id)).toEqual(['b'])
  })
})
