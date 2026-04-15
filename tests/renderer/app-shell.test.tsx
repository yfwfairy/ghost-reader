import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'

async function flushAsyncUi() {
  await act(async () => {
    await Promise.resolve()
  })
}

async function expectReaderLoaded() {
  await waitFor(() => {
    expect(window.api.readTxtFile).toHaveBeenCalledWith('/tmp/example.txt')
  })
  expect(await screen.findByText('第一段', {}, { timeout: 10_000 })).toBeInTheDocument()
}

async function openLibraryBook(title: string) {
  const titleNode = (await screen.findAllByText(title))[0]
  const openButton = titleNode.closest('button')
  if (!openButton) {
    throw new Error(`Could not find an open button for ${title}.`)
  }
  await act(async () => {
    fireEvent.click(openButton)
    await Promise.resolve()
  })
}

// App 中 useSystemDarkMode 调用了 window.matchMedia
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('App single-window shell', () => {
  function setupApi(initialBookId: string | null) {
    let config = {
      fontSize: 16,
      lineHeight: 1.8,
      fontFamily: 'Newsreader' as const,
      glassIntensity: 85,
      colorTheme: 'obsidian' as const,
      currentBookId: initialBookId,
      alwaysOnTop: false,
      language: 'en' as const,
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
        setMinWindowSize: vi.fn(),
        readEpubFile: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
      },
    })
  }

  function setupDeferredConfigApi(initialBookId: string | null) {
    let config = {
      fontSize: 16,
      lineHeight: 1.8,
      fontFamily: 'Newsreader' as const,
      glassIntensity: 85,
      colorTheme: 'obsidian' as const,
      currentBookId: initialBookId,
      alwaysOnTop: false,
      language: 'en' as const,
    }
    const configChangeCallbacks: ((next: typeof config) => void)[] = []

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getConfig: vi.fn().mockImplementation(async () => config),
        onConfigChanged: vi.fn((callback: (next: typeof config) => void) => {
          configChangeCallbacks.push(callback)
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
        setMinWindowSize: vi.fn(),
        readEpubFile: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
      },
    })

    return {
      emitConfig(nextConfig: typeof config) {
        config = nextConfig
        configChangeCallbacks.forEach((cb) => cb(nextConfig))
      },
    }
  }

  it('switches from bookshelf to reader inside the same window', async () => {
    setupApi(null)

    render(<App />)

    expect(document.querySelector('.app-frame')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Open library view' })).toBeInTheDocument()

    await openLibraryBook('Example Book')

    await expectReaderLoaded()
    expect(document.querySelector('.app-frame')).toBeInTheDocument()
    await waitFor(() => {
      expect(document.querySelector('.app-frame__title')).toHaveTextContent('Example Book')
    })
    expect(document.querySelector('.reader-page__topbar')).not.toBeInTheDocument()
  })

  it('starts on home page even when config already has a selected book', async () => {
    setupApi('book-1')

    render(<App />)

    // 始终从首页进入，不自动恢复阅读器
    expect(await screen.findByRole('button', { name: 'Open library view' })).toBeInTheDocument()
  })

  it('navigates back to bookshelf from reader back action', async () => {
    setupApi(null)

    render(<App />)

    // 先从首页导航到阅读器
    await openLibraryBook('Example Book')
    await expectReaderLoaded()

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
    setupApi(null)

    render(<App />)

    // 先从首页导航到阅读器
    await openLibraryBook('Example Book')
    await expectReaderLoaded()

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
        fontFamily: 'Newsreader' as const,
        glassIntensity: 85,
        colorTheme: 'obsidian' as const,
        currentBookId: 'book-1',
        alwaysOnTop: false,
        language: 'en' as const,
      })
    })

    await expectReaderLoaded()

    fireEvent.click(screen.getByRole('button', { name: 'Back to bookshelf' }))

    expect(await screen.findByRole('button', { name: 'Open recent view' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Open library view' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('stays on the bookshelf after manual back when the same selected book is broadcast again', async () => {
    const { emitConfig } = setupDeferredConfigApi(null)

    render(<App />)

    expect(await screen.findByRole('button', { name: 'Open library view' })).toBeInTheDocument()
    await flushAsyncUi()

    // 通过 config 变更导航到阅读器
    act(() => {
      emitConfig({
        fontSize: 16,
        lineHeight: 1.8,
        fontFamily: 'Newsreader' as const,
        glassIntensity: 85,
        colorTheme: 'obsidian' as const,
        currentBookId: 'book-1',
        alwaysOnTop: false,
        language: 'en' as const,
      })
    })

    await expectReaderLoaded()

    fireEvent.click(screen.getByRole('button', { name: 'Back to bookshelf' }))

    expect(await screen.findByRole('button', { name: 'Open library view' })).toBeInTheDocument()
    await flushAsyncUi()

    // 再次广播相同的 bookId 不应该切回阅读器
    act(() => {
      emitConfig({
        fontSize: 16,
        lineHeight: 1.8,
        fontFamily: 'Newsreader' as const,
        glassIntensity: 85,
        colorTheme: 'obsidian' as const,
        currentBookId: 'book-1',
        alwaysOnTop: false,
        language: 'en' as const,
      })
    })

    expect(screen.getByRole('button', { name: 'Open library view' })).toBeInTheDocument()
    expect(screen.queryByText('第一段')).not.toBeInTheDocument()
  })

  it('switches into reader when config selects a book after mount', async () => {
    const { emitConfig } = setupDeferredConfigApi(null)

    render(<App />)

    expect(await screen.findByRole('button', { name: 'Open library view' })).toBeInTheDocument()
    await flushAsyncUi()

    act(() => {
      emitConfig({
        fontSize: 16,
        lineHeight: 1.8,
        fontFamily: 'Newsreader' as const,
        glassIntensity: 85,
        colorTheme: 'obsidian' as const,
        currentBookId: 'book-1',
        alwaysOnTop: false,
        language: 'en' as const,
      })
    })

    await expectReaderLoaded()
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
    let resolveConfig!: (value: any) => void
    const configPromise = new Promise<any>((resolve) => {
      resolveConfig = resolve
    })
    const setAlwaysOnTop = vi.fn().mockImplementation(async (value: boolean) => ({
      fontSize: 16,
      lineHeight: 1.8,
      fontFamily: 'Newsreader' as const,
      glassIntensity: 85,
      colorTheme: 'obsidian' as const,
      currentBookId: null,
      alwaysOnTop: value,
      language: 'en' as const,
    }))

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getConfig: vi.fn(() => configPromise),
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
        setMinWindowSize: vi.fn(),
        readEpubFile: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
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
      fontFamily: 'Newsreader' as const,
      glassIntensity: 85,
      colorTheme: 'obsidian' as const,
      currentBookId: null,
      alwaysOnTop: true,
      language: 'en' as const,
    })

    const unpinButton = await screen.findByRole('button', { name: 'Unpin window' })
    expect(unpinButton).toBeEnabled()
    fireEvent.click(unpinButton)

    expect(setAlwaysOnTop).toHaveBeenCalledWith(false)
  })
})
