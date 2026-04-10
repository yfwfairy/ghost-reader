export type BookFormat = 'txt' | 'epub'

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

export type Locale = 'en' | 'zh' | 'zh-TW'

export interface AppConfig {
  fontSize: number
  lineHeight: number
  currentBookId: string | null
  alwaysOnTop: boolean
  language: Locale
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
