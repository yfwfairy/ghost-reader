import { useCallback, useEffect, useRef, useState } from 'react'
import type { BookRecord, ReadingProgress, TocEntry } from '@shared/types'
import { THEME_MAP, hexToRgbTriplet } from '@shared/constants'
import { useConfig } from '../../hooks/useConfig'
import { useTranslation } from '../../hooks/useTranslation'
import staticTexture from '../../assets/static-texture.png'
import { EpubRenderer } from './EpubRenderer'
import { ReaderGuide } from './ReaderGuide'
import { ReaderLayout } from './ReaderLayout'
import { TxtRenderer } from './TxtRenderer'

export type ReaderActions = {
  scrollLine: (direction: 'up' | 'down') => void
  chapterPrev: () => void
  chapterNext: () => void
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
  const mountedRef = useRef(true)
  const backNavigationRef = useRef<Promise<void> | null>(null)
  const epubDisplayRef = useRef<((href: string, scrollPct?: number) => void) | null>(null)
  const epubChapterNavRef = useRef<{ prev: () => void; next: () => void } | null>(null)
  const txtScrollRef = useRef<HTMLDivElement | null>(null)
  const chapterProgressRef = useRef<Record<string, number>>({})
  const spineHrefsRef = useRef<string[]>([])
  const [currentChapterPercent, setCurrentChapterPercent] = useState<number | null>(null)
  const [currentChapterHref, setCurrentChapterHref] = useState<string | null>(null)
  const activeConfig = config ?? fallbackConfig

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
    }
  }, [])

  // 同步 colorTheme 到 CSS 变量和 HTML 属性
  useEffect(() => {
    const theme = THEME_MAP[activeConfig.colorTheme]
    const root = document.documentElement
    root.dataset.colorTheme = activeConfig.colorTheme
    root.style.setProperty('--theme-bg', hexToRgbTriplet(theme.bg))
    root.style.setProperty('--theme-text', hexToRgbTriplet(theme.text))
    root.style.setProperty('--theme-accent', hexToRgbTriplet(theme.accent))
  }, [activeConfig.colorTheme])

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
    setProgress(nextProgress)
    saveTimer.current = window.setTimeout(() => {
      pendingTxtProgress.current = null
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
      <ReaderLayout title={readerTitle} meta={readerMeta} toc={toc} progress={book?.format === 'epub' ? currentChapterPercent : (progress?.percentage ?? null)} chapterProgressMap={book?.format === 'epub' ? chapterProgressRef.current : undefined} currentChapterHref={currentChapterHref} immersive={immersive} onExitImmersive={onExitImmersive} onChapterSelect={book?.format === 'epub' ? (href: string) => {
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
          <TxtRenderer
            content={txtContent}
            config={{
              fontSize: activeConfig.fontSize,
              lineHeight: activeConfig.lineHeight,
              fontFamily: activeConfig.fontFamily,
              colorTheme: activeConfig.colorTheme,
            }}
            savedProgress={progress}
            scrollRef={txtScrollRef}
            onProgressUpdate={saveProgressLater}
          />
        ) : book.format === 'epub' && epubData ? (
          <EpubRenderer
            bookData={epubData}
            fontSize={activeConfig.fontSize}
            lineHeight={activeConfig.lineHeight}
            fontFamily={activeConfig.fontFamily}
            colorTheme={activeConfig.colorTheme}
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
        ) : null}
      </ReaderLayout>

      {/* 新手引导 — 书籍加载完成且未完成引导时显示 */}
      {!bookLoading && book && !activeConfig.onboardingCompleted && (
        <ReaderGuide immersive={immersive} bookFormat={book?.format} onComplete={() => void updateConfig({ onboardingCompleted: true })} />
      )}
    </>
  )
}
