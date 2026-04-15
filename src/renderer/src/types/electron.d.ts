import type { GhostReaderApi } from '@shared/types'

declare global {
  interface Window {
    api: GhostReaderApi
  }
}

export {}
