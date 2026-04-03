import { describe, expect, it } from 'vitest'
import { buildOpacityFrames, snapToRightEdge } from '../../src/main/window-geometry'

describe('window geometry helpers', () => {
  it('snaps the reader to the right edge when close enough', () => {
    const next = snapToRightEdge(
      { x: 1300, y: 40, width: 360, height: 680 },
      { x: 0, y: 25, width: 1512, height: 957 },
      24,
    )

    expect(next.x).toBe(1512 - 360 - 24)
    expect(next.y).toBe(40)
  })

  it('creates a stable opacity tween including the final value', () => {
    const frames = buildOpacityFrames(0.1, 0.85, 5)
    expect(frames[0]).toBeCloseTo(0.25, 2)
    expect(frames.at(-1)).toBe(0.85)
  })
})
