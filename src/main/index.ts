import { app, BrowserWindow } from 'electron'
import { WindowManager } from './window-manager'

const windowManager = new WindowManager()

app.whenReady().then(() => {
  windowManager.createBookshelfWindow()
  windowManager.createReaderWindow()
  windowManager.registerShortcut()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length !== 0) return
    windowManager.createBookshelfWindow()
    windowManager.createReaderWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
