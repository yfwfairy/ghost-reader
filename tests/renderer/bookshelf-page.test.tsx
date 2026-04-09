import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BookshelfPage } from '../../src/renderer/src/components/bookshelf/BookshelfPage'
import type { AppConfig, BookRecord } from '../../src/shared/types'

const baseConfig: AppConfig = {
  fontSize: 16,
  lineHeight: 1.8,
  currentBookId: null,
  alwaysOnTop: false,
}

function setupApi(options?: { config?: Partial<AppConfig>; books?: BookRecord[] }) {
  let config = { ...baseConfig, ...(options?.config ?? {}) }
  const books = options?.books ?? []
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
      getProgress: vi.fn(),
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

  it('renders a neutral placeholder shell for recent view instead of recent books', async () => {
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

    render(<BookshelfPage activeView="recent" onChangeView={vi.fn()} onOpenReader={vi.fn()} />)

    expect(await screen.findByText('Recent view is coming soon.')).toBeInTheDocument()
    expect(screen.queryByText('Example Book')).not.toBeInTheDocument()
  })

  it('opens settings from the bookshelf content header', async () => {
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
