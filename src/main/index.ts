import { app, BrowserWindow } from 'electron'
import { registerIpcHandlers } from './ipc-handlers'
import { WindowManager } from './window-manager'

const windowManager = new WindowManager()

app.whenReady().then(() => {
  windowManager.createBookshelfWindow()
  registerIpcHandlers(windowManager)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length !== 0) return
    windowManager.createBookshelfWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
