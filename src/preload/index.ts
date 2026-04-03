import { contextBridge, ipcRenderer } from 'electron'
import type { GhostReaderApi } from '@shared/types'

const api: GhostReaderApi = {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (patch) => ipcRenderer.invoke('config:set', patch),
  onConfigChanged: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, config: Awaited<ReturnType<GhostReaderApi['getConfig']>>) => {
      listener(config)
    }
    ipcRenderer.on('config:changed', wrapped)
    return () => {
      ipcRenderer.off('config:changed', wrapped)
    }
  },
  getAllBooks: () => ipcRenderer.invoke('library:list'),
  importBooks: (paths) => ipcRenderer.invoke('library:import', paths),
  removeBook: (bookId) => ipcRenderer.invoke('library:remove', bookId),
  readTxtFile: (filePath) => ipcRenderer.invoke('file:read-txt', filePath),
  getProgress: (bookId) => ipcRenderer.invoke('progress:get', bookId),
  saveProgress: (payload) => ipcRenderer.invoke('progress:set', payload),
  openFileDialog: () => ipcRenderer.invoke('file:open-dialog'),
  openReader: (bookId) => ipcRenderer.invoke('reader:open', bookId),
  setReaderMode: (mode) => ipcRenderer.invoke('reader:set-mode', mode),
  closeReader: () => ipcRenderer.invoke('reader:close'),
}

contextBridge.exposeInMainWorld('api', api)
