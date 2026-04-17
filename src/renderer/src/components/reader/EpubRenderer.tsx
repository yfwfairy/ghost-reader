import { useEffect, useEffectEvent, useRef, useState } from 'react'
import ePub from 'epubjs'
import type { ColorTheme, FontFamily, ReadingProgress, TocEntry } from '@shared/types'
import { THEME_MAP } from '@shared/constants'
import { useTranslation } from '../../hooks/useTranslation'

// 字体 CDN 样式表，需注入到 EPUB iframe 中以使 @font-face 可用
const FONT_STYLESHEETS = [
  'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Manrope:wght@200;400;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=Noto+Serif+SC:wght@300;400;500;600;700&family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css',
  'https://chinese-fonts-cdn.deno.dev/packages/stdgt/dist/%E4%B8%8A%E5%9B%BE%E4%B8%9C%E8%A7%82%E4%BD%93-%E7%BB%86%E4%BD%93/result.css',
  'https://chinese-fonts-cdn.deno.dev/packages/yozai/dist/Yozai-Regular/result.css',
  'https://chinese-fonts-cdn.deno.dev/packages/GuanKiapTsingKhai/dist/GuanKiapTsingKhai-W/result.css',
  'https://chinese-fonts-cdn.deno.dev/packages/moon-stars-kai/dist/MoonStarsKaiTHW-Regular/result.css',
  'https://cdn.jsdelivr.net/npm/lxgw-wenkai-tc-webfont@1.7.0/style.css',
]

