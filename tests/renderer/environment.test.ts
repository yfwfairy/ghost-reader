import { describe, expect, it } from 'vitest'

describe('renderer test environment', () => {
  it('provides a browser-like document', () => {
    expect(document).toBeDefined()
    expect(document.createElement).toBeTypeOf('function')
  })
})
