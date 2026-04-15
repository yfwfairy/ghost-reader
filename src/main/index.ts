import { app, BrowserWindow, nativeImage } from 'electron'
import { join } from 'node:path'
import { registerIpcHandlers } from './ipc-handlers'
import { WindowManager } from './window-manager'

const windowManager = new WindowManager()

app.whenReady().then(() => {
  // 设置 macOS Dock 图标
  if (process.platform === 'darwin') {
    const iconPath = join(__dirname, '../../resources/icon.png')
    const icon = nativeImage.createFromPath(iconPath)
    if (!icon.isEmpty()) {
      app.dock?.setIcon(icon)
    }
  }

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
