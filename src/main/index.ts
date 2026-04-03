import { app } from 'electron'
import { WindowManager } from './window-manager'

const windowManager = new WindowManager()

app.whenReady().then(() => {
  windowManager.createBookshelfWindow()
  windowManager.createReaderWindow()
  windowManager.registerShortcut()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
