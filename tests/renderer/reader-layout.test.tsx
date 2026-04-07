import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReaderLayout } from '../../src/renderer/src/components/reader/ReaderLayout'

describe('ReaderLayout', () => {
  it('renders page-level reader chrome with back action, title, and metadata', () => {
    const onBack = vi.fn()
    const onToggleAlwaysOnTop = vi.fn()

    render(
      <ReaderLayout
        frameTitle="Example Book"
        title="Example Book"
        meta="Ghost Author · EPUB"
        alwaysOnTop={false}
        onToggleAlwaysOnTop={onToggleAlwaysOnTop}
        onBack={onBack}
      >
        <div>reader body</div>
      </ReaderLayout>,
    )

    expect(document.querySelector('.reader-page__shell')).toBeInTheDocument()
    expect(document.querySelector('.app-frame')).not.toBeInTheDocument()
    expect(document.querySelector('.reader-page__topbar')).toBeInTheDocument()
    expect(document.querySelector('.reader-page__body')).toBeInTheDocument()
    expect(screen.getAllByText('Example Book')).toHaveLength(2)
    expect(screen.getByText('Ghost Author · EPUB')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to bookshelf' })).toHaveTextContent('Back to bookshelf')

    fireEvent.click(screen.getByRole('button', { name: 'Back to bookshelf' }))
    expect(onBack).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Pin window' }))
    expect(onToggleAlwaysOnTop).toHaveBeenCalledTimes(1)
  })
})
