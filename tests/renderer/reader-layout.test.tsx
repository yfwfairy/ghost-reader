import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReaderLayout } from '../../src/renderer/src/components/reader/ReaderLayout'

describe('ReaderLayout', () => {
  it('renders a visible close control', () => {
    const onHide = vi.fn()

    render(
      <ReaderLayout mode="hidden" onClose={onHide}>
        <div>reader body</div>
      </ReaderLayout>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close reader' }))

    expect(onHide).toHaveBeenCalledTimes(1)
  })
})
