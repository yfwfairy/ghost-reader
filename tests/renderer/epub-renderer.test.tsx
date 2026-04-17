import '@testing-library/jest-dom/vitest'
import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  renditionDestroy,
  renditionOn: _renditionOn,
  renditionDisplay,
  themesDefault: _themesDefault,
  renderTo,
  bookDestroy,
  epubFactory,
} = vi.hoisted(() => {
  const renditionDestroy = vi.fn()
  const renditionOn = vi.fn()
  const renditionDisplay = vi.fn()
  const themesDefault = vi.fn()
  const hooksRegister = vi.fn()
  const renderTo = vi.fn(() => ({
    themes: { default: themesDefault },
    display: renditionDisplay,
    on: renditionOn,
    destroy: renditionDestroy,
    hooks: {
      content: {
        register: hooksRegister,
      },
    },
  }))
  const bookDestroy = vi.fn()
  const spineEach = vi.fn()
  const epubFactory = vi.fn(() => ({
    renderTo,
    destroy: bookDestroy,
    ready: Promise.resolve(),
    spine: { each: spineEach, length: 0 },
    locations: { generate: vi.fn(() => Promise.resolve([])) },
    loaded: {
      navigation: Promise.resolve({ toc: [] }),
    },
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
  const bookData = new ArrayBuffer(8)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not recreate the epub rendition when the progress callback identity changes', async () => {
    let result: ReturnType<typeof render>
    await act(async () => {
      result = render(
        <EpubRenderer
          bookId="test-book-id"
          bookData={bookData}
          fontSize={18}
          lineHeight={1.8}
          fontFamily="Newsreader"
          colorTheme="obsidian"
          onProgressUpdate={vi.fn()}
        />,
      )
    })

    expect(epubFactory).toHaveBeenCalledTimes(1)
    expect(renderTo).toHaveBeenCalledTimes(1)

    await act(async () => {
      result!.rerender(
        <EpubRenderer
          bookId="test-book-id"
          bookData={bookData}
          fontSize={18}
          lineHeight={1.8}
          fontFamily="Newsreader"
          colorTheme="obsidian"
          onProgressUpdate={vi.fn()}
        />,
      )
    })

    expect(epubFactory).toHaveBeenCalledTimes(1)
    expect(renderTo).toHaveBeenCalledTimes(1)
    expect(renditionDestroy).not.toHaveBeenCalled()
    expect(bookDestroy).not.toHaveBeenCalled()
  })

  it('does not recreate the epub rendition when saved cfi changes', async () => {
    let result: ReturnType<typeof render>
    await act(async () => {
      result = render(
        <EpubRenderer
          bookId="test-book-id"
          bookData={bookData}
          fontSize={18}
          lineHeight={1.8}
          fontFamily="Newsreader"
          colorTheme="obsidian"
          savedCfi="epubcfi(/6/2!/4/2/2)"
          onProgressUpdate={vi.fn()}
        />,
      )
    })

    expect(epubFactory).toHaveBeenCalledTimes(1)
    expect(renderTo).toHaveBeenCalledTimes(1)
    expect(renditionDisplay).toHaveBeenCalledWith('epubcfi(/6/2!/4/2/2)')

    await act(async () => {
      result!.rerender(
        <EpubRenderer
          bookId="test-book-id"
          bookData={bookData}
          fontSize={18}
          lineHeight={1.8}
          fontFamily="Newsreader"
          colorTheme="obsidian"
          savedCfi="epubcfi(/6/2!/4/2/10)"
          onProgressUpdate={vi.fn()}
        />,
      )
    })

    expect(epubFactory).toHaveBeenCalledTimes(1)
    expect(renderTo).toHaveBeenCalledTimes(1)
    expect(renditionDestroy).not.toHaveBeenCalled()
    expect(bookDestroy).not.toHaveBeenCalled()
    expect(renditionDisplay).toHaveBeenCalledWith('epubcfi(/6/2!/4/2/10)')
  })
})
