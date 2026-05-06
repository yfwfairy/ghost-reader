import { describe, expect, it } from 'vitest'
import {
  DEFAULT_APP_CONFIG,
  DEFAULT_WINDOW_SIZE,
  SUPPORTED_BOOK_FORMATS,
  lerpColor,
  resolveTheme,
  THEME_MAP,
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

describe('lerpColor', () => {
  it('returns start color at t=0', () => {
    expect(lerpColor('#000000', '#ffffff', 0)).toBe('#000000')
  })

  it('returns end color at t=1', () => {
    expect(lerpColor('#000000', '#ffffff', 1)).toBe('#ffffff')
  })

  it('returns midpoint at t=0.5', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('interpolates colored values', () => {
    expect(lerpColor('#121212', '#e7e5e4', 0.4)).toBe('#676666')
  })
})

describe('resolveTheme', () => {
  it('returns preset theme from THEME_MAP', () => {
    const result = resolveTheme({ colorTheme: 'obsidian' })
    expect(result).toEqual(THEME_MAP.obsidian)
  })

  it('returns custom theme with provided colors', () => {
    const result = resolveTheme({
      colorTheme: 'custom',
      customThemeBg: '#2b3a2e',
      customThemeText: '#c8d4c0',
    })
    expect(result.bg).toBe('#2b3a2e')
    expect(result.text).toBe('#c8d4c0')
    expect(result.accent).toBe('#6a7868')
  })

  it('falls back to obsidian defaults when custom colors are undefined', () => {
    const result = resolveTheme({ colorTheme: 'custom' })
    expect(result.bg).toBe('#121212')
    expect(result.text).toBe('#e7e5e4')
  })
})
