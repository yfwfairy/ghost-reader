import { useEffect, useEffectEvent, useRef } from 'react'
import ePub from 'epubjs'
import type { ColorTheme, FontFamily, ReadingProgress, TocEntry } from '@shared/types'
import { THEME_MAP } from '@shared/constants'

type EpubRendererProps = {
  bookData: ArrayBuffer
  fontSize: number
  lineHeight: number
  fontFamily: FontFamily
  colorTheme: ColorTheme
  savedCfi?: string
  onProgressUpdate: (patch: Pick<ReadingProgress, 'epubCfi' | 'percentage' | 'updatedAt'>) => void
  onTocLoaded?: (toc: TocEntry[]) => void
}

// 将 epubjs NavItem 映射为 TocEntry
function mapNavItems(items: { id: string; href: string; label: string; subitems?: unknown[] }[]): TocEntry[] {
  return items.map((item) => ({
    id: item.id,
    href: item.href,
    label: item.label.trim(),
    subitems: item.subitems?.length
      ? mapNavItems(item.subitems as { id: string; href: string; label: string; subitems?: unknown[] }[])
      : undefined,
  }))
}

export function EpubRenderer({
  bookData,
  fontSize,
  lineHeight,
  fontFamily,
  colorTheme,
  savedCfi,
  onProgressUpdate,
  onTocLoaded,
}: EpubRendererProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const renditionRef = useRef<ReturnType<ReturnType<typeof ePub>['renderTo']> | null>(null)
  const lastDisplayedCfiRef = useRef<string | undefined>(undefined)
  const fontSizeRef = useRef(fontSize)
  const lineHeightRef = useRef(lineHeight)
  const fontFamilyRef = useRef(fontFamily)
  const colorThemeRef = useRef(colorTheme)
  const handleProgressUpdate = useEffectEvent(onProgressUpdate)
  const handleTocLoaded = useEffectEvent((toc: TocEntry[]) => {
    onTocLoaded?.(toc)
  })

  // 创建 rendition（仅 bookData 变化时重建）
  useEffect(() => {
    if (!mountRef.current) {
      return
    }

    const book = ePub(bookData)
    const rendition = book.renderTo(mountRef.current, {
      width: '100%',
      height: '100%',
      flow: 'scrolled-doc',
      spread: 'none',
    })
    renditionRef.current = rendition

    // 使用 ref 中的最新值设置初始主题
    rendition.themes.default({
      body: {
        'font-family': `${fontFamilyRef.current}, serif`,
        'font-size': `${fontSizeRef.current}px`,
        'line-height': String(lineHeightRef.current),
        background: 'transparent',
        color: THEME_MAP[colorThemeRef.current].text,
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

    // 加载目录
    book.loaded.navigation.then((nav) => {
      handleTocLoaded(mapNavItems(nav.toc))
    })

    return () => {
      renditionRef.current = null
      lastDisplayedCfiRef.current = undefined
      rendition.destroy()
      book.destroy()
    }
  }, [bookData])

  // 主题热更新（不重建 rendition）
  useEffect(() => {
    fontSizeRef.current = fontSize
    lineHeightRef.current = lineHeight
    fontFamilyRef.current = fontFamily
    colorThemeRef.current = colorTheme
    if (!renditionRef.current) {
      return
    }
    renditionRef.current.themes.default({
      body: {
        'font-family': `${fontFamily}, serif`,
        'font-size': `${fontSize}px`,
        'line-height': String(lineHeight),
        background: 'transparent',
        color: THEME_MAP[colorTheme].text,
      },
    })
  }, [fontSize, lineHeight, fontFamily, colorTheme])

  useEffect(() => {
    if (!renditionRef.current || lastDisplayedCfiRef.current === savedCfi) {
      return
    }

    lastDisplayedCfiRef.current = savedCfi
    void renditionRef.current.display(savedCfi)
  }, [savedCfi])

  return <div ref={mountRef} className="epub-renderer" />
}
