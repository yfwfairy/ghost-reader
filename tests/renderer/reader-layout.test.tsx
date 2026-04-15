import '@testing-library/jest-dom/vitest'
import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReaderLayout } from '../../src/renderer/src/components/reader/ReaderLayout'

async function flushAsyncUi() {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('ReaderLayout', () => {
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
  })

  it('renders reader shell with content area and no toolbar', async () => {
    render(
      <ReaderLayout title="Example Book" meta="Ghost Author · EPUB">
        <div>reader body</div>
      </ReaderLayout>,
    )

    await flushAsyncUi()

    expect(document.querySelector('.reader-page__shell')).toBeInTheDocument()
    expect(document.querySelector('.reader-page__body')).toBeInTheDocument()
    expect(document.querySelector('.reader-page__content')).toBeInTheDocument()
    expect(screen.getByText('reader body')).toBeInTheDocument()

    // toolbar 已移至 AppFrame，ReaderLayout 不再渲染
    expect(document.querySelector('.reader-page__toolbar')).not.toBeInTheDocument()
  })
})
