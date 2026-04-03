import '@testing-library/jest-dom/vitest'
import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const {
  renditionDestroy,
  renditionOn,
  renditionDisplay,
  themesDefault,
  renderTo,
  bookDestroy,
  epubFactory,
} = vi.hoisted(() => {
  const renditionDestroy = vi.fn()
  const renditionOn = vi.fn()
  const renditionDisplay = vi.fn()
  const themesDefault = vi.fn()
  const renderTo = vi.fn(() => ({
    themes: { default: themesDefault },
    display: renditionDisplay,
    on: renditionOn,
    destroy: renditionDestroy,
  }))
  const bookDestroy = vi.fn()
  const epubFactory = vi.fn(() => ({
    renderTo,
    destroy: bookDestroy,
  }))

  return {
    renditionDestroy,
    renditionOn,
    renditionDisplay,
    themesDefault,
    renderTo,
    bookDestroy,
    epubFactory,
  }
})

vi.mock('epubjs', () => ({
  default: epubFactory,
}))

import { EpubRenderer } from '../../src/renderer/src/components/reader/EpubRenderer'

describe('EpubRenderer', () => {
  it('does not recreate the epub rendition when the progress callback identity changes', () => {
    const { rerender } = render(
      <EpubRenderer
        filePath="/tmp/example.epub"
        fontSize={18}
        lineHeight={1.8}
        onProgressUpdate={vi.fn()}
      />,
    )

    expect(epubFactory).toHaveBeenCalledTimes(1)
    expect(renderTo).toHaveBeenCalledTimes(1)

    rerender(
      <EpubRenderer
        filePath="/tmp/example.epub"
        fontSize={18}
        lineHeight={1.8}
        onProgressUpdate={vi.fn()}
      />,
    )

    expect(epubFactory).toHaveBeenCalledTimes(1)
    expect(renderTo).toHaveBeenCalledTimes(1)
    expect(renditionDestroy).not.toHaveBeenCalled()
    expect(bookDestroy).not.toHaveBeenCalled()
  })
})
