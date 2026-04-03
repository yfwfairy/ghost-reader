import { useState } from 'react'
import type { ReaderMode } from '@shared/types'

type UseReaderStateOptions = {
  fadeDelayMs: number
}

export function useReaderState(_options: UseReaderStateOptions) {
  const [mode, setMode] = useState<ReaderMode>('reading')

  function enterReading() {
    setMode('reading')
  }

  function hideReader() {
    setMode('hidden')
  }

  function handleMouseLeave() {
    hideReader()
  }

  function handleMouseEnter() {
    enterReading()
  }

  return {
    mode,
    enterReading,
    hideReader,
    handleMouseEnter,
    handleMouseLeave,
  }
}
