import { describe, expect, it, vi } from 'vitest'
import {
  attachReaderBoundsPersistence,
  createOpacityFadeRunner,
  resolvePersistedReaderBounds,
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

  it('preserves free placement unless bounds are near the right edge', () => {
    const freePlacement = resolvePersistedReaderBounds(
      { x: 700, y: 40, width: 360, height: 680 },
      { x: 0, y: 25, width: 1512, height: 957 },
      24,
      24,
    )
    expect(freePlacement).toEqual({ x: 700, y: 40, width: 360, height: 680 })

    const nearRight = resolvePersistedReaderBounds(
      { x: 1130, y: 40, width: 360, height: 680 },
      { x: 0, y: 25, width: 1512, height: 957 },
      24,
      24,
    )
    expect(nearRight.x).toBe(1512 - 360 - 24)
    expect(nearRight.y).toBe(40)
  })

  it('cancels stale opacity animations before a new animation starts', () => {
    const queue = new Map<number, () => void>()
    let nextTimerId = 1
    const scheduler = {
      setTimeout(callback: () => void) {
        const id = nextTimerId
        nextTimerId += 1
        queue.set(id, callback)
        return id
      },
      clearTimeout(id: number) {
        queue.delete(id)
      },
    }

    const applied: number[] = []
    const runner = createOpacityFadeRunner(scheduler)

    runner.start([0.2, 0.3, 0.4], (value) => {
      applied.push(value)
    })
    const staleTimerId = [...queue.keys()][0]

    runner.start([0.8, 0.9], (value) => {
      applied.push(value)
    })

    expect(queue.has(staleTimerId)).toBe(false)

    while (queue.size > 0) {
      const [id, callback] = queue.entries().next().value as [number, () => void]
      queue.delete(id)
      callback()
    }

    expect(applied).toEqual([0.8, 0.9])
  })
})
