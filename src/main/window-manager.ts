import { BrowserWindow } from 'electron'
import { DEFAULT_WINDOW_SIZE } from '@shared/constants'
import type { AppConfig } from '@shared/types'
import { configStore } from './store'
import { resolveBookshelfWindowLoad } from './window-manager-helpers'

export class WindowManager {
  private bookshelfWindow: BrowserWindow | null = null

  createBookshelfWindow() {
    const saved = configStore.get()
    this.bookshelfWindow = new BrowserWindow({
      width: DEFAULT_WINDOW_SIZE.width,
      height: DEFAULT_WINDOW_SIZE.height,
      minWidth: 280,
      minHeight: 200,
      title: 'Ghost Reader',
      titleBarStyle: 'hiddenInset',
      vibrancy: 'under-window',
      visualEffectState: 'active',
      alwaysOnTop: saved.alwaysOnTop,
      webPreferences: {
        preload: `${__dirname}/../preload/index.js`,
      },
    })

    const target = resolveBookshelfWindowLoad(__dirname, process.env.ELECTRON_RENDERER_URL)

    if (target.type === 'url') {
      void this.bookshelfWindow.loadURL(target.url)
      return
    }

    void this.bookshelfWindow.loadFile(target.filePath, target.options)
  }

  setMainWindowAlwaysOnTop(value: boolean): AppConfig {
    if (!this.bookshelfWindow) {
      return configStore.set({ alwaysOnTop: value })
    }

    this.bookshelfWindow.setAlwaysOnTop(value)
    const next = configStore.set({ alwaysOnTop: value })
    this.broadcastConfig()
    return next
  }

  setMinimumSize(width: number, height: number) {
    if (!this.bookshelfWindow) {
      return
    }
    this.bookshelfWindow.setMinimumSize(width, height)

    // 如果当前窗口尺寸小于新下限，自动扩大
    const [currentWidth, currentHeight] = this.bookshelfWindow.getSize()
    const newWidth = Math.max(currentWidth, width)
    const newHeight = Math.max(currentHeight, height)
    if (newWidth !== currentWidth || newHeight !== currentHeight) {
      this.bookshelfWindow.setSize(newWidth, newHeight)
    }
  }

  broadcastConfig() {
    const config = configStore.get()
    this.bookshelfWindow?.webContents.send('config:changed', config)
  }
}
