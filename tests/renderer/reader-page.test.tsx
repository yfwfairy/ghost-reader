import '@testing-library/jest-dom/vitest'
import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AppConfig } from '../../src/shared/types'
import { ReaderPage } from '../../src/renderer/src/components/reader/ReaderPage'

const baseConfig: AppConfig = {
  hiddenOpacity: 0.12,
  readingOpacity: 0.9,
  fadeDelayMs: 300,
  fadeDurationMs: 180,
  fontSize: 18,
  lineHeight: 1.9,
  activationShortcut: 'CommandOrControl+Shift+R',
  currentBookId: null,
  alwaysOnTop: false,
  readerBounds: null,
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
})
