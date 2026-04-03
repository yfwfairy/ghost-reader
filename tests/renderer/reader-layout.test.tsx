import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReaderLayout } from '../../src/renderer/src/components/reader/ReaderLayout'

describe('ReaderLayout', () => {
  it('renders a visible hide control and forwards hover events', () => {
    const onMouseEnter = vi.fn()
    const onMouseLeave = vi.fn()
    const onHide = vi.fn()

    render(
      <ReaderLayout
        mode="hidden"
        onHide={onHide}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div>reader body</div>
      </ReaderLayout>,
    )

    const layout = screen.getByText('reader body').closest('section')
    expect(layout).not.toBeNull()

    fireEvent.mouseEnter(layout!)
    fireEvent.mouseLeave(layout!)
    fireEvent.click(screen.getByRole('button', { name: 'Close reader' }))

    expect(onMouseEnter).toHaveBeenCalledTimes(1)
    expect(onMouseLeave).toHaveBeenCalledTimes(1)
    expect(onHide).toHaveBeenCalledTimes(1)
  })
})
