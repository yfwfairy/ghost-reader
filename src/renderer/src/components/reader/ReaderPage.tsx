import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import type { BookRecord, ReadingProgress, TocEntry } from '@shared/types'
import { resolveTheme, hexToRgbTriplet } from '@shared/constants'
import { useConfig } from '../../hooks/useConfig'
import { useTranslation } from '../../hooks/useTranslation'
import { useAutoScroll } from '../../hooks/useAutoScroll'
import { loadFont } from '../../utils/font-loader'
import staticTexture from '../../assets/static-texture.png'
import { NOISE_MAP } from '../../assets/noise'
import { ReaderLayout } from './ReaderLayout'
import { MoreMenu } from './MoreMenu'

const EpubRenderer = lazy(() => import('./EpubRenderer').then(m => ({ default: m.EpubRenderer })))
const TxtRenderer = lazy(() => import('./TxtRenderer').then(m => ({ default: m.TxtRenderer })))
const ReaderGuide = lazy(() => import('./ReaderGuide').then(m => ({ default: m.ReaderGuide })))
const UsageGuidePanel = lazy(() => import('./UsageGuidePanel').then(m => ({ default: m.UsageGuidePanel })))

export type ReaderActions = {
  scrollLine: (direction: 'up' | 'down') => void
  chapterPrev: () => void
  chapterNext: () => void
  toggleAutoScroll?: () => void
  autoScrollEnabled?: boolean
}

type ReaderPageProps = {
  backRef?: React.RefObject<(() => void | Promise<void>) | null>
  readerActionsRef?: React.RefObject<ReaderActions | null>
  onBack: () => void
  onTitleChange?: (title: string) => void
  immersive?: boolean
  onExitImmersive?: () => void
}

