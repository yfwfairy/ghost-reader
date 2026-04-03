import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useReaderState } from '../../src/renderer/src/hooks/useReaderState'

describe('useReaderState', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns to hidden mode after the mouse leaves', () => {
    vi.useFakeTimers()

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
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.mode).toBe('hidden')
  })
})
