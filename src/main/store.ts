import Store from 'electron-store'
import { DEFAULT_APP_CONFIG } from '@shared/constants'
import type { AppConfig, BookRecord, ReadingProgress } from '@shared/types'

type StoreShape = {
  config: AppConfig
  books: BookRecord[]
  progress: ReadingProgress[]
}

export function applyConfigPatch(current: AppConfig, patch: Partial<AppConfig>): AppConfig {
  return { ...current, ...patch }
}

export function upsertBook(current: BookRecord[], incoming: BookRecord): BookRecord[] {
  const existingIndex = current.findIndex((book) => book.id === incoming.id)

  if (existingIndex === -1) {
    return [...current, incoming]
  }

  const next = [...current]
  next[existingIndex] = incoming
  return next
}

export function removeBookAndProgress(
  books: BookRecord[],
  progress: ReadingProgress[],
  bookId: string,
) {
  return {
    books: books.filter((book) => book.id !== bookId),
    progress: progress.filter((item) => item.bookId !== bookId),
  }
}

const store = new Store<StoreShape>({
  name: 'ghost-reader',
  defaults: {
    config: { ...DEFAULT_APP_CONFIG, readerBounds: null },
    books: [],
    progress: [],
  },
})

export const configStore = {
  get: () => store.get('config'),
  set: (patch: Partial<AppConfig>) => {
    const next = applyConfigPatch(store.get('config'), patch)
    store.set('config', next)
    return next
  },
}

export const libraryStore = {
  get: () => store.get('books'),
  set: (books: BookRecord[]) => store.set('books', books),
}

export const progressStore = {
  getAll: () => store.get('progress'),
  setAll: (rows: ReadingProgress[]) => store.set('progress', rows),
}
