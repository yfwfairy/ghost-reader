import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BookshelfBook } from '../../src/renderer/src/hooks/useBookshelfData'
import { RecentView } from '../../src/renderer/src/components/bookshelf/RecentView'

// PlaceholderCover → useConfig → window.api.getConfig
beforeEach(() => {
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      getConfig: vi.fn().mockResolvedValue({
        fontSize: 16,
        lineHeight: 1.8,
        fontFamily: 'Newsreader',
        glassIntensity: 85,
        colorTheme: 'obsidian',
        currentBookId: null,
        alwaysOnTop: false,
        language: 'en',
        appearance: 'dark',
        appearanceFollowSystem: false,
      }),
      onConfigChanged: vi.fn(() => vi.fn()),
      setConfig: vi.fn(),
    },
  })
})

function createRecentBook(overrides: Partial<BookshelfBook> = {}): BookshelfBook {
  return {
    id: 'book-1',
    title: 'Example Book',
    author: 'Ghost',
    format: 'txt',
    filePath: '/tmp/example.txt',
    importedAt: 1,
    updatedAt: 1,
    progress: {
      bookId: 'book-1',
      percentage: 42,
      updatedAt: 1710000000000,
    },
    ...overrides,
  }
}

describe('RecentView', () => {
  it('renders recent cards with title, copy, progress, and last-opened metadata', () => {
    render(
      <RecentView
        books={[
          createRecentBook({ id: 'book-2', title: 'Most Recent', progress: { bookId: 'book-2', percentage: 80, updatedAt: 1710100000000 } }),
          createRecentBook({ id: 'book-1', title: 'Earlier Session', progress: { bookId: 'book-1', percentage: 42, updatedAt: 1710000000000 } }),
        ]}
        onOpen={vi.fn()}
        onOpenLibrary={vi.fn()}
        resetBooks={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { level: 2, name: 'Recent Encounters' })).toBeInTheDocument()
    expect(screen.getByText('Resuming your nocturnal drifts.')).toBeInTheDocument()
    expect(screen.getByText('Most Recent')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    // formatLastOpened 对超过 7 天的日期返回 YY-MM-DD 格式，两张卡片各一条
    expect(screen.getAllByText(/Last opened \d{2}-03-1[01]/)).toHaveLength(2)
  })

  it('opens reader when a recent card is clicked', () => {
    const onOpen = vi.fn()

    render(<RecentView books={[createRecentBook()]} onOpen={onOpen} onOpenLibrary={vi.fn()} resetBooks={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Example Book in reader' }))

    expect(onOpen).toHaveBeenCalledWith('book-1')
  })

  it('renders centered empty state and routes to library with a single action', () => {
    const onOpenLibrary = vi.fn()

    render(<RecentView books={[]} onOpen={vi.fn()} onOpenLibrary={onOpenLibrary} resetBooks={vi.fn()} />)

    expect(screen.getByRole('heading', { level: 2, name: 'Recent Encounters' })).toBeInTheDocument()
    expect(screen.getByText('All reading is unfinished.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Open .* in reader/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Browse Library/i }))

    expect(onOpenLibrary).toHaveBeenCalledTimes(1)
  })
})
