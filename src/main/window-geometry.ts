export function snapToRightEdge(
  bounds: { x: number; y: number; width: number; height: number },
  workArea: { x: number; y: number; width: number; height: number },
  gutter = 24,
) {
  const snappedY = Math.max(bounds.y, workArea.y)
  return {
    ...bounds,
    x: workArea.x + workArea.width - bounds.width - gutter,
    y: snappedY,
  }
}

export function buildOpacityFrames(from: number, to: number, steps: number) {
  const frames: number[] = []
  for (let index = 1; index <= steps; index += 1) {
    const value = from + ((to - from) * index) / steps
    frames.push(Number(value.toFixed(3)))
  }
  return frames
}
