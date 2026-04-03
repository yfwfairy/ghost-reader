export const SUPPORTED_BOOK_FORMATS = ['.txt', '.epub'] as const

export const DEFAULT_WINDOW_SIZE = {
  width: 1100,
  height: 800,
} as const

export const DEFAULT_APP_CONFIG = {
  hiddenOpacity: 0.1,
  readingOpacity: 0.85,
  fadeDelayMs: 1000,
  fadeDurationMs: 300,
  fontSize: 16,
  lineHeight: 1.8,
  activationShortcut: 'CommandOrControl+Shift+R',
  currentBookId: null,
  alwaysOnTop: false,
  readerBounds: null,
} as const
