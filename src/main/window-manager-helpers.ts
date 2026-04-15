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
