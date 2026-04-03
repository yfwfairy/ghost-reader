import { describe, expect, it } from 'vitest'
import { DEFAULT_APP_CONFIG, SUPPORTED_BOOK_FORMATS } from '../../src/shared/constants'

describe('shared constants', () => {
  it('exposes the default reader config', () => {
    expect(DEFAULT_APP_CONFIG.hiddenOpacity).toBe(0.1)
    expect(DEFAULT_APP_CONFIG.readingOpacity).toBe(0.85)
  })

  it('only allows txt and epub imports', () => {
    expect(SUPPORTED_BOOK_FORMATS).toEqual(['.txt', '.epub'])
  })
})
