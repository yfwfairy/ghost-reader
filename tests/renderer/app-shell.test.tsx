import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'

describe('App single-window shell', () => {
  function setupApi(initialBookId: string | null) {
    let config = {
      hiddenOpacity: 0.1,
      readingOpacity: 0.85,
      fadeDelayMs: 1000,
      fadeDurationMs: 300,
      fontSize: 16,
      lineHeight: 1.8,
      activationShortcut: 'CommandOrControl+Shift+R',
      currentBookId: initialBookId,
      alwaysOnTop: false,
      readerBounds: null,
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

  it('switches from bookshelf to reader inside the same window', async () => {
    setupApi(null)

    render(<App />)

    expect(await screen.findByText('Bookshelf')).toBeInTheDocument()

    fireEvent.click((await screen.findAllByText('Example Book'))[0])

    expect(await screen.findByText('第一段')).toBeInTheDocument()
  })

  it('starts on reader page when config already has a selected book', async () => {
    setupApi('book-1')

    render(<App />)

    expect(await screen.findByText('第一段')).toBeInTheDocument()
  })

  it('navigates back to bookshelf from reader close action', async () => {
    setupApi('book-1')

    render(<App />)

    expect(await screen.findByText('第一段')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Close reader' }))

    expect(await screen.findByText('Bookshelf')).toBeInTheDocument()
  })
})