type EpubRendererProps = {
  bookData: ArrayBuffer
  fontSize: number
  lineHeight: number
  fontFamily: FontFamily
  colorTheme: ColorTheme
  savedCfi?: string
  displayRef?: React.RefObject<((href: string, scrollPct?: number) => void) | null>
  chapterNavRef?: React.RefObject<{ prev: () => void; next: () => void } | null>
  onProgressUpdate: (patch: Pick<ReadingProgress, 'epubCfi' | 'percentage' | 'updatedAt'>) => void
  onChapterScroll?: (chapterHref: string, percent: number) => void
  onTocLoaded?: (toc: TocEntry[]) => void
  onSpineReady?: (spineHrefs: string[]) => void
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
  displayRef,
  chapterNavRef,
  onProgressUpdate,
  onChapterScroll,
  onTocLoaded,
  onSpineReady,
}: EpubRendererProps) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const renditionRef = useRef<ReturnType<ReturnType<typeof ePub>['renderTo']> | null>(null)
  const lastDisplayedCfiRef = useRef<string | undefined>(undefined)
  const latestSavedCfiRef = useRef(savedCfi)
  const fontSizeRef = useRef(fontSize)
  const lineHeightRef = useRef(lineHeight)
  const fontFamilyRef = useRef(fontFamily)
  const colorThemeRef = useRef(colorTheme)
  const currentChapterRef = useRef({ href: '', index: 0 })
  // 标记是否正在进行 displayRef 触发的导航，期间 savedCfi effect 不应介入
  const navigatingViaDisplayRef = useRef(false)
  const [hasPrev, setHasPrev] = useState(false)
  const [hasNext, setHasNext] = useState(false)
  const [chapterPercent, setChapterPercent] = useState(0)
  const chapterRenderedRef = useRef(false)
  const { t } = useTranslation()
  const handleProgressUpdate = useEffectEvent(onProgressUpdate)
  const handleChapterScroll = useEffectEvent((href: string, pct: number) => {
    onChapterScroll?.(href, pct)
  })
  const handleTocLoaded = useEffectEvent((toc: TocEntry[]) => {
    onTocLoaded?.(toc)
  })
  const handleSpineReady = useEffectEvent((spineHrefs: string[]) => {
    onSpineReady?.(spineHrefs)
  })
  const bindDisplayRef = useEffectEvent((handler: ((href: string, scrollPct?: number) => void) | null) => {
    if (displayRef) {
      displayRef.current = handler
    }
  })
  const bindChapterNavRef = useEffectEvent((nav: { prev: () => void; next: () => void } | null) => {
    if (chapterNavRef) {
      chapterNavRef.current = nav
    }
  })

  useEffect(() => {
    latestSavedCfiRef.current = savedCfi
  }, [savedCfi])

  // 计算章节内滚动进度
  function computeScrollPercent(el: HTMLElement, rendered: boolean) {
    const { scrollTop, scrollHeight, clientHeight } = el
    const maxScroll = scrollHeight - clientHeight
    // 内容未渲染完成时 scrollHeight === clientHeight，返回 0 而非 100
    if (maxScroll <= 0) return rendered ? 100 : 0
    return Math.min(100, Math.round((scrollTop / maxScroll) * 100))
  }

  // 创建 rendition（仅 bookData 变化时重建）
  useEffect(() => {
    if (!mountRef.current) {
      return
    }

    let cancelled = false
    const mount = mountRef.current
    const book = ePub(bookData)
    const rendition = book.renderTo(mount, {
      width: '100%',
      height: '100%',
      flow: 'scrolled-doc',
      spread: 'none',
    })
    renditionRef.current = rendition

    // 记录目录跳转时的目标滚动百分比
    const pendingScrollPct = { value: null as number | null }
    // 标记是否为 fragment 跳转（如点击子目录），此时不应强制 scrollTop=0
    const pendingFragmentNav = { value: false }

    // 暴露导航方法给外部
    bindDisplayRef((href: string, scrollPct?: number) => {
      pendingScrollPct.value = scrollPct ?? null
      pendingFragmentNav.value = href.includes('#') && scrollPct == null
      // 标记正在进行外部导航，阻止 savedCfi effect 竞争
      navigatingViaDisplayRef.current = true
      // 同章节内 fragment 跳转不需要标记未渲染（内容不会卸载重载），
      // 否则 onScroll 会被永久跳过导致进度卡住
      const targetBase = href.split('#')[0]
      const currentBase = currentChapterRef.current.href.split('#')[0]
      if (targetBase !== currentBase) {
        chapterRenderedRef.current = false
      }
      void rendition.display(href)
    })

    // 暴露章节前进/后退给外部（键盘快捷键）
    bindChapterNavRef({
      prev: () => {
        chapterRenderedRef.current = false
        void rendition.prev()
      },
      next: () => {
        chapterRenderedRef.current = false
        void rendition.next()
      },
    })

    // 将 iframe 内的键盘事件转发到父文档，使全局快捷键在 EPUB 阅读时也能生效
    rendition.on('keydown', (e: KeyboardEvent) => {
      document.dispatchEvent(new KeyboardEvent('keydown', {
        key: e.key,
        code: e.code,
        metaKey: e.metaKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        bubbles: true,
      }))
    })

    // 注入字体样式表到 EPUB iframe，使中文 @font-face 在 iframe 内可用
    const hooks = rendition.hooks as unknown as {
      content: { register: (fn: (contents: { document: Document }) => void) => void }
    }
    hooks.content.register((contents) => {
      const doc = contents.document
      FONT_STYLESHEETS.forEach((url) => {
        const link = doc.createElement('link')
        link.rel = 'stylesheet'
        link.href = url
        doc.head.appendChild(link)
      })
    })

    // 使用 ref 中的最新值设置初始主题
    rendition.themes.default({
      body: {
        'font-family': `'${fontFamilyRef.current}', serif !important`,
        'font-size': `${fontSizeRef.current}px`,
        'line-height': String(lineHeightRef.current),
        background: 'transparent',
        color: THEME_MAP[colorThemeRef.current].text,
      },
    })

    lastDisplayedCfiRef.current = latestSavedCfiRef.current
    void rendition.display(latestSavedCfiRef.current)

    // 生成位置索引以获取精确的全书进度百分比
    // （epubjs 的 location.start.percentage 依赖此步骤，否则永远返回 0）
    book.ready
      .then(() => {
        // 收集 spine hrefs 用于加权全书进度计算
        const spine = book.spine as unknown as { each: (fn: (item: { href: string }) => void) => void }
        const hrefs: string[] = []
        spine.each((item) => hrefs.push(item.href))
        handleSpineReady(hrefs)

        return (book.locations as unknown as { generate: (chars: number) => Promise<string[]> }).generate(1600)
      })
      .then(() => {
        if (cancelled) return
          // 重新上报当前位置，此时 percentage 基于精确的 locations
          ; (rendition as unknown as { reportLocation: () => void }).reportLocation()
      })
      .catch(() => { /* 忽略 locations 生成失败 */ })

    // epubjs 异步在 mount 内创建 .epub-container 作为真正的滚动容器
    // 需要在 relocated 中延迟查找并绑定
    const scrollState = { el: null as HTMLElement | null }
    let rafId = 0
    let scrollRafId = 0

    // 滚动事件处理（rAF 节流）
    // 章节过渡期间（chapterRenderedRef === false）完全跳过，
    // 防止旧内容卸载导致 scrollTop/maxScroll 比值虚高覆盖真实进度
    function onScroll() {
      cancelAnimationFrame(scrollRafId)
      scrollRafId = requestAnimationFrame(() => {
        const el = scrollState.el
        if (!el || !chapterRenderedRef.current) return
        const pct = computeScrollPercent(el, true)
        setChapterPercent(pct)
        if (currentChapterRef.current.href) {
          handleChapterScroll(currentChapterRef.current.href, pct)
        }
      })
    }

    // 章节变更 + 进度上报
    let lastRelocatedIdx = -1
    rendition.on('relocated', (location: { start: { cfi: string; percentage: number; index: number } }) => {
      // 同步 lastDisplayedCfi，防止 savedCfi useEffect 将自身上报的 CFI 再次 display 形成反馈循环
      lastDisplayedCfiRef.current = location.start.cfi

      // 延迟查找 .epub-container（epubjs 异步创建，首次 relocated 时已在 DOM 中）
      if (!scrollState.el) {
        const container = mount.querySelector('.epub-container') as HTMLElement | null
        if (container) {
          scrollState.el = container
          container.addEventListener('scroll', onScroll, { passive: true })
        }
      }

      const spineLength = (book.spine as unknown as { length: number }).length
      const idx = location.start.index
      currentChapterRef.current = {
        href: (book.spine as unknown as { get: (i: number) => { href: string } | undefined }).get(idx)?.href ?? '',
        index: idx,
      }
      setHasPrev(idx > 0)
      setHasNext(idx < spineLength - 1)

      // 上报全书进度（locations 就绪前用 spine 粗略估算）
      const locPct = location.start.percentage
      const globalPct = locPct > 0
        ? Math.round(locPct * 100)
        : Math.round((idx / Math.max(1, spineLength)) * 100)

      handleProgressUpdate({
        epubCfi: location.start.cfi,
        percentage: globalPct,
        updatedAt: Date.now(),
      })

      // 仅在章节真正切换时重置进度并轮询布局完成
      // scrolled-doc 模式下 relocated 在同章节滚动时也会频繁触发，
      // 若每次都 setChapterPercent(0) 会导致 React 反复重渲染引起页面抖动
      const chapterChanged = idx !== lastRelocatedIdx
      lastRelocatedIdx = idx

      if (chapterChanged) {
        chapterRenderedRef.current = false
        setChapterPercent(0)

        // 取出并清空待恢复的滚动位置（仅目录跳转时有值）
        const targetScrollPct = pendingScrollPct.value
        pendingScrollPct.value = null
        const isFragmentNav = pendingFragmentNav.value
        pendingFragmentNav.value = false

        const target = scrollState.el
        if (!target) return

        cancelAnimationFrame(rafId)
        const start = performance.now()
        function poll() {
          const maxScroll = target!.scrollHeight - target!.clientHeight
          if (maxScroll > 0 || performance.now() - start > 2000) {
            chapterRenderedRef.current = true
            // 目录跳转时恢复到上次阅读位置，上/下一章从开头开始
            // fragment 跳转（子目录）时让 epubjs 自行定位锚点，不强制归零
            if (targetScrollPct != null && targetScrollPct > 0 && maxScroll > 0) {
              target!.scrollTop = Math.round((targetScrollPct / 100) * maxScroll)
            } else if (!isFragmentNav) {
              target!.scrollTop = 0
            }
            const pct = computeScrollPercent(target!, true)
            setChapterPercent(pct)
            if (currentChapterRef.current.href) {
              handleChapterScroll(currentChapterRef.current.href, pct)
            }
            return
          }
          rafId = requestAnimationFrame(poll)
        }
        rafId = requestAnimationFrame(poll)
      } else if (!chapterRenderedRef.current) {
        // 同章节内 fragment 跳转（如点击子目录）：
        // displayRef 调用时已将 chapterRenderedRef 设为 false，
        // 但 chapterChanged 为 false 不会进入上方分支恢复它，
        // 导致 onScroll 被永久跳过、进度卡住。此处恢复。
        chapterRenderedRef.current = true
        const target = scrollState.el
        if (target) {
          const pct = computeScrollPercent(target, true)
          setChapterPercent(pct)
          if (currentChapterRef.current.href) {
            handleChapterScroll(currentChapterRef.current.href, pct)
          }
        }
      }
    })

    // 加载目录
    book.loaded.navigation.then((nav) => {
      handleTocLoaded(mapNavItems(nav.toc))
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      cancelAnimationFrame(scrollRafId)
      if (scrollState.el) scrollState.el.removeEventListener('scroll', onScroll)
      renditionRef.current = null
      lastDisplayedCfiRef.current = undefined
      currentChapterRef.current = { href: '', index: 0 }
      bindDisplayRef(null)
      bindChapterNavRef(null)
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
        'font-family': `'${fontFamily}', serif !important`,
        'font-size': `${fontSize}px`,
        'line-height': String(lineHeight),
        background: 'transparent',
        color: THEME_MAP[colorTheme].text,
      },
    })
  }, [fontSize, lineHeight, fontFamily, colorTheme])

  useEffect(() => {
    // displayRef 导航期间不响应 savedCfi 变化，避免竞争覆盖 fragment 定位
    if (navigatingViaDisplayRef.current) {
      navigatingViaDisplayRef.current = false
      lastDisplayedCfiRef.current = savedCfi
      return
    }
    if (!renditionRef.current || lastDisplayedCfiRef.current === savedCfi) {
      return
    }

    lastDisplayedCfiRef.current = savedCfi
    void renditionRef.current.display(savedCfi)
  }, [savedCfi])

  const showNav = chapterPercent >= 85

  return (
    <div className="epub-renderer">
      <div ref={mountRef} className="epub-renderer__view" />
      <div className={`epub-chapter-nav ${showNav ? 'epub-chapter-nav--visible' : ''}`}>
        {hasPrev && (
          <button
            type="button"
            className="epub-chapter-nav__btn"
            onClick={() => {
              chapterRenderedRef.current = false
              void renditionRef.current?.prev()
            }}
          >
            {t('reader.prevChapter')}
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            className="epub-chapter-nav__btn"
            onClick={() => {
              chapterRenderedRef.current = false
              void renditionRef.current?.next()
            }}
          >
            {t('reader.nextChapter')}
          </button>
        )}
      </div>
    </div>
  )
}
