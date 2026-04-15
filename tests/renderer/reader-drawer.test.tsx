import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TocEntry } from '../../src/shared/types'
import { ReaderDrawer } from '../../src/renderer/src/components/reader/ReaderDrawer'

describe('ReaderDrawer', () => {
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
          appearance: 'dark',
          appearanceFollowSystem: false,
          currentBookId: null,
          alwaysOnTop: false,
          language: 'en',
        }),
        onConfigChanged: vi.fn(() => vi.fn()),
        setConfig: vi.fn(),
      },
    })

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })

  it('switches to the matching anthology book when toc data arrives after the drawer is already open', async () => {
    const lateAnthologyToc: TocEntry[] = [
      {
        id: 'book-1',
        href: 'book-1.xhtml',
        label: 'Book One',
        subitems: [
          {
            id: 'book-1-chapter-1',
            href: 'book-1/chapter-1.xhtml',
            label: 'Book One Chapter',
          },
        ],
      },
      {
        id: 'book-2',
        href: 'book-2.xhtml',
        label: 'Book Two',
        subitems: [
          {
            id: 'book-2-chapter-1',
            href: 'book-2/chapter-1.xhtml',
            label: 'Book Two Chapter',
          },
        ],
      },
    ]

    const { rerender } = render(
      <ReaderDrawer
        open
        activeTab="chapters"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
        toc={[]}
        currentChapterHref="book-2/chapter-1.xhtml"
      />,
    )

    expect(await screen.findByText('No chapters available.')).toBeInTheDocument()

    rerender(
      <ReaderDrawer
        open
        activeTab="chapters"
        onTabChange={vi.fn()}
        onClose={vi.fn()}
        toc={lateAnthologyToc}
        currentChapterHref="book-2/chapter-1.xhtml"
      />,
    )

    expect(await screen.findByRole('combobox')).toHaveValue('1')
    expect(screen.getByText('Book Two Chapter')).toBeInTheDocument()
  })
})
