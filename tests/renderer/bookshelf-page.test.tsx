import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BookshelfPage } from '../../src/renderer/src/components/bookshelf/BookshelfPage'
import type { AppConfig, BookRecord, ReadingProgress } from '../../src/shared/types'

const baseConfig: AppConfig = {
  fontSize: 16,
  lineHeight: 1.8,
  fontFamily: 'Newsreader',
  brightness: 100,
  colorTheme: 'obsidian',
  appearance: 'dark',
  appearanceFollowSystem: false,
  currentBookId: null,
  alwaysOnTop: false,
  language: 'en',
  onboardingCompleted: false,
}

function setupApi(options?: {
  config?: Partial<AppConfig>
  books?: BookRecord[]
  progressByBookId?: Record<string, ReadingProgress | null>
}) {
  let config = { ...baseConfig, ...(options?.config ?? {}) }
  const books = options?.books ?? []
  const progressByBookId = options?.progressByBookId ?? {}
  const setConfig = vi.fn().mockImplementation(async (patch: Partial<AppConfig>) => {
    config = { ...config, ...patch }
    return config
  })
  const setAlwaysOnTop = vi.fn().mockImplementation(async (value: boolean) => {
    config = { ...config, alwaysOnTop: value }
    return config
  })

  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      getConfig: vi.fn().mockImplementation(async () => config),
      onConfigChanged: vi.fn(() => vi.fn()),
      setConfig,
      getAllBooks: vi.fn().mockResolvedValue(books),
      importBooks: vi.fn().mockResolvedValue([]),
      removeBook: vi.fn(),
      openFileDialog: vi.fn().mockResolvedValue([]),
      setAlwaysOnTop,
      getProgress: vi
        .fn()
        .mockImplementation(async (bookId: string) => progressByBookId[bookId] ?? null),
      readTxtFile: vi.fn(),
      saveProgress: vi.fn(),
    },
  })

  return { setConfig, setAlwaysOnTop }
}

