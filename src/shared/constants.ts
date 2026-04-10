export const SUPPORTED_BOOK_FORMATS = ['.txt', '.epub'] as const

export const DEFAULT_WINDOW_SIZE = {
  width: 1100,
  height: 800,
} as const

export const DEFAULT_APP_CONFIG = {
  fontSize: 16,
  lineHeight: 1.8,
  currentBookId: null,
  alwaysOnTop: false,
  language: 'en',
} as const
