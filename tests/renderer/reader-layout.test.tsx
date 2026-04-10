import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReaderLayout } from '../../src/renderer/src/components/reader/ReaderLayout'

describe('ReaderLayout', () => {
  it('renders reader shell with content area and no toolbar', () => {
    render(
      <ReaderLayout title="Example Book" meta="Ghost Author · EPUB">
        <div>reader body</div>
      </ReaderLayout>,
    )

    expect(document.querySelector('.reader-page__shell')).toBeInTheDocument()
    expect(document.querySelector('.reader-page__body')).toBeInTheDocument()
    expect(document.querySelector('.reader-page__content')).toBeInTheDocument()
    expect(screen.getByText('reader body')).toBeInTheDocument()

    // toolbar 已移至 AppFrame，ReaderLayout 不再渲染
    expect(document.querySelector('.reader-page__toolbar')).not.toBeInTheDocument()
  })
})
