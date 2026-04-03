import { BrowserWindow, globalShortcut, screen } from 'electron'
import { DEFAULT_APP_CONFIG } from '@shared/constants'
import { configStore } from './store'
import { buildOpacityFrames, snapToRightEdge } from './window-geometry'

export type ReaderMode = 'hidden' | 'reading'

export class WindowManager {
  private bookshelfWindow: BrowserWindow | null = null
  private readerWindow: BrowserWindow | null = null
  private readerMode: ReaderMode = 'hidden'
  private fadeTimer: NodeJS.Timeout | null = null

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

    void this.bookshelfWindow.loadURL(process.env.ELECTRON_RENDERER_URL ?? 'app://bookshelf')
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

    this.readerWindow.setIgnoreMouseEvents(true, { forward: true })
    this.readerWindow.setOpacity(saved.hiddenOpacity ?? DEFAULT_APP_CONFIG.hiddenOpacity)
    void this.readerWindow.loadURL(`${process.env.ELECTRON_RENDERER_URL}?mode=reader`)
  }

  openReader(bookId: string) {
    configStore.set({ currentBookId: bookId })
    if (!this.readerWindow) return
    this.readerWindow.showInactive()
    this.setReaderMode('reading')
  }

  setReaderMode(mode: ReaderMode) {
    if (!this.readerWindow) return
    const config = configStore.get()
    const target = mode === 'reading' ? config.readingOpacity : config.hiddenOpacity
    const current = this.readerWindow.getOpacity()

    if (this.fadeTimer) {
      clearTimeout(this.fadeTimer)
      this.fadeTimer = null
    }

    let delay = 0
    for (const frame of buildOpacityFrames(current, target, 20)) {
      delay += 15
      this.fadeTimer = setTimeout(() => this.readerWindow?.setOpacity(frame), delay)
    }

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
    const workArea = screen.getPrimaryDisplay().workArea
    const next = snapToRightEdge(this.readerWindow.getBounds(), workArea)
    configStore.set({ readerBounds: next })
  }
}
