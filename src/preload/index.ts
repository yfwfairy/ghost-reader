import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type { AppConfig, GhostReaderApi } from '@shared/types'

const api: GhostReaderApi = {
  getConfig: () => ipcRenderer.invoke('config:get'),
  setConfig: (patch) => ipcRenderer.invoke('config:set', patch),
  onConfigChanged: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, config: AppConfig) => {
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
  resetProgress: (bookId) => ipcRenderer.invoke('progress:reset', bookId),
  readTxtFile: (filePath) => ipcRenderer.invoke('file:read-txt', filePath),
  readEpubFile: (filePath) => ipcRenderer.invoke('file:read-epub', filePath),
  getProgress: (bookId) => ipcRenderer.invoke('progress:get', bookId),
  saveProgress: (payload) => ipcRenderer.invoke('progress:set', payload),
  openFileDialog: () => ipcRenderer.invoke('file:open-dialog'),
  setAlwaysOnTop: (value) => ipcRenderer.invoke('window:set-always-on-top', value),
  setMinWindowSize: (width, height) => ipcRenderer.invoke('window:set-min-size', width, height),
  getLocations: (bookId) => ipcRenderer.invoke('locations:get', bookId),
  saveLocations: (bookId, data) => ipcRenderer.invoke('locations:set', bookId, data),
}

contextBridge.exposeInMainWorld('api', api)

// 暴露 webUtils 给渲染进程，用于获取拖放文件的真实路径
contextBridge.exposeInMainWorld('electronUtils', {
  getPathForFile: (file: File) => webUtils.getPathForFile(file),
})
