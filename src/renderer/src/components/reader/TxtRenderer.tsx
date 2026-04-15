import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { ColorTheme, FontFamily, ReadingProgress } from '@shared/types'
import { THEME_MAP } from '@shared/constants'

type TxtRendererProps = {
  content: string
  config: {
    fontSize: number
    lineHeight: number
    fontFamily: FontFamily
    colorTheme: ColorTheme
  }
  savedProgress?: ReadingProgress | null
  scrollRef?: React.RefObject<HTMLDivElement | null>
  onProgressUpdate: (patch: Pick<ReadingProgress, 'txtScrollTop' | 'percentage' | 'updatedAt'>) => void
}

export function TxtRenderer({ content, config, savedProgress, scrollRef, onProgressUpdate }: TxtRendererProps) {
  const paragraphs = useMemo(() => content.split(/\n\s*\n/).filter(Boolean), [content])
  const containerRef = useRef<HTMLDivElement | null>(null)

  // 合并内部 containerRef 和外部 scrollRef
  const setRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node
    if (scrollRef) scrollRef.current = node
  }, [scrollRef])

  useEffect(() => {
    if (!containerRef.current || typeof savedProgress?.txtScrollTop !== 'number') {
      return
    }

    containerRef.current.scrollTop = savedProgress.txtScrollTop
  }, [savedProgress])

  return (
    <div
      ref={setRef}
      data-testid="txt-renderer"
      className="txt-renderer"
      onScroll={(event) => {
        const target = event.currentTarget
        const denominator = Math.max(1, target.scrollHeight - target.clientHeight)
        const percentage = Math.round((target.scrollTop / denominator) * 100)
        onProgressUpdate({
          txtScrollTop: target.scrollTop,
          percentage,
          updatedAt: Date.now(),
        })
      }}
      style={{
        fontSize: `${config.fontSize}px`,
        lineHeight: config.lineHeight,
        fontFamily: `${config.fontFamily}, serif`,
        color: THEME_MAP[config.colorTheme].text,
      }}
    >
      {paragraphs.map((paragraph, index) => (
        <p key={`${index}-${paragraph.slice(0, 16)}`}>{paragraph}</p>
      ))}
    </div>
  )
}
