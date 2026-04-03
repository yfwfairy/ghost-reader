import { useEffect, useRef, useState } from 'react'
import type { ReaderMode } from '@shared/types'

type UseReaderStateOptions = {
  fadeDelayMs: number
}

export function useReaderState({ fadeDelayMs }: UseReaderStateOptions) {
  const [mode, setMode] = useState<ReaderMode>('hidden')
  const leaveTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  function clearLeaveTimer() {
    if (leaveTimer.current === null) {
      return
    }

    window.clearTimeout(leaveTimer.current)
    leaveTimer.current = null
  }

  function enterReading() {
    clearLeaveTimer()
    setMode('reading')
    void window.api.setReaderMode('reading')
  }

  function handleMouseLeave() {
    clearLeaveTimer()
    leaveTimer.current = window.setTimeout(() => {
      setMode('hidden')
      void window.api.setReaderMode('hidden')
      leaveTimer.current = null
    }, fadeDelayMs)
  }

  function handleMouseEnter() {
    enterReading()
  }

  useEffect(() => {
    return () => {
      clearLeaveTimer()
    }
  }, [])

  return {
    mode,
    enterReading,
    handleMouseEnter,
    handleMouseLeave,
  }
}
