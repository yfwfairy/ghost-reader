import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TxtRenderer } from '../../src/renderer/src/components/reader/TxtRenderer'

describe('TxtRenderer', () => {
  it('renders paragraphs and reports scroll progress', () => {
    const onProgress = vi.fn()

    render(
      <TxtRenderer
        content={'第一段\n\n第二段'}
        config={{ fontSize: 16, lineHeight: 1.8 }}
        savedProgress={{ bookId: '1', percentage: 0, updatedAt: 1, txtScrollTop: 0 }}
        onProgressUpdate={onProgress}
      />,
    )

    expect(screen.getByText('第一段')).toBeInTheDocument()

    const renderer = screen.getByTestId('txt-renderer')
    Object.defineProperty(renderer, 'scrollTop', { configurable: true, writable: true, value: 120 })
    Object.defineProperty(renderer, 'scrollHeight', { configurable: true, value: 600 })
    Object.defineProperty(renderer, 'clientHeight', { configurable: true, value: 300 })

    fireEvent.scroll(renderer)

    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        txtScrollTop: 120,
        percentage: 40,
      }),
    )
  })
})
