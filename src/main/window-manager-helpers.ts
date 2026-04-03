import { join } from 'node:path'
import { snapToRightEdge } from './window-geometry'

type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

type WindowLoadTarget =
  | {
      type: 'url'
      url: string
    }
  | {
      type: 'file'
      filePath: string
      options?: {
        query?: Record<string, string>
      }
    }

function getRendererEntryFile(mainDirname: string) {
  return join(mainDirname, '../renderer/index.html')
}

export function resolveBookshelfWindowLoad(mainDirname: string, devServerUrl?: string): WindowLoadTarget {
  if (devServerUrl) {
    return { type: 'url', url: devServerUrl }
  }

  return {
    type: 'file',
    filePath: getRendererEntryFile(mainDirname),
    options: undefined,
  }
}

export function resolvePersistedReaderBounds(
  bounds: Bounds,
  workArea: Bounds,
  gutter = 24,
  snapThreshold = gutter,
) {
  const rightGap = workArea.x + workArea.width - (bounds.x + bounds.width)
  if (rightGap <= snapThreshold) {
    return snapToRightEdge(bounds, workArea, gutter)
  }

  return bounds
}

type WindowEventTarget = {
  on(event: 'move' | 'resize' | 'close', listener: () => void): void
}

export function attachReaderBoundsPersistence(window: WindowEventTarget, persist: () => void) {
  window.on('move', persist)
  window.on('resize', persist)
  window.on('close', persist)
}

type Scheduler = {
  setTimeout: (callback: () => void, delay: number) => number | NodeJS.Timeout
  clearTimeout: (id: number | NodeJS.Timeout) => void
}

export function createOpacityFadeRunner(scheduler: Scheduler, delayMs = 15) {
  let timerId: number | NodeJS.Timeout | null = null
  let runId = 0

  const stop = () => {
    runId += 1
    if (!timerId) return
    scheduler.clearTimeout(timerId)
    timerId = null
  }

  return {
    start(frames: number[], apply: (value: number) => void) {
      stop()
      const activeRunId = runId
      let index = 0

      const scheduleNext = () => {
        timerId = scheduler.setTimeout(() => {
          if (activeRunId !== runId) return
          const frame = frames[index]
          if (frame === undefined) {
            timerId = null
            return
          }

          apply(frame)
          index += 1
          if (index >= frames.length) {
            timerId = null
            return
          }

          scheduleNext()
        }, delayMs)
      }

      scheduleNext()
    },
    stop,
  }
}
