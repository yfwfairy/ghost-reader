import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BookshelfPage } from '../../src/renderer/src/components/bookshelf/BookshelfPage'

describe('BookshelfPage', () => {
  it('renders the empty state when there are no books', async () => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
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
