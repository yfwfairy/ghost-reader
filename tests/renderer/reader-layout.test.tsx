import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReaderLayout } from '../../src/renderer/src/components/reader/ReaderLayout'

describe('ReaderLayout', () => {
  it('renders page-level reader toolbar without duplicating the app shell title bar', () => {
    const onBack = vi.fn()

    render(
      <ReaderLayout
        title="Example Book"
        meta="Ghost Author · EPUB"
        onBack={onBack}
      >
        <div>reader body</div>
      </ReaderLayout>,
    )

    expect(document.querySelector('.reader-page__shell')).toBeInTheDocument()
    expect(document.querySelector('.reader-page__topbar')).not.toBeInTheDocument()
    expect(document.querySelector('.reader-page__body')).toBeInTheDocument()
    expect(screen.getByText('Example Book')).toBeInTheDocument()
    expect(screen.getByText('Ghost Author · EPUB')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to bookshelf' })).toHaveTextContent('Back to bookshelf')

    fireEvent.click(screen.getByRole('button', { name: 'Back to bookshelf' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
