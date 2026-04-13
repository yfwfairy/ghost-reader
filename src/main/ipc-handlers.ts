import { dialog, ipcMain } from 'electron'
import type { AppConfig, ReadingProgress } from '@shared/types'
import { buildBookRecord, pickSupportedPaths, readEpubFile, readTxtFile } from './file-service'
import {
  configStore,
  libraryStore,
  progressStore,
  removeBookAndProgress,
  upsertBook,
} from './store'

type WindowManagerBridge = {
  setMainWindowAlwaysOnTop: (value: boolean) => AppConfig
  broadcastConfig: () => void
  setMinimumSize: (width: number, height: number) => void
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
    const { alwaysOnTop, ...rest } = patch
    const hasNonWindowConfigPatch = Object.keys(rest).length > 0

    let next = hasNonWindowConfigPatch
      ? configStore.set(rest as Partial<AppConfig>)
      : configStore.get()

    if (alwaysOnTop !== undefined) {
      next = windowManager.setMainWindowAlwaysOnTop(alwaysOnTop)
      return next
    }

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

  registerHandler('progress:reset', (_event, bookId: string) => {
    const next = progressStore.getAll().filter((row) => row.bookId !== bookId)
    progressStore.setAll(next)
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
  registerHandler('file:read-epub', async (_event, filePath: string) => {
    const buffer = await readEpubFile(filePath)
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  })

  registerHandler('window:set-always-on-top', (_event, value: boolean) =>
    windowManager.setMainWindowAlwaysOnTop(value),
  )

  registerHandler('window:set-min-size', (_event, width: number, height: number) => {
    windowManager.setMinimumSize(width, height)
  })
}