export function ReaderPage({ backRef, readerActionsRef, onBack, onTitleChange, immersive = false, onExitImmersive }: ReaderPageProps) {
  const { config, fallbackConfig, loading, updateConfig } = useConfig()
  const { t } = useTranslation()
  const [book, setBook] = useState<BookRecord | null>(null)
  const [progress, setProgress] = useState<ReadingProgress | null>(null)
  const [txtContent, setTxtContent] = useState('')
  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null)
  const [bookLoading, setBookLoading] = useState(true)
  const [bookError, setBookError] = useState(false)
  const [toc, setToc] = useState<TocEntry[]>([])
  const [_isNavigatingBack, setIsNavigatingBack] = useState(false)
  const saveTimer = useRef<number | ReturnType<typeof setTimeout> | null>(null)
  const pendingTxtProgress = useRef<ReadingProgress | null>(null)
  const lastProgressUpdateRef = useRef<number>(0)
  const mountedRef = useRef(true)
  const backNavigationRef = useRef<Promise<void> | null>(null)
  const epubDisplayRef = useRef<((href: string, scrollPct?: number) => void) | null>(null)
  const epubChapterNavRef = useRef<{ prev: () => void; next: () => void } | null>(null)
  const txtScrollRef = useRef<HTMLDivElement | null>(null)
  const epubScrollRef = useRef<HTMLElement | null>(null)
  const chapterProgressRef = useRef<Record<string, number>>({})
  const spineHrefsRef = useRef<string[]>([])
  const [currentChapterPercent, setCurrentChapterPercent] = useState<number | null>(null)
  const [currentChapterHref, setCurrentChapterHref] = useState<string | null>(null)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false)
  const [autoScrollSpeed, setAutoScrollSpeed] = useState(3)
  const [autoScrollPauseOnHover, setAutoScrollPauseOnHover] = useState(false)
  const [showUsageGuide, setShowUsageGuide] = useState(false)
  const activeConfig = config ?? fallbackConfig

  // epub 格式加载完成后，找到滚动容器并存入 ref
  useEffect(() => {
    if (book?.format === 'epub' && !bookLoading) {
      // 延迟一点以确保 epub-container 已渲染
      const timer = setTimeout(() => {
        epubScrollRef.current = document.querySelector('.epub-container') as HTMLElement | null
      }, 100)
      return () => clearTimeout(timer)
    } else {
      epubScrollRef.current = null
    }
  }, [book?.format, bookLoading])

  // 自动播放 hook
  const { paused: autoScrollPaused, toggle: toggleAutoScroll } = useAutoScroll({
    enabled: autoScrollEnabled,
    speed: autoScrollSpeed,
    pauseOnHover: autoScrollPauseOnHover,
    scrollRef: book?.format === 'txt' ? txtScrollRef : epubScrollRef,
    onChapterEnd: () => {
      if (book?.format === 'txt') {
        setAutoScrollEnabled(false)
      } else {
        // EPUB：检查是否已到最后一章
        const spineHrefs = spineHrefsRef.current
        const currentHref = currentChapterHref?.split('#')[0] ?? ''
        const isLastChapter = spineHrefs.length > 0 && spineHrefs[spineHrefs.length - 1] === currentHref
        if (isLastChapter) {
          setAutoScrollEnabled(false)
        } else {
          epubChapterNavRef.current?.next()
        }
      }
    },
  })

  // 从已保存的进度中恢复章节进度 map
  useEffect(() => {
    chapterProgressRef.current = progress?.chapterProgress ? { ...progress.chapterProgress } : {}
  }, [progress])

  const handleChapterScroll = useCallback((chapterHref: string, percent: number) => {
    setCurrentChapterPercent(percent)
    // 仅当 spine href 发生变化时更新 currentChapterHref，
    // 保留用户点击子目录时设置的精确 fragment href
    setCurrentChapterHref((prev) => {
      if (prev && prev.split('#')[0] === chapterHref.split('#')[0]) return prev
      return chapterHref
    })
    const prev = chapterProgressRef.current[chapterHref] ?? 0
    if (percent > prev) {
      chapterProgressRef.current = { ...chapterProgressRef.current, [chapterHref]: percent }
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.appMode = 'reader'
    document.body.dataset.appMode = 'reader'

    return () => {
      mountedRef.current = false
      delete document.documentElement.dataset.appMode
      delete document.body.dataset.appMode
      delete document.documentElement.dataset.colorTheme
      void window.api.setWindowOpacity(1)
    }
  }, [])

  // 进入阅读器时应用已保存的窗口透明度
  useEffect(() => {
    const opacity = activeConfig.opacity ?? 100
    if (opacity < 100) {
      void window.api.setWindowOpacity(opacity / 100)
    }
  }, [activeConfig.opacity])

  // 进入阅读器时按需加载当前阅读字体
  useEffect(() => {
    loadFont(activeConfig.fontFamily)
  }, [activeConfig.fontFamily])

  // 同步 colorTheme 到 CSS 变量和 HTML 属性
  const themeColors = resolveTheme(activeConfig)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.colorTheme = activeConfig.colorTheme
    root.style.setProperty('--theme-bg', hexToRgbTriplet(themeColors.bg))
    root.style.setProperty('--theme-text', hexToRgbTriplet(themeColors.text))
    root.style.setProperty('--theme-accent', hexToRgbTriplet(themeColors.accent))
    root.style.setProperty('--reader-h-margin', `${activeConfig.pageMargin}px`)
  }, [activeConfig.colorTheme, activeConfig.customThemeBg, activeConfig.customThemeText, activeConfig.pageMargin, themeColors])

  useEffect(() => {
    if (loading) {
      setBookLoading(true)
      setBookError(false)
      setBook(null)
      setProgress(null)
      setTxtContent('')
      setEpubData(null)
      return
    }

    if (!config?.currentBookId) {
      setBookLoading(false)
      setBookError(false)
      setBook(null)
      setProgress(null)
      setTxtContent('')
      setEpubData(null)
      return
    }

    let cancelled = false
    setBookLoading(true)
    setBookError(false)

    async function loadCurrentBook() {
      try {
        const books = await window.api.getAllBooks()
        const currentBook = books.find((candidate) => candidate.id === config?.currentBookId) ?? null

        if (cancelled) {
          return
        }

        setBook(currentBook)

        if (!currentBook) {
          setProgress(null)
          setTxtContent('')
          setEpubData(null)
          setBookLoading(false)
          return
        }

        const nextProgress = await window.api.getProgress(currentBook.id)
        if (cancelled) {
          return
        }

        setProgress(nextProgress)

        if (currentBook.format === 'txt') {
          const content = await window.api.readTxtFile(currentBook.filePath)
          if (!cancelled) {
            setTxtContent(content)
            setEpubData(null)
            setBookLoading(false)
          }
        } else {
          const data = await window.api.readEpubFile(currentBook.filePath)
          if (!cancelled) {
            setEpubData(data)
            setTxtContent('')
            setBookLoading(false)
          }
        }
      } catch (err) {
        console.error('Failed to load book:', err)
        if (!cancelled) {
          setBookError(true)
          setBookLoading(false)
        }
      }
    }

    void loadCurrentBook()

    return () => {
      cancelled = true
    }
  }, [config?.currentBookId, loading])

  useEffect(() => {
    return () => {
      if (saveTimer.current !== null) {
        window.clearTimeout(saveTimer.current)
      }
    }
  }, [])

  function saveProgressLater(patch: Omit<ReadingProgress, 'bookId'>) {
    if (!book) {
      return
    }

    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current)
    }

    const nextProgress: ReadingProgress = { bookId: book.id, ...patch }
    pendingTxtProgress.current = nextProgress

    // 自动滚动期间节流 UI 更新（每 2 秒），避免每帧触发 re-render
    const now = Date.now()
    if (!autoScrollEnabled || now - lastProgressUpdateRef.current > 2000) {
      lastProgressUpdateRef.current = now
      setProgress(nextProgress)
    }

    saveTimer.current = window.setTimeout(() => {
      pendingTxtProgress.current = null
      setProgress(nextProgress)
      void window.api.saveProgress(nextProgress)
      saveTimer.current = null
    }, 800)
  }

  async function flushPendingTxtProgress() {
    const nextProgress = pendingTxtProgress.current
    if (!nextProgress) {
      return
    }

    if (saveTimer.current !== null) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = null
    }

    pendingTxtProgress.current = null
    await window.api.saveProgress(nextProgress)
  }

  async function handleBackToBookshelf() {
    if (backNavigationRef.current) {
      await backNavigationRef.current
      return
    }

    setIsNavigatingBack(true)

    const backNavigation = (async () => {
      try {
        await flushPendingTxtProgress()
      } catch (error) {
        console.error('Failed to save reader progress before returning to the bookshelf.', error)
      } finally {
        backNavigationRef.current = null
        if (mountedRef.current) {
          setIsNavigatingBack(false)
        }
        onBack()
      }
    })()

    backNavigationRef.current = backNavigation
    await backNavigation
  }

  // 暴露返回处理器给 AppFrame 的书架按钮
  useEffect(() => {
    if (backRef) {
      backRef.current = handleBackToBookshelf
    }
  })

  // 暴露阅读器操作给键盘快捷键 hook
  useEffect(() => {
    if (readerActionsRef) {
      readerActionsRef.current = {
        scrollLine: (direction) => {
          // TXT：直接滚动容器
          if (txtScrollRef.current) {
            const lineHeight = activeConfig.fontSize * activeConfig.lineHeight
            txtScrollRef.current.scrollBy({
              top: direction === 'down' ? lineHeight : -lineHeight,
              behavior: 'smooth',
            })
            return
          }
          // EPUB：滚动 .epub-container
          const epubContainer = document.querySelector('.epub-container') as HTMLElement | null
          if (epubContainer) {
            const lineHeight = activeConfig.fontSize * activeConfig.lineHeight
            epubContainer.scrollBy({
              top: direction === 'down' ? lineHeight : -lineHeight,
              behavior: 'smooth',
            })
          }
        },
        chapterPrev: () => epubChapterNavRef.current?.prev(),
        chapterNext: () => epubChapterNavRef.current?.next(),
        toggleAutoScroll,
        autoScrollEnabled,
      }
    }
  })

  const readerTitle = book?.title ?? t('reader.title')
  const readerMeta = book
    ? [book.author && book.author.toLowerCase() !== 'unknown' ? book.author : '', book.format.toUpperCase()].filter(Boolean).join(' · ')
    : loading || bookLoading
      ? t('reader.loadingMeta')
      : t('reader.noBookMeta')

  useEffect(() => {
    onTitleChange?.(book?.title ?? t('app.readerTitle'))
  }, [book?.title, onTitleChange, t])

  return (
    <>
      <ReaderLayout title={readerTitle} meta={readerMeta} toc={toc} progress={book?.format === 'epub' ? currentChapterPercent : (progress?.percentage ?? null)} chapterProgressMap={book?.format === 'epub' ? chapterProgressRef.current : undefined} currentChapterHref={currentChapterHref} immersive={immersive} onExitImmersive={onExitImmersive} autoScrollActive={autoScrollEnabled} autoScrollPaused={autoScrollPaused} onChapterSelect={book?.format === 'epub' ? (href: string) => {
        // 立即更新当前章节 href（包含 fragment），以便目录精确匹配子项
        setCurrentChapterHref(href)
        const savedPct = chapterProgressRef.current[href]
          ?? chapterProgressRef.current[href.split('#')[0]]
          ?? 0
        epubDisplayRef.current?.(href, savedPct > 0 ? savedPct : undefined)
      } : undefined}>
        {loading || bookLoading ? (
          <div className="reader-empty">
            {/* 背景光晕 */}
            <div className="reader-empty__glow" />
            <div className="reader-empty__card">
              <div className="reader-empty__card-back" />
              <div className="reader-empty__card-front">
                <div className="reader-empty__static">
                  <img src={staticTexture} alt="" aria-hidden="true" />
                </div>
                <div className="reader-empty__card-content">
                  <span className="material-symbols-outlined reader-empty__icon">auto_stories</span>
                </div>
              </div>
            </div>
            <h2 className="reader-empty__label">{t('reader.preparingLabel')}</h2>
            {/* 全屏噪点纹理叠加 */}
            <div className="reader-empty__noise-overlay">
              <img src={staticTexture} alt="" aria-hidden="true" />
            </div>
          </div>
        ) : bookError || !book ? (
          <div className="reader-empty">
            {/* 背景光晕 */}
            <div className="reader-empty__glow" />
            {/* 碎裂书本卡片 */}
            <div className="reader-empty__card">
              <div className="reader-empty__card-back" />
              <div className="reader-empty__card-front">
                {/* 静态噪点纹理 */}
                <div className="reader-empty__static">
                  <img src={staticTexture} alt="" aria-hidden="true" />
                </div>
                {/* 书本图标 + 交叉线 */}
                <div className="reader-empty__card-content">
                  <span className="material-symbols-outlined reader-empty__icon">auto_stories</span>
                  <div className="reader-empty__cross-lines">
                    <div className="reader-empty__cross-line" />
                    <div className="reader-empty__cross-line" />
                  </div>
                </div>
              </div>
            </div>
            <h2 className="reader-empty__label">{t('reader.errorLabel')}</h2>
            <p className="reader-empty__hint">{t('reader.errorHint')}</p>
            <button className="reader-empty__action" type="button" onClick={handleBackToBookshelf}>
              {t('reader.backToShelf')}
            </button>
            {config?.currentBookId && (
              <button className="reader-empty__secondary" type="button" onClick={async () => {
                await window.api.removeBook(config.currentBookId!)
                await updateConfig({ currentBookId: undefined })
              }}>
                {t('reader.removeFromShelf')}
              </button>
            )}
            {/* 全屏噪点纹理叠加 */}
            <div className="reader-empty__noise-overlay">
              <img src={staticTexture} alt="" aria-hidden="true" />
            </div>
          </div>
        ) : book.format === 'txt' ? (
          <Suspense fallback={null}>
            <TxtRenderer
              content={txtContent}
              config={{
                fontSize: activeConfig.fontSize,
                lineHeight: activeConfig.lineHeight,
                fontFamily: activeConfig.fontFamily,
                fontWeight: activeConfig.fontWeight,
                themeTextColor: themeColors.text,
              }}
              savedProgress={progress}
              scrollRef={txtScrollRef}
              onProgressUpdate={saveProgressLater}
            />
          </Suspense>
        ) : book.format === 'epub' && epubData ? (
          <Suspense fallback={null}>
            <EpubRenderer
              bookId={book.id}
              bookData={epubData}
              fontSize={activeConfig.fontSize}
              lineHeight={activeConfig.lineHeight}
              fontFamily={activeConfig.fontFamily}
              fontWeight={activeConfig.fontWeight}
              themeTextColor={themeColors.text}
              savedCfi={progress?.epubCfi}
              displayRef={epubDisplayRef}
              chapterNavRef={epubChapterNavRef}
              onTocLoaded={setToc}
              onChapterScroll={handleChapterScroll}
              onSpineReady={(hrefs) => { spineHrefsRef.current = hrefs }}
              onProgressUpdate={(patch) => {
                if (!book) {
                  return
                }

                // 用章节进度加权平均计算全书进度
                const spineHrefs = spineHrefsRef.current
                let weightedPct = patch.percentage
                if (spineHrefs.length > 0) {
                  const sum = spineHrefs.reduce((acc, href) =>
                    acc + (chapterProgressRef.current[href] ?? 0), 0)
                  weightedPct = Math.round(sum / spineHrefs.length)
                }

                const nextProgress: ReadingProgress = {
                  bookId: book.id,
                  ...patch,
                  percentage: weightedPct,
                  chapterProgress: chapterProgressRef.current,
                }
                setProgress(nextProgress)
                void window.api.saveProgress(nextProgress)
              }}
            />
          </Suspense>
        ) : null}
      </ReaderLayout>

      {/* 全屏噪点纹理叠加 */}
      {activeConfig.noiseTexture && (
        <div
          className="reader-empty__noise-overlay"
          style={{ backgroundImage: `url(${NOISE_MAP[activeConfig.colorTheme] ?? NOISE_MAP.obsidian})` }}
        />
      )}

      {/* 新手引导 — 书籍加载完成且未完成引导时显示 */}
      {!bookLoading && book && !activeConfig.onboardingCompleted && (
        <Suspense fallback={null}>
          <ReaderGuide immersive={immersive} bookFormat={book?.format} onComplete={() => void updateConfig({ onboardingCompleted: true })} />
        </Suspense>
      )}

      {showUsageGuide && (
        <Suspense fallback={null}>
          <UsageGuidePanel onClose={() => setShowUsageGuide(false)} />
        </Suspense>
      )}

      <MoreMenu
        autoScrollEnabled={autoScrollEnabled}
        autoScrollSpeed={autoScrollSpeed}
        autoScrollPaused={autoScrollPaused}
        pauseOnHover={autoScrollPauseOnHover}
        onEnabledChange={setAutoScrollEnabled}
        onSpeedChange={setAutoScrollSpeed}
        onPauseOnHoverChange={setAutoScrollPauseOnHover}
        onUsageGuide={() => setShowUsageGuide(true)}
      />
    </>
  )
}
