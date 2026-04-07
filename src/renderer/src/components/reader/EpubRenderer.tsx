import { useEffect, useEffectEvent, useRef } from 'react'
import ePub from 'epubjs'
import type { ReadingProgress } from '@shared/types'

type EpubRendererProps = {
  filePath: string
  fontSize: number
  lineHeight: number
  savedCfi?: string
  onProgressUpdate: (patch: Pick<ReadingProgress, 'epubCfi' | 'percentage' | 'updatedAt'>) => void
}

export function EpubRenderer({
  filePath,
  fontSize,
  lineHeight,
  savedCfi,
  onProgressUpdate,
}: EpubRendererProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const renditionRef = useRef<ReturnType<ReturnType<typeof ePub>['renderTo']> | null>(null)
  const lastDisplayedCfiRef = useRef<string | undefined>(undefined)
  const handleProgressUpdate = useEffectEvent(onProgressUpdate)

  useEffect(() => {
    if (!mountRef.current) {
      return
    }

    const source = filePath.startsWith('file://') ? filePath : encodeURI(`file://${filePath}`)
    const book = ePub(source)
    const rendition = book.renderTo(mountRef.current, {
      width: '100%',
      height: '100%',
      flow: 'scrolled-doc',
      spread: 'none',
    })
    renditionRef.current = rendition

    rendition.themes.default({
      body: {
        'font-size': `${fontSize}px`,
        'line-height': String(lineHeight),
        background: 'transparent',
        color: '#f5f5f5',
      },
    })

    lastDisplayedCfiRef.current = savedCfi
    void rendition.display(savedCfi)
    rendition.on('relocated', (location: { start: { cfi: string; percentage: number } }) => {
      handleProgressUpdate({
        epubCfi: location.start.cfi,
        percentage: Math.round(location.start.percentage * 100),
        updatedAt: Date.now(),
      })
    })

    return () => {
      renditionRef.current = null
      lastDisplayedCfiRef.current = undefined
      rendition.destroy()
      book.destroy()
    }
  }, [filePath, fontSize, lineHeight])

  useEffect(() => {
    if (!renditionRef.current || lastDisplayedCfiRef.current === savedCfi) {
      return
    }

    lastDisplayedCfiRef.current = savedCfi
    void renditionRef.current.display(savedCfi)
  }, [savedCfi])

  return <div ref={mountRef} className="epub-renderer" />
}
