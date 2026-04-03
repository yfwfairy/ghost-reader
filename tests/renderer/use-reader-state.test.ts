import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReaderState } from '../../src/renderer/src/hooks/useReaderState'

describe('useReaderState', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns to hidden mode immediately after the mouse leaves', () => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        setReaderMode: vi.fn(),
      },
    })

    const { result } = renderHook(() => useReaderState({ fadeDelayMs: 1000 }))

    act(() => {
      result.current.enterReading()
      result.current.handleMouseLeave()
    })

    expect(result.current.mode).toBe('hidden')
    expect(window.api.setReaderMode).toHaveBeenLastCalledWith('hidden')
  })

  it('does not reactivate reading mode when the mouse re-enters after hiding', () => {
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        setReaderMode: vi.fn(),
      },
    })

    const { result } = renderHook(() => useReaderState({ fadeDelayMs: 1000 }))

    act(() => {
      result.current.enterReading()
      result.current.handleMouseLeave()
      result.current.handleMouseEnter()
    })

    expect(result.current.mode).toBe('hidden')
    expect(window.api.setReaderMode).toHaveBeenCalledTimes(2)
    expect(window.api.setReaderMode).toHaveBeenNthCalledWith(1, 'reading')
    expect(window.api.setReaderMode).toHaveBeenNthCalledWith(2, 'hidden')
  })
})
