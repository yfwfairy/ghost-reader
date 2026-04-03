import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BookshelfPage } from '../../src/renderer/src/components/bookshelf/BookshelfPage'

describe('BookshelfPage', () => {
  it('renders the empty state when there are no books', async () => {
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
        importBooks: vi.fn(),
        openFileDialog: vi.fn().mockResolvedValue([]),
        setConfig: vi.fn(),
        openReader: vi.fn(),
        removeBook: vi.fn(),
      },
    })

    render(<BookshelfPage />)
    expect(await screen.findByText('Import Books')).toBeInTheDocument()
  })
})
