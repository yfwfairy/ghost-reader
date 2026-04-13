export type BookFormat = 'txt' | 'epub'

export interface BookRecord {
  id: string
  title: string
  author: string
  format: BookFormat
  filePath: string
  coverDataUrl?: string
  wordCount?: number
  importedAt: number
  updatedAt: number
}

export interface ReadingProgress {
  bookId: string
  percentage: number
  updatedAt: number
  txtScrollTop?: number
  epubCfi?: string
  chapterProgress?: Record<string, number>
}

export interface TocEntry {
  id: string
  href: string
  label: string
  subitems?: TocEntry[]
}

export type Locale = 'en' | 'zh' | 'zh-TW'
export type FontFamily = 'Newsreader' | 'Manrope' | 'Inter' | 'Lora' | 'Merriweather'
export type ColorTheme = 'obsidian' | 'parchment' | 'midnight' | 'onyx' | 'ember' | 'forest' | 'ocean' | 'slate'

export interface AppConfig {
  fontSize: number
  lineHeight: number
  fontFamily: FontFamily
  glassIntensity: number
  colorTheme: ColorTheme
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
  resetProgress: (bookId: string) => Promise<void>
  readTxtFile: (filePath: string) => Promise<string>
  readEpubFile: (filePath: string) => Promise<ArrayBuffer>
  getProgress: (bookId: string) => Promise<ReadingProgress | null>
  saveProgress: (payload: ReadingProgress) => Promise<ReadingProgress>
  openFileDialog: () => Promise<string[]>
  setAlwaysOnTop: (value: boolean) => Promise<AppConfig>
  setMinWindowSize: (width: number, height: number) => Promise<void>
}
