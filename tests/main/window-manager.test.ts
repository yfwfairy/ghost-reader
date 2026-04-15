import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_APP_CONFIG } from '../../src/shared/constants'

describe('WindowManager always-on-top behavior', () => {
  it('updates BrowserWindow state, persists config, and broadcasts config changes', async () => {
    vi.resetModules()

    let config = { ...DEFAULT_APP_CONFIG, alwaysOnTop: false }
    const configGetSpy = vi.fn(() => structuredClone(config))
    const configSetSpy = vi.fn((patch: Record<string, unknown>) => {
      config = { ...config, ...patch }
      return structuredClone(config)
    })

    vi.doMock('electron', () => ({
      BrowserWindow: vi.fn(),
    }))
    vi.doMock('../../src/main/store', () => ({
      configStore: {
        get: configGetSpy,
        set: configSetSpy,
      },
    }))

    const { WindowManager } = await import('../../src/main/window-manager')
    const manager = new WindowManager()

    const setAlwaysOnTop = vi.fn()
    const send = vi.fn()

    ;(
      manager as unknown as {
        bookshelfWindow: {
          setAlwaysOnTop: (value: boolean) => void
          webContents: {
            send: (channel: string, payload: unknown) => void
          }
        }
      }
    ).bookshelfWindow = {
      setAlwaysOnTop,
      webContents: { send },
    }

    const result = manager.setMainWindowAlwaysOnTop(true)

    expect(setAlwaysOnTop).toHaveBeenCalledWith(true)
    expect(configSetSpy).toHaveBeenCalledWith({ alwaysOnTop: true })
    expect(send).toHaveBeenCalledWith(
      'config:changed',
      expect.objectContaining({ alwaysOnTop: true }),
    )
    expect(result).toEqual(expect.objectContaining({ alwaysOnTop: true }))
  })

  it('persists always-on-top even when the window has not been created yet', async () => {
    vi.resetModules()

    let config = { ...DEFAULT_APP_CONFIG, alwaysOnTop: false }
    const configSetSpy = vi.fn((patch: Record<string, unknown>) => {
      config = { ...config, ...patch }
      return structuredClone(config)
    })

    vi.doMock('electron', () => ({
      BrowserWindow: vi.fn(),
    }))
    vi.doMock('../../src/main/store', () => ({
      configStore: {
        get: vi.fn(() => structuredClone(config)),
        set: configSetSpy,
      },
    }))

    const { WindowManager } = await import('../../src/main/window-manager')
    const manager = new WindowManager()

    const result = manager.setMainWindowAlwaysOnTop(true)

    expect(configSetSpy).toHaveBeenCalledWith({ alwaysOnTop: true })
    expect(result).toEqual(expect.objectContaining({ alwaysOnTop: true }))
  })
})
