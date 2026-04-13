import '@testing-library/jest-dom/vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { AppConfig } from '../../src/shared/types'
import { ReaderPage } from '../../src/renderer/src/components/reader/ReaderPage'

const baseConfig: AppConfig = {
  fontSize: 18,
  lineHeight: 1.9,
  fontFamily: 'Newsreader',
  glassIntensity: 85,
  colorTheme: 'obsidian',
  currentBookId: null,
  alwaysOnTop: false,
  language: 'en',
}

describe('ReaderPage', () => {
  it('loads the selected book when config changes after the window is already mounted', async () => {
    let handleConfigChange: ((next: AppConfig) => void) | null = null

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getConfig: vi.fn().mockResolvedValue(baseConfig),
        onConfigChanged: vi.fn((callback: (next: AppConfig) => void) => {
          handleConfigChange = callback
          return vi.fn()
        }),
        setConfig: vi.fn(),
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
        readTxtFile: vi.fn().mockResolvedValue('第一段\n\n第二段'),
        saveProgress: vi.fn(),
        openFileDialog: vi.fn(),
        importBooks: vi.fn(),
        removeBook: vi.fn(),
        setAlwaysOnTop: vi.fn(),
        setMinWindowSize: vi.fn(),
        readEpubFile: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
      },
    })

    render(<ReaderPage onBack={vi.fn()} />)

    expect(await screen.findByText('No book selected.')).toBeInTheDocument()
    expect(handleConfigChange).not.toBeNull()

    act(() => {
      handleConfigChange?.({ ...baseConfig, currentBookId: 'book-1' })
    })

    expect(await screen.findByText('第一段')).toBeInTheDocument()
    expect(window.api.readTxtFile).toHaveBeenCalledWith('/tmp/example.txt')
  })

  it('navigates back without clearing current book selection when back button is pressed', async () => {
    const onBack = vi.fn()
    const setConfig = vi.fn().mockResolvedValue({ ...baseConfig, currentBookId: null })
    const backRef = createRef<(() => void | Promise<void>) | null>()

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getConfig: vi.fn().mockResolvedValue({ ...baseConfig, currentBookId: 'book-1' }),
        onConfigChanged: vi.fn(() => vi.fn()),
        setConfig,
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
        openFileDialog: vi.fn(),
        importBooks: vi.fn(),
        removeBook: vi.fn(),
        setAlwaysOnTop: vi.fn(),
        setMinWindowSize: vi.fn(),
        readEpubFile: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
      },
    })

    render(<ReaderPage backRef={backRef} onBack={onBack} />)

    expect(await screen.findByText('第一段')).toBeInTheDocument()

    await act(async () => {
      await backRef.current?.()
    })

    expect(setConfig).not.toHaveBeenCalled()
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('flushes queued txt progress before navigating back', async () => {
    const saveProgress = vi.fn()
    const backRef = createRef<(() => void | Promise<void>) | null>()

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getConfig: vi.fn().mockResolvedValue({ ...baseConfig, currentBookId: 'book-1' }),
        onConfigChanged: vi.fn(() => vi.fn()),
        setConfig: vi.fn(),
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
        readTxtFile: vi.fn().mockResolvedValue('第一段\n\n第二段\n\n第三段'),
        saveProgress,
        openFileDialog: vi.fn(),
        importBooks: vi.fn(),
        removeBook: vi.fn(),
        setAlwaysOnTop: vi.fn(),
        setMinWindowSize: vi.fn(),
        readEpubFile: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
      },
    })

    render(<ReaderPage backRef={backRef} onBack={vi.fn()} />)

    const renderer = await screen.findByTestId('txt-renderer')
    Object.defineProperty(renderer, 'scrollHeight', { value: 1000, configurable: true })
    Object.defineProperty(renderer, 'clientHeight', { value: 400, configurable: true })
    Object.defineProperty(renderer, 'scrollTop', { value: 120, writable: true, configurable: true })

    vi.useFakeTimers()
    try {
      fireEvent.scroll(renderer)
      await act(async () => {
        await backRef.current?.()
      })

      expect(saveProgress).toHaveBeenCalledTimes(1)
      expect(saveProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          bookId: 'book-1',
          txtScrollTop: 120,
          percentage: 20,
        }),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('waits for a pending txt progress save before returning to the bookshelf', async () => {
    const onBack = vi.fn()
    const backRef = createRef<(() => void | Promise<void>) | null>()
    let resolveSaveProgress: (() => void) | null = null
    const saveProgress = vi.fn().mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSaveProgress = resolve
        }),
    )

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getConfig: vi.fn().mockResolvedValue({ ...baseConfig, currentBookId: 'book-1' }),
        onConfigChanged: vi.fn(() => vi.fn()),
        setConfig: vi.fn(),
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
        readTxtFile: vi.fn().mockResolvedValue('第一段\n\n第二段\n\n第三段'),
        saveProgress,
        openFileDialog: vi.fn(),
        importBooks: vi.fn(),
        removeBook: vi.fn(),
        setAlwaysOnTop: vi.fn(),
        setMinWindowSize: vi.fn(),
        readEpubFile: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
      },
    })

    render(<ReaderPage backRef={backRef} onBack={onBack} />)

    const renderer = await screen.findByTestId('txt-renderer')
    Object.defineProperty(renderer, 'scrollHeight', { value: 1000, configurable: true })
    Object.defineProperty(renderer, 'clientHeight', { value: 400, configurable: true })
    Object.defineProperty(renderer, 'scrollTop', { value: 120, writable: true, configurable: true })

    fireEvent.scroll(renderer)

    // 触发两次返回，第二次应被去重
    act(() => { void backRef.current?.() })
    act(() => { void backRef.current?.() })

    expect(saveProgress).toHaveBeenCalledTimes(1)
    expect(onBack).not.toHaveBeenCalled()

    resolveSaveProgress?.()

    await waitFor(() => {
      expect(onBack).toHaveBeenCalledTimes(1)
    })
  })

  it('still returns to the bookshelf if txt progress saving fails', async () => {
    const onBack = vi.fn()
    const backRef = createRef<(() => void | Promise<void>) | null>()
    const saveProgress = vi.fn().mockRejectedValue(new Error('disk offline'))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getConfig: vi.fn().mockResolvedValue({ ...baseConfig, currentBookId: 'book-1' }),
        onConfigChanged: vi.fn(() => vi.fn()),
        setConfig: vi.fn(),
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
        readTxtFile: vi.fn().mockResolvedValue('第一段\n\n第二段\n\n第三段'),
        saveProgress,
        openFileDialog: vi.fn(),
        importBooks: vi.fn(),
        removeBook: vi.fn(),
        setAlwaysOnTop: vi.fn(),
        setMinWindowSize: vi.fn(),
        readEpubFile: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
      },
    })

    try {
      render(<ReaderPage backRef={backRef} onBack={onBack} />)

      const renderer = await screen.findByTestId('txt-renderer')
      Object.defineProperty(renderer, 'scrollHeight', { value: 1000, configurable: true })
      Object.defineProperty(renderer, 'clientHeight', { value: 400, configurable: true })
      Object.defineProperty(renderer, 'scrollTop', { value: 120, writable: true, configurable: true })

      fireEvent.scroll(renderer)

      await act(async () => {
        await backRef.current?.()
      })

      expect(saveProgress).toHaveBeenCalledTimes(1)
      expect(onBack).toHaveBeenCalledTimes(1)

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to save reader progress before returning to the bookshelf.',
        expect.any(Error),
      )
    } finally {
      consoleError.mockRestore()
    }
  })
})
