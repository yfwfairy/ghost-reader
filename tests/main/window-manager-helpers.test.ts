import { describe, expect, it } from 'vitest'
import * as windowManagerHelpers from '../../src/main/window-manager-helpers'
import { resolveBookshelfWindowLoad } from '../../src/main/window-manager-helpers'

describe('window manager helpers', () => {
  it('loads the renderer without reader mode query in production', () => {
    const target = resolveBookshelfWindowLoad('/tmp/out/main', undefined)
    expect(target).toEqual({
      type: 'file',
      filePath: '/tmp/out/renderer/index.html',
      options: undefined,
    })
  })

  it('no longer exposes reader-window load targeting', () => {
    expect('resolveReaderWindowLoad' in windowManagerHelpers).toBe(false)
  })
})