describe('BookshelfPage', () => {
  it('renders the add-to-library tile as the first grid item even when the library is empty', async () => {
    setupApi({ books: [] })

    render(<BookshelfPage activeView="library" onChangeView={vi.fn()} onOpenReader={vi.fn()} />)

    expect(await screen.findByRole('button', { name: 'Add a book to your library' })).toBeInTheDocument()
    expect(screen.queryByText('Drop TXT / EPUB to start your shelf.')).not.toBeInTheDocument()
  })

  it('renders all imported books after the import tile', async () => {
    setupApi({
      books: [
        {
          id: 'book-1',
          title: 'Example Book',
          author: 'Ghost',
          format: 'txt',
          filePath: '/tmp/example.txt',
          importedAt: 1,
          updatedAt: 1,
        },
      ],
    })

    render(<BookshelfPage activeView="library" onChangeView={vi.fn()} onOpenReader={vi.fn()} />)

    const addTile = await screen.findByRole('button', { name: 'Add a book to your library' })
    const firstBookTitle = screen.getByText('Example Book')

    expect(addTile).toBeInTheDocument()
    expect(firstBookTitle).toBeInTheDocument()
    expect(addTile.compareDocumentPosition(firstBookTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('renders only progress-backed recent books ordered by latest reading activity', async () => {
    setupApi({
      books: [
        {
          id: 'book-1',
          title: 'Recently Opened',
          author: 'Ghost',
          format: 'txt',
          filePath: '/tmp/example.txt',
          importedAt: 1,
          updatedAt: 1,
        },
        {
          id: 'book-2',
          title: 'Not Started',
          author: 'Ghost',
          format: 'txt',
          filePath: '/tmp/nostart.txt',
          importedAt: 2,
          updatedAt: 2,
        },
        {
          id: 'book-3',
          title: 'Most Recent',
          author: 'Ghost',
          format: 'txt',
          filePath: '/tmp/recent.txt',
          importedAt: 3,
          updatedAt: 3,
        },
      ],
      progressByBookId: {
        'book-1': { bookId: 'book-1', percentage: 0.4, updatedAt: 1700000000000 },
        'book-2': null,
        'book-3': { bookId: 'book-3', percentage: 0.7, updatedAt: 1800000000000 },
      },
    })

    render(<BookshelfPage activeView="recent" onChangeView={vi.fn()} onOpenReader={vi.fn()} />)

    const openButtons = await screen.findAllByRole('button', { name: /Open .* in reader/ })

    expect(openButtons).toHaveLength(2)
    expect(openButtons[0]).toHaveAccessibleName('Open Most Recent in reader')
    expect(openButtons[1]).toHaveAccessibleName('Open Recently Opened in reader')
    expect(screen.queryByText('Not Started')).not.toBeInTheDocument()
  })

  it('shows recent empty state with a single library action', async () => {
    const onChangeView = vi.fn()
    setupApi({
      books: [
        {
          id: 'book-1',
          title: 'Imported Only',
          author: 'Ghost',
          format: 'txt',
          filePath: '/tmp/imported-only.txt',
          importedAt: 1,
          updatedAt: 1,
        },
      ],
      progressByBookId: {
        'book-1': null,
      },
    })

    render(<BookshelfPage activeView="recent" onChangeView={onChangeView} onOpenReader={vi.fn()} />)

    expect(await screen.findByText('All reading is unfinished.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Open .* in reader/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Browse Library/i }))

    expect(onChangeView).toHaveBeenCalledWith('library')
  })

  it('opens settings from the sidebar rail', async () => {
    setupApi()

    render(<BookshelfPage activeView="library" onChangeView={vi.fn()} onOpenReader={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Settings' }))

    expect(await screen.findByText('Reader Settings')).toBeInTheDocument()
  })

  it('opens a selected book in the same window by setting currentBookId then calling onOpenReader', async () => {
    const { setConfig } = setupApi({
      books: [
        {
          id: 'book-1',
          title: 'Example Book',
          author: 'Ghost',
          format: 'txt',
          filePath: '/tmp/example.txt',
          importedAt: 1,
          updatedAt: 1,
        },
      ],
    })
    const onOpenReader = vi.fn()

    render(<BookshelfPage activeView="library" onChangeView={vi.fn()} onOpenReader={onOpenReader} />)

    fireEvent.click((await screen.findAllByText('Example Book'))[0])

    await waitFor(() => {
      expect(setConfig).toHaveBeenCalledWith({ currentBookId: 'book-1' })
    })
    expect(onOpenReader).toHaveBeenCalledTimes(1)
    expect(setConfig.mock.invocationCallOrder[0]).toBeLessThan(onOpenReader.mock.invocationCallOrder[0])
  })

  it('renders shell navigation toggles with the active view state', async () => {
    setupApi()

    render(<BookshelfPage activeView="library" onChangeView={vi.fn()} onOpenReader={vi.fn()} />)

    expect(await screen.findByRole('button', { name: 'Open recent view' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Open library view' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('calls onChangeView when shell navigation buttons are clicked', async () => {
    setupApi()
    const onChangeView = vi.fn()

    render(<BookshelfPage activeView="library" onChangeView={onChangeView} onOpenReader={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Open recent view' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open library view' }))

    expect(onChangeView).toHaveBeenNthCalledWith(1, 'recent')
    expect(onChangeView).toHaveBeenNthCalledWith(2, 'library')
  })

  it('renders newly imported books immediately without remounting', async () => {
    setupApi({ books: [] })
    window.api.openFileDialog = vi.fn().mockResolvedValue(['/tmp/imported.txt'])
    window.api.importBooks = vi.fn().mockResolvedValue([
      {
        id: 'book-new',
        title: 'Imported Book',
        author: 'Ghost',
        format: 'txt',
        filePath: '/tmp/imported.txt',
        importedAt: 1,
        updatedAt: 1,
      },
    ])
    window.api.getProgress = vi.fn().mockResolvedValue(null)

    render(<BookshelfPage activeView="library" onChangeView={vi.fn()} onOpenReader={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Add a book to your library' }))

    expect((await screen.findAllByText('Imported Book')).length).toBeGreaterThan(0)
  })

})
