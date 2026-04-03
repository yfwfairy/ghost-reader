import { join } from 'node:path'

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

export function resolveReaderWindowLoad(mainDirname: string, devServerUrl?: string): WindowLoadTarget {
  if (devServerUrl) {
    const url = new URL(devServerUrl)
    url.searchParams.set('mode', 'reader')
    return { type: 'url', url: url.toString() }
  }

  return {
    type: 'file',
    filePath: getRendererEntryFile(mainDirname),
    options: {
      query: {
        mode: 'reader',
      },
    },
  }
}

type WindowEventTarget = {
  on(event: 'move' | 'resize' | 'close', listener: () => void): void
}

export function attachReaderBoundsPersistence(window: WindowEventTarget, persist: () => void) {
  window.on('move', persist)
  window.on('resize', persist)
  window.on('close', persist)
}
