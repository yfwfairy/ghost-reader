import { describe, expect, it, vi } from 'vitest'
import {
  attachReaderBoundsPersistence,
  resolveBookshelfWindowLoad,
  resolveReaderWindowLoad,
} from '../../src/main/window-manager-helpers'

describe('window manager helpers', () => {
  it('resolves bookshelf load target for dev and production', () => {
    const devTarget = resolveBookshelfWindowLoad('/tmp/out/main', 'http://localhost:5173/')
    expect(devTarget).toEqual({ type: 'url', url: 'http://localhost:5173/' })

    const prodTarget = resolveBookshelfWindowLoad('/tmp/out/main', undefined)
    expect(prodTarget).toEqual({
      type: 'file',
      filePath: '/tmp/out/renderer/index.html',
      options: undefined,
    })
  })

  it('resolves reader load target and preserves mode in dev and production', () => {
    const devTarget = resolveReaderWindowLoad(
      '/tmp/out/main',
      'http://localhost:5173/?feature=enabled',
    )
    expect(devTarget).toEqual({
      type: 'url',
      url: 'http://localhost:5173/?feature=enabled&mode=reader',
    })

    const prodTarget = resolveReaderWindowLoad('/tmp/out/main', undefined)
    expect(prodTarget).toEqual({
      type: 'file',
      filePath: '/tmp/out/renderer/index.html',
      options: { query: { mode: 'reader' } },
    })
  })

  it('attaches persistence to move, resize, and close window events', () => {
    const handlers: Record<string, Array<() => void>> = {}
    const windowLike = {
      on(event: string, callback: () => void) {
        handlers[event] ??= []
        handlers[event].push(callback)
      },
    }

    const persist = vi.fn()
    attachReaderBoundsPersistence(windowLike, persist)

    handlers.move?.[0]?.()
    handlers.resize?.[0]?.()
    handlers.close?.[0]?.()

    expect(persist).toHaveBeenCalledTimes(3)
  })
})
