import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_APP_CONFIG } from '../../src/shared/constants'

describe('ipc handlers always-on-top routing', () => {
  it('routes config:set alwaysOnTop through the window manager path', async () => {
    vi.resetModules()

    const handlers = new Map<string, (...args: unknown[]) => unknown>()
    const ipcMain = {
      removeHandler: vi.fn(),
      handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
        handlers.set(channel, handler)
      }),
    }

    const configSetSpy = vi.fn()

    vi.doMock('electron', () => ({
      dialog: { showOpenDialog: vi.fn() },
      ipcMain,
    }))
    vi.doMock('../../src/main/store', () => ({
      configStore: {
        get: vi.fn(() => DEFAULT_APP_CONFIG),
        set: configSetSpy,
      },
      libraryStore: {
        get: vi.fn(() => []),
        set: vi.fn(),
      },
      progressStore: {
        getAll: vi.fn(() => []),
        setAll: vi.fn(),
      },
      removeBookAndProgress: vi.fn(() => ({ books: [], progress: [] })),
      upsertBook: vi.fn(),
    }))
    vi.doMock('../../src/main/file-service', () => ({
      buildBookRecord: vi.fn(),
      pickSupportedPaths: vi.fn((paths: string[]) => paths),
      readTxtFile: vi.fn(),
    }))

    const { registerIpcHandlers } = await import('../../src/main/ipc-handlers')

    const windowManager = {
      setMainWindowAlwaysOnTop: vi.fn((value: boolean) => ({
        ...DEFAULT_APP_CONFIG,
        alwaysOnTop: value,
      })),
      broadcastConfig: vi.fn(),
    }

    registerIpcHandlers(windowManager)

    const configSetHandler = handlers.get('config:set')
    expect(configSetHandler).toBeTypeOf('function')

    const result = await configSetHandler?.({}, { alwaysOnTop: true })

    expect(windowManager.setMainWindowAlwaysOnTop).toHaveBeenCalledWith(true)
    expect(configSetSpy).not.toHaveBeenCalled()
    expect(result).toEqual(expect.objectContaining({ alwaysOnTop: true }))
  })

  it('applies non-window config keys and always-on-top together', async () => {
    vi.resetModules()

    const handlers = new Map<string, (...args: unknown[]) => unknown>()
    const ipcMain = {
      removeHandler: vi.fn(),
      handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
        handlers.set(channel, handler)
      }),
    }

    const configSetSpy = vi.fn((patch: Record<string, unknown>) => ({
      ...DEFAULT_APP_CONFIG,
      ...patch,
    }))

    vi.doMock('electron', () => ({
      dialog: { showOpenDialog: vi.fn() },
      ipcMain,
    }))
    vi.doMock('../../src/main/store', () => ({
      configStore: {
        get: vi.fn(() => DEFAULT_APP_CONFIG),
        set: configSetSpy,
      },
      libraryStore: {
        get: vi.fn(() => []),
        set: vi.fn(),
      },
      progressStore: {
        getAll: vi.fn(() => []),
        setAll: vi.fn(),
      },
      removeBookAndProgress: vi.fn(() => ({ books: [], progress: [] })),
      upsertBook: vi.fn(),
    }))
    vi.doMock('../../src/main/file-service', () => ({
      buildBookRecord: vi.fn(),
      pickSupportedPaths: vi.fn((paths: string[]) => paths),
      readTxtFile: vi.fn(),
    }))

    const { registerIpcHandlers } = await import('../../src/main/ipc-handlers')

    const windowManager = {
      setMainWindowAlwaysOnTop: vi.fn((value: boolean) => ({
        ...DEFAULT_APP_CONFIG,
        fontSize: 21,
        alwaysOnTop: value,
      })),
      broadcastConfig: vi.fn(),
    }

    registerIpcHandlers(windowManager)

    const configSetHandler = handlers.get('config:set')
    expect(configSetHandler).toBeTypeOf('function')

    const result = await configSetHandler?.({}, { alwaysOnTop: true, fontSize: 21 })

    expect(configSetSpy).toHaveBeenCalledWith({ fontSize: 21 })
    expect(windowManager.setMainWindowAlwaysOnTop).toHaveBeenCalledWith(true)
    expect(result).toEqual(expect.objectContaining({ alwaysOnTop: true, fontSize: 21 }))
  })

  it('delegates window:set-always-on-top to the window manager', async () => {
    vi.resetModules()

    const handlers = new Map<string, (...args: unknown[]) => unknown>()
    const ipcMain = {
      removeHandler: vi.fn(),
      handle: vi.fn((channel: string, handler: (...args: unknown[]) => unknown) => {
        handlers.set(channel, handler)
      }),
    }

    vi.doMock('electron', () => ({
      dialog: { showOpenDialog: vi.fn() },
      ipcMain,
    }))
    vi.doMock('../../src/main/store', () => ({
      configStore: {
        get: vi.fn(() => DEFAULT_APP_CONFIG),
        set: vi.fn(),
      },
      libraryStore: {
        get: vi.fn(() => []),
        set: vi.fn(),
      },
      progressStore: {
        getAll: vi.fn(() => []),
        setAll: vi.fn(),
      },
      removeBookAndProgress: vi.fn(() => ({ books: [], progress: [] })),
      upsertBook: vi.fn(),
    }))
    vi.doMock('../../src/main/file-service', () => ({
      buildBookRecord: vi.fn(),
      pickSupportedPaths: vi.fn((paths: string[]) => paths),
      readTxtFile: vi.fn(),
    }))

    const { registerIpcHandlers } = await import('../../src/main/ipc-handlers')

    const windowManager = {
      setMainWindowAlwaysOnTop: vi.fn((value: boolean) => ({
        ...DEFAULT_APP_CONFIG,
        alwaysOnTop: value,
      })),
      broadcastConfig: vi.fn(),
    }

    registerIpcHandlers(windowManager)

    const handler = handlers.get('window:set-always-on-top')
    expect(handler).toBeTypeOf('function')

    const result = await handler?.({}, false)

    expect(windowManager.setMainWindowAlwaysOnTop).toHaveBeenCalledWith(false)
    expect(result).toEqual(expect.objectContaining({ alwaysOnTop: false }))
  })
})
