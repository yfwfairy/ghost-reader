export type BookFormat = 'txt' | 'epub'
export type ReaderMode = 'hidden' | 'reading'

export interface BookRecord {
  id: string
  title: string
  author: string
  format: BookFormat
  filePath: string
  coverDataUrl?: string
  importedAt: number
  updatedAt: number
}

export interface ReadingProgress {
  bookId: string
  percentage: number
  updatedAt: number
  txtScrollTop?: number
  epubCfi?: string
}

export interface AppConfig {
  hiddenOpacity: number
  readingOpacity: number
  fadeDelayMs: number
  fadeDurationMs: number
  fontSize: number
  lineHeight: number
  activationShortcut: string
  currentBookId: string | null
  alwaysOnTop: boolean
  readerBounds: {
    x: number
    y: number
    width: number
    height: number
  } | null
}

export interface GhostReaderApi {
  getConfig: () => Promise<AppConfig>
  setConfig: (patch: Partial<AppConfig>) => Promise<AppConfig>
  onConfigChanged: (listener: (config: AppConfig) => void) => () => void
  getAllBooks: () => Promise<BookRecord[]>
  importBooks: (paths: string[]) => Promise<BookRecord[]>
  removeBook: (bookId: string) => Promise<void>
  readTxtFile: (filePath: string) => Promise<string>
  getProgress: (bookId: string) => Promise<ReadingProgress | null>
  saveProgress: (payload: ReadingProgress) => Promise<ReadingProgress>
  openFileDialog: () => Promise<string[]>
  setAlwaysOnTop: (value: boolean) => Promise<AppConfig>
}
