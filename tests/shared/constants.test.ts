import { describe, expect, it } from 'vitest'
import { DEFAULT_APP_CONFIG, SUPPORTED_BOOK_FORMATS } from '../../src/shared/constants'

describe('shared constants', () => {
  it('exposes the default reader config', () => {
    expect(DEFAULT_APP_CONFIG.hiddenOpacity).toBe(0.1)
    expect(DEFAULT_APP_CONFIG.readingOpacity).toBe(0.85)
    expect(DEFAULT_APP_CONFIG.fadeDelayMs).toBe(1000)
    expect(DEFAULT_APP_CONFIG.fadeDurationMs).toBe(300)
    expect(DEFAULT_APP_CONFIG.fontSize).toBe(16)
    expect(DEFAULT_APP_CONFIG.lineHeight).toBe(1.8)
    expect(DEFAULT_APP_CONFIG.activationShortcut).toBe('CommandOrControl+Shift+R')
    expect(DEFAULT_APP_CONFIG.currentBookId).toBeNull()
  })

  it('only allows txt and epub imports', () => {
    expect(SUPPORTED_BOOK_FORMATS).toEqual(['.txt', '.epub'])
  })
})
