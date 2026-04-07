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
  it('renders the empty state when there are no books', async () => {
    setupApi()

    render(<BookshelfPage onOpenReader={vi.fn()} />)

    expect(await screen.findByText('Drop TXT / EPUB to start your shelf.')).toBeInTheDocument()
    expect(document.querySelector('.app-frame')).not.toBeInTheDocument()
    expect(screen.getByText('Bookshelf')).toBeInTheDocument()
    expect(screen.getByText('Quiet shelf for imported books.')).toBeInTheDocument()
  })

  it('opens settings from the bookshelf content header', async () => {
    setupApi()

    render(<BookshelfPage onOpenReader={vi.fn()} />)

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

    render(<BookshelfPage onOpenReader={onOpenReader} />)

    fireEvent.click((await screen.findAllByText('Example Book'))[0])

    await waitFor(() => {
      expect(setConfig).toHaveBeenCalledWith({ currentBookId: 'book-1' })
    })
    expect(onOpenReader).toHaveBeenCalledTimes(1)
    expect(setConfig.mock.invocationCallOrder[0]).toBeLessThan(onOpenReader.mock.invocationCallOrder[0])
  })

})
