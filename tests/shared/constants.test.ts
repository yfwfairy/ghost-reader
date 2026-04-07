import { describe, expect, it } from 'vitest'
import {
  DEFAULT_APP_CONFIG,
  DEFAULT_WINDOW_SIZE,
  SUPPORTED_BOOK_FORMATS,
} from '../../src/shared/constants'

describe('shared constants', () => {
  it('exposes the default reader config', () => {
    expect(DEFAULT_APP_CONFIG.fontSize).toBe(16)
    expect(DEFAULT_APP_CONFIG.lineHeight).toBe(1.8)
    expect(DEFAULT_APP_CONFIG.alwaysOnTop).toBe(false)
    expect(DEFAULT_APP_CONFIG.currentBookId).toBeNull()
    expect(DEFAULT_APP_CONFIG).not.toHaveProperty('hiddenOpacity')
    expect(DEFAULT_APP_CONFIG).not.toHaveProperty('readingOpacity')
    expect(DEFAULT_APP_CONFIG).not.toHaveProperty('fadeDelayMs')
    expect(DEFAULT_APP_CONFIG).not.toHaveProperty('fadeDurationMs')
    expect(DEFAULT_APP_CONFIG).not.toHaveProperty('activationShortcut')
  })

  it('only allows txt and epub imports', () => {
    expect(SUPPORTED_BOOK_FORMATS).toEqual(['.txt', '.epub'])
  })

  it('exposes default window dimensions', () => {
    expect(DEFAULT_WINDOW_SIZE.width).toBe(1100)
    expect(DEFAULT_WINDOW_SIZE.height).toBe(800)
  })
})
