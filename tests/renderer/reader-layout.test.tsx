import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ReaderLayout } from '../../src/renderer/src/components/reader/ReaderLayout'

describe('ReaderLayout', () => {
  it('requires a double click on the activation strip while hidden', () => {
    const onActivate = vi.fn()

    render(
      <ReaderLayout
        mode="hidden"
        onActivate={onActivate}
        onHide={vi.fn()}
        onMouseEnter={vi.fn()}
        onMouseLeave={vi.fn()}
      >
        <div>reader body</div>
      </ReaderLayout>,
    )

    const strip = screen.getByLabelText('Activate reader')
    fireEvent.mouseEnter(strip)
    expect(onActivate).not.toHaveBeenCalled()

    fireEvent.doubleClick(strip)
    expect(onActivate).toHaveBeenCalledTimes(1)
  })
})
