import { dialog, ipcMain } from 'electron'
import type { AppConfig, ReaderMode, ReadingProgress } from '@shared/types'
import { buildBookRecord, pickSupportedPaths, readTxtFile } from './file-service'
import {
  configStore,
  libraryStore,
  progressStore,
  removeBookAndProgress,
  upsertBook,
} from './store'

type WindowManagerBridge = {
  openReader: (bookId: string) => void
  setReaderMode: (mode: ReaderMode) => void
  closeReader: () => void
  broadcastConfig: () => void
}

function registerHandler<Args extends unknown[], ReturnValue>(
  channel: string,
  handler: (_event: Electron.IpcMainInvokeEvent, ...args: Args) => ReturnValue | Promise<ReturnValue>,
) {
  ipcMain.removeHandler(channel)
  ipcMain.handle(channel, handler)
}

export function registerIpcHandlers(windowManager: WindowManagerBridge) {
  registerHandler('config:get', () => configStore.get())
  registerHandler('config:set', (_event, patch: Partial<AppConfig>) => {
    const next = configStore.set(patch)
    windowManager.broadcastConfig()
    return next
  })

  registerHandler('library:list', () => libraryStore.get())
  registerHandler('library:import', async (_event, paths: string[]) => {
    const supportedPaths = pickSupportedPaths(paths)
    const imported = await Promise.all(supportedPaths.map((filePath) => buildBookRecord(filePath)))
    const next = imported.reduce(upsertBook, libraryStore.get())
    libraryStore.set(next)
    return imported
  })
  registerHandler('library:remove', (_event, bookId: string) => {
    const cleaned = removeBookAndProgress(libraryStore.get(), progressStore.getAll(), bookId)
    libraryStore.set(cleaned.books)
    progressStore.setAll(cleaned.progress)
  })

  registerHandler('progress:get', (_event, bookId: string) => {
    return progressStore.getAll().find((row) => row.bookId === bookId) ?? null
  })
  registerHandler('progress:set', (_event, payload: ReadingProgress) => {
    const current = progressStore.getAll().filter((row) => row.bookId !== payload.bookId)
    const next = [...current, payload]
    progressStore.setAll(next)
    return payload
  })

  registerHandler('file:open-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [{ name: 'Books', extensions: ['txt', 'epub'] }],
    })

    if (result.canceled) {
      return []
    }

    return pickSupportedPaths(result.filePaths)
  })
  registerHandler('file:read-txt', (_event, filePath: string) => readTxtFile(filePath))

  registerHandler('reader:open', (_event, bookId: string) => windowManager.openReader(bookId))
  registerHandler('reader:set-mode', (_event, mode: ReaderMode) => windowManager.setReaderMode(mode))
  registerHandler('reader:close', () => windowManager.closeReader())
}
