import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReaderLayout } from '../../src/renderer/src/components/reader/ReaderLayout'

describe('ReaderLayout', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        getConfig: vi.fn().mockResolvedValue({
          fontSize: 16,
          lineHeight: 1.8,
          currentBookId: null,
          alwaysOnTop: false,
          language: 'en',
        }),
        onConfigChanged: vi.fn(() => vi.fn()),
        setConfig: vi.fn(),
      },
    })
  })

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
