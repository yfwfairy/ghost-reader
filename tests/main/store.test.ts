import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_APP_CONFIG } from '../../src/shared/constants'
import { applyConfigPatch, removeBookAndProgress, upsertBook } from '../../src/main/store'
import type { BookRecord, ReadingProgress } from '../../src/shared/types'

describe('store helpers', () => {
  it('merges config patches on top of defaults', () => {
    const merged = applyConfigPatch(DEFAULT_APP_CONFIG, { fontSize: 20 })
    expect(merged.fontSize).toBe(20)
    expect(merged.lineHeight).toBe(1.8)
  })

  it('persists always-on-top config patches', () => {
    const merged = applyConfigPatch(DEFAULT_APP_CONFIG, { alwaysOnTop: true })
    expect(merged.alwaysOnTop).toBe(true)
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

describe('store module loading', () => {
  it('can import and use pure helpers without constructing persistence eagerly', async () => {
    vi.resetModules()
    vi.doMock('electron-store', () => ({
      default: class ThrowingStore {
        constructor() {
          throw new Error('store should not construct during helper-only import')
        }
      },
    }))

    const module = await import('../../src/main/store')

    const merged = module.applyConfigPatch(DEFAULT_APP_CONFIG, { fontSize: 19 })
    expect(merged.fontSize).toBe(19)

    vi.doUnmock('electron-store')
    vi.resetModules()
  })
})

describe('store wrappers', () => {
  it('returns defensive copies from all getters', async () => {
    vi.resetModules()

    vi.doMock('electron-store', () => ({
      default: class InMemoryStore<T extends Record<string, unknown>> {
        private state: T

        constructor(options: { defaults: T }) {
          this.state = options.defaults
        }

        get<K extends keyof T>(key: K): T[K] {
          return this.state[key]
        }

        set<K extends keyof T>(key: K, value: T[K]) {
          this.state[key] = value
        }
      },
    }))

    const module = await import('../../src/main/store')

    module.configStore.set({ alwaysOnTop: true })

    const firstConfig = module.configStore.get()
    firstConfig.fontSize = 99
    firstConfig.alwaysOnTop = false

    const secondConfig = module.configStore.get()
    expect(secondConfig.fontSize).toBe(16)
    expect(secondConfig.alwaysOnTop).toBe(true)

    module.libraryStore.set([
      {
        id: 'book-1',
        title: 'Book',
        author: 'Unknown',
        format: 'txt',
        filePath: '/tmp/book.txt',
        importedAt: 1,
        updatedAt: 1,
      },
    ])

    const firstBooks = module.libraryStore.get()
    firstBooks[0].title = 'Changed outside store'
    const secondBooks = module.libraryStore.get()
    expect(secondBooks[0].title).toBe('Book')

    module.progressStore.setAll([
      {
        bookId: 'book-1',
        percentage: 12,
        updatedAt: 1,
        txtScrollTop: 50,
      },
    ])

    const firstProgress = module.progressStore.getAll()
    firstProgress[0].percentage = 88
    const secondProgress = module.progressStore.getAll()
    expect(secondProgress[0].percentage).toBe(12)

    vi.doUnmock('electron-store')
    vi.resetModules()
  })
})

it('defaults always-on-top to false in single-window mode', () => {
  expect(DEFAULT_APP_CONFIG.alwaysOnTop).toBe(false)
})
