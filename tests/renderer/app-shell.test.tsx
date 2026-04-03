import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/src/App'

describe('App reader shell', () => {
  afterEach(() => {
    window.history.replaceState({}, '', '/')
  })

  it('renders a quiet reader shell in reader mode', async () => {
    window.history.replaceState({}, '', '/?mode=reader')
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getConfig: vi.fn().mockResolvedValue({
          hiddenOpacity: 0.1,
          readingOpacity: 0.85,
          fadeDelayMs: 1000,
          fadeDurationMs: 300,
          fontSize: 16,
          lineHeight: 1.8,
          activationShortcut: 'CommandOrControl+Shift+R',
          currentBookId: null,
          readerBounds: null,
        }),
        getAllBooks: vi.fn().mockResolvedValue([]),
        getProgress: vi.fn(),
        readTxtFile: vi.fn(),
        saveProgress: vi.fn(),
        setReaderMode: vi.fn(),
      },
    })

    render(<App />)

    expect(await screen.findByText('Reading Lens')).toBeInTheDocument()
    expect(screen.getByText('A suspended reading surface for long-form focus.')).toBeInTheDocument()
  })
})
