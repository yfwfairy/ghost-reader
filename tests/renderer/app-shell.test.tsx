import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'

describe('App single-window shell', () => {
  function setupApi(initialBookId: string | null) {
    let config = {
      fontSize: 16,
      lineHeight: 1.8,
      currentBookId: initialBookId,
      alwaysOnTop: false,
    }

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getConfig: vi.fn().mockImplementation(async () => config),
        onConfigChanged: vi.fn(() => vi.fn()),
        setConfig: vi.fn().mockImplementation(async (patch) => {
          config = { ...config, ...patch }
          return config
        }),
        getAllBooks: vi.fn().mockResolvedValue([
          {
            id: 'book-1',
            title: 'Example Book',
            author: 'Ghost',
            format: 'txt',
            filePath: '/tmp/example.txt',
            importedAt: 1,
            updatedAt: 1,
          },
        ]),
        getProgress: vi.fn().mockResolvedValue(null),
        readTxtFile: vi.fn().mockResolvedValue('第一段'),
        saveProgress: vi.fn(),
        importBooks: vi.fn(),
        removeBook: vi.fn(),
        openFileDialog: vi.fn().mockResolvedValue([]),
        setAlwaysOnTop: vi.fn(),
      },
    })
  }

  function setupDeferredConfigApi(initialBookId: string | null) {
    let config = {
      fontSize: 16,
      lineHeight: 1.8,
      currentBookId: initialBookId,
      alwaysOnTop: false,
    }
    let handleConfigChange: ((next: typeof config) => void) | null = null

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getConfig: vi.fn().mockImplementation(async () => config),
        onConfigChanged: vi.fn((callback: (next: typeof config) => void) => {
          handleConfigChange = callback
          return vi.fn()
        }),
        setConfig: vi.fn().mockImplementation(async (patch) => {
          config = { ...config, ...patch }
          return config
        }),
        getAllBooks: vi.fn().mockResolvedValue([
          {
            id: 'book-1',
            title: 'Example Book',
            author: 'Ghost',
            format: 'txt',
            filePath: '/tmp/example.txt',
            importedAt: 1,
            updatedAt: 1,
          },
        ]),
        getProgress: vi.fn().mockResolvedValue(null),
        readTxtFile: vi.fn().mockResolvedValue('第一段'),
        saveProgress: vi.fn(),
        importBooks: vi.fn(),
        removeBook: vi.fn(),
        openFileDialog: vi.fn().mockResolvedValue([]),
        setAlwaysOnTop: vi.fn(),
      },
    })

    return {
      emitConfig(nextConfig: typeof config) {
        config = nextConfig
        handleConfigChange?.(nextConfig)
      },
    }
  }

  it('switches from bookshelf to reader inside the same window', async () => {
    setupApi(null)

    render(<App />)

    expect(document.querySelector('.app-frame')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Open library view' })).toBeInTheDocument()

    fireEvent.click((await screen.findAllByText('Example Book'))[0])

    expect(await screen.findByText('第一段')).toBeInTheDocument()
    expect(document.querySelector('.app-frame')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.querySelector('.app-frame__title')).toHaveTextContent('Example Book')
    })
    expect(document.querySelector('.reader-page__topbar')).not.toBeInTheDocument()
  })

  it('starts on reader page when config already has a selected book', async () => {
    setupApi('book-1')

    render(<App />)

    expect(await screen.findByText('第一段')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.querySelector('.app-frame__title')).toHaveTextContent('Example Book')
    })
  })

  it('navigates back to bookshelf from reader back action', async () => {
    setupApi('book-1')

    render(<App />)

    expect(await screen.findByText('第一段')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back to bookshelf' }))

    expect(await screen.findByRole('button', { name: 'Open library view' })).toBeInTheDocument()
  })

  it('keeps the bookshelf shell mounted while switching between library and recent', async () => {
    setupApi(null)

    render(<App />)

    expect(await screen.findByRole('button', { name: 'Open recent view' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByRole('button', { name: 'Open library view' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: 'Open recent view' }))

    expect(screen.getByRole('button', { name: 'Open recent view' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Open library view' })).toHaveAttribute('aria-pressed', 'false')
    expect(document.querySelector('.app-frame')).toBeInTheDocument()
  })

  it('returns from reader to the same shell instead of the legacy bookshelf header layout', async () => {
    setupApi('book-1')

    render(<App />)

    expect(await screen.findByText('第一段')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back to bookshelf' }))

    expect(await screen.findByRole('button', { name: 'Open library view' })).toBeInTheDocument()
    expect(screen.queryByText('Bookshelf')).not.toBeInTheDocument()
  })

  it('keeps the recent view selected after entering reader from an external book selection and returning back', async () => {
    const { emitConfig } = setupDeferredConfigApi(null)

    render(<App />)

    const recentButton = await screen.findByRole('button', { name: 'Open recent view' })
    fireEvent.click(recentButton)
    expect(recentButton).toHaveAttribute('aria-pressed', 'true')

    act(() => {
      emitConfig({
        fontSize: 16,
        lineHeight: 1.8,
        currentBookId: 'book-1',
        alwaysOnTop: false,
      })
    })

    expect(await screen.findByText('第一段')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back to bookshelf' }))

    expect(await screen.findByRole('button', { name: 'Open recent view' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Open library view' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('stays on the bookshelf after manual back when the same selected book is broadcast again', async () => {
    const { emitConfig } = setupDeferredConfigApi('book-1')

    render(<App />)

    expect(await screen.findByText('第一段')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Back to bookshelf' }))

    expect(await screen.findByRole('button', { name: 'Open library view' })).toBeInTheDocument()

    act(() => {
      emitConfig({
        fontSize: 16,
        lineHeight: 1.8,
        currentBookId: 'book-1',
        alwaysOnTop: false,
      })
    })

    expect(screen.getByRole('button', { name: 'Open library view' })).toBeInTheDocument()
    expect(screen.queryByText('第一段')).not.toBeInTheDocument()
  })

  it('switches into reader when config selects a book after mount', async () => {
    const { emitConfig } = setupDeferredConfigApi(null)

    render(<App />)

    expect(await screen.findByRole('button', { name: 'Open library view' })).toBeInTheDocument()

    act(() => {
      emitConfig({
        fontSize: 16,
        lineHeight: 1.8,
        currentBookId: 'book-1',
        alwaysOnTop: false,
      })
    })

    expect(await screen.findByText('第一段')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.querySelector('.app-frame__title')).toHaveTextContent('Example Book')
    })
  })

  it('toggles always-on-top from the shared immersive title bar', async () => {
    setupApi(null)

    render(<App />)

    fireEvent.click(await screen.findByRole('button', { name: 'Pin window' }))

    expect(window.api.setAlwaysOnTop).toHaveBeenCalledWith(true)
  })

  it('waits for persisted always-on-top before enabling pin and can unpin from the app shell', async () => {
    let resolveConfig: ((value: {
      fontSize: number
      lineHeight: number
      currentBookId: null
      alwaysOnTop: boolean
    }) => void) | null = null
    const setAlwaysOnTop = vi.fn().mockImplementation(async (value: boolean) => ({
      fontSize: 16,
      lineHeight: 1.8,
      currentBookId: null,
      alwaysOnTop: value,
    }))

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getConfig: vi.fn(
          () =>
            new Promise((resolve) => {
              resolveConfig = resolve
            }),
        ),
        onConfigChanged: vi.fn(() => vi.fn()),
        setConfig: vi.fn(),
        getAllBooks: vi.fn().mockResolvedValue([]),
        getProgress: vi.fn().mockResolvedValue(null),
        readTxtFile: vi.fn().mockResolvedValue(''),
        saveProgress: vi.fn(),
        importBooks: vi.fn(),
        removeBook: vi.fn(),
        openFileDialog: vi.fn().mockResolvedValue([]),
        setAlwaysOnTop,
      },
    })

    render(<App />)

    const loadingPin = await screen.findByRole('button', { name: 'Loading pin state' })
    expect(loadingPin).toBeDisabled()
    fireEvent.click(loadingPin)
    expect(setAlwaysOnTop).not.toHaveBeenCalled()

    resolveConfig?.({
      fontSize: 16,
      lineHeight: 1.8,
      currentBookId: null,
      alwaysOnTop: true,
    })

    const unpinButton = await screen.findByRole('button', { name: 'Unpin window' })
    expect(unpinButton).toBeEnabled()
    fireEvent.click(unpinButton)

    expect(setAlwaysOnTop).toHaveBeenCalledWith(false)
  })
})
