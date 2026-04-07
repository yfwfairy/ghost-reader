import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BookshelfPage } from '../../src/renderer/src/components/bookshelf/BookshelfPage'
import type { AppConfig, BookRecord } from '../../src/shared/types'

const baseConfig: AppConfig = {
  hiddenOpacity: 0.1,
  readingOpacity: 0.85,
  fadeDelayMs: 1000,
  fadeDurationMs: 300,
  fontSize: 16,
  lineHeight: 1.8,
  activationShortcut: 'CommandOrControl+Shift+R',
  currentBookId: null,
  alwaysOnTop: false,
  readerBounds: null,
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
    expect(await screen.findByText('Ghost Reader')).toBeInTheDocument()
    expect(screen.getByText('Bookshelf')).toBeInTheDocument()
    expect(screen.getByText('Quiet shelf for imported books.')).toBeInTheDocument()
    expect(screen.getByText('Drop TXT / EPUB to start your shelf.')).toBeInTheDocument()
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

  it('toggles always-on-top from the immersive top bar pin button', async () => {
    const { setAlwaysOnTop } = setupApi({ config: { alwaysOnTop: false } })

    render(<BookshelfPage onOpenReader={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Pin window' }))

    await waitFor(() => {
      expect(setAlwaysOnTop).toHaveBeenCalledWith(true)
    })
  })

  it('resolves persisted always-on-top before enabling the pin control and toggles to false', async () => {
    let resolveConfig: ((value: AppConfig) => void) | null = null
    const setAlwaysOnTop = vi.fn().mockImplementation(async (value: boolean) => ({ ...baseConfig, alwaysOnTop: value }))

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getConfig: vi.fn(
          () =>
            new Promise<AppConfig>((resolve) => {
              resolveConfig = resolve
            }),
        ),
        onConfigChanged: vi.fn(() => vi.fn()),
        setConfig: vi.fn(),
        getAllBooks: vi.fn().mockResolvedValue([]),
        importBooks: vi.fn().mockResolvedValue([]),
        removeBook: vi.fn(),
        openFileDialog: vi.fn().mockResolvedValue([]),
        setAlwaysOnTop,
        getProgress: vi.fn(),
        readTxtFile: vi.fn(),
        saveProgress: vi.fn(),
      },
    })

    render(<BookshelfPage onOpenReader={vi.fn()} />)

    const loadingPin = await screen.findByRole('button', { name: 'Loading pin state' })
    expect(loadingPin).toBeDisabled()
    fireEvent.click(loadingPin)
    expect(setAlwaysOnTop).not.toHaveBeenCalled()

    resolveConfig?.({ ...baseConfig, alwaysOnTop: true })

    const unpinButton = await screen.findByRole('button', { name: 'Unpin window' })
    expect(unpinButton).toBeEnabled()
    fireEvent.click(unpinButton)

    await waitFor(() => {
      expect(setAlwaysOnTop).toHaveBeenCalledWith(false)
    })
  })
})
