import { BrowserWindow, globalShortcut, screen } from 'electron'
import { DEFAULT_APP_CONFIG } from '@shared/constants'
import { configStore } from './store'
import { buildOpacityFrames } from './window-geometry'
import {
  attachReaderBoundsPersistence,
  createOpacityFadeRunner,
  resolvePersistedReaderBounds,
  resolveBookshelfWindowLoad,
  resolveReaderWindowLoad,
} from './window-manager-helpers'

export type ReaderMode = 'hidden' | 'reading'

export class WindowManager {
  private bookshelfWindow: BrowserWindow | null = null
  private readerWindow: BrowserWindow | null = null
  private readerMode: ReaderMode = 'hidden'
  private fadeRunner = createOpacityFadeRunner({ setTimeout, clearTimeout })

  createBookshelfWindow() {
    this.bookshelfWindow = new BrowserWindow({
      width: 1080,
      height: 720,
      minWidth: 900,
      minHeight: 600,
      title: 'Ghost Reader',
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

  createReaderWindow() {
    const saved = configStore.get()
    this.readerWindow = new BrowserWindow({
      ...(saved.readerBounds ?? { width: 360, height: 680 }),
      x: saved.readerBounds?.x,
      y: saved.readerBounds?.y,
      transparent: true,
      frame: false,
      alwaysOnTop: true,
      hasShadow: false,
      skipTaskbar: true,
      visibleOnAllWorkspaces: true,
      backgroundColor: '#00000000',
      show: false,
      webPreferences: {
        preload: `${__dirname}/../preload/index.js`,
        webSecurity: false,
      },
    })

    attachReaderBoundsPersistence(this.readerWindow, () => this.persistReaderBounds())

    this.readerWindow.setIgnoreMouseEvents(true, { forward: true })
    this.readerWindow.setOpacity(saved.hiddenOpacity ?? DEFAULT_APP_CONFIG.hiddenOpacity)

    const target = resolveReaderWindowLoad(__dirname, process.env.ELECTRON_RENDERER_URL)
    if (target.type === 'url') {
      void this.readerWindow.loadURL(target.url)
      return
    }

    void this.readerWindow.loadFile(target.filePath, target.options)
  }

  openReader(bookId: string) {
    configStore.set({ currentBookId: bookId })
    this.broadcastConfig()
    if (!this.readerWindow) return
    this.readerWindow.showInactive()
    this.setReaderMode('reading')
  }

  setReaderMode(mode: ReaderMode) {
    if (!this.readerWindow) return
    const config = configStore.get()
    const target = mode === 'reading' ? config.readingOpacity : config.hiddenOpacity
    const current = this.readerWindow.getOpacity()
    this.fadeRunner.start(buildOpacityFrames(current, target, 20), (frame) => {
      this.readerWindow?.setOpacity(frame)
    })

    this.readerWindow.setIgnoreMouseEvents(mode === 'hidden', { forward: mode === 'hidden' })
    this.readerMode = mode
    this.readerWindow.showInactive()
  }

  registerShortcut() {
    const { activationShortcut } = configStore.get()
    globalShortcut.register(activationShortcut, () => {
      this.setReaderMode(this.readerMode === 'hidden' ? 'reading' : 'hidden')
    })
  }

  persistReaderBounds() {
    if (!this.readerWindow) return
    const currentBounds = this.readerWindow.getBounds()
    const workArea = screen.getDisplayMatching(currentBounds).workArea
    const next = resolvePersistedReaderBounds(currentBounds, workArea)
    configStore.set({ readerBounds: next })
  }

  broadcastConfig() {
    const config = configStore.get()
    this.bookshelfWindow?.webContents.send('config:changed', config)
    this.readerWindow?.webContents.send('config:changed', config)
  }
}
