import { useCallback, useEffect, useRef, useState } from 'react'
import type { BookRecord, ReadingProgress, TocEntry } from '@shared/types'
import { THEME_MAP, hexToRgbTriplet } from '@shared/constants'
import { useConfig } from '../../hooks/useConfig'
import { useTranslation } from '../../hooks/useTranslation'
import { EpubRenderer } from './EpubRenderer'
import { ReaderLayout } from './ReaderLayout'
import { TxtRenderer } from './TxtRenderer'

type ReaderPageProps = {
  backRef?: React.RefObject<(() => void | Promise<void>) | null>
  onBack: () => void
  onTitleChange?: (title: string) => void
  immersive?: boolean
  onExitImmersive?: () => void
}

export function ReaderPage({ backRef, onBack, onTitleChange, immersive = false, onExitImmersive }: ReaderPageProps) {
  const { config, fallbackConfig, loading } = useConfig()
  const { t } = useTranslation()
  const [book, setBook] = useState<BookRecord | null>(null)
  const [progress, setProgress] = useState<ReadingProgress | null>(null)
  const [txtContent, setTxtContent] = useState('')
  const [epubData, setEpubData] = useState<ArrayBuffer | null>(null)
  const [bookLoading, setBookLoading] = useState(true)
  const [toc, setToc] = useState<TocEntry[]>([])
  const [isNavigatingBack, setIsNavigatingBack] = useState(false)
  const saveTimer = useRef<number | ReturnType<typeof setTimeout> | null>(null)
  const pendingTxtProgress = useRef<ReadingProgress | null>(null)
  const mountedRef = useRef(true)
  const backNavigationRef = useRef<Promise<void> | null>(null)
  const epubDisplayRef = useRef<((href: string, scrollPct?: number) => void) | null>(null)
  const chapterProgressRef = useRef<Record<string, number>>({})
  const spineHrefsRef = useRef<string[]>([])
  const [currentChapterPercent, setCurrentChapterPercent] = useState<number | null>(null)
  const [currentChapterHref, setCurrentChapterHref] = useState<string | null>(null)
  const activeConfig = config ?? fallbackConfig

  // 从已保存的进度中恢复章节进度 map
  useEffect(() => {
    if (progress?.chapterProgress) {
      chapterProgressRef.current = { ...progress.chapterProgress }
    }
  }, [progress?.bookId])

  const handleChapterScroll = useCallback((chapterHref: string, percent: number) => {
    setCurrentChapterPercent(percent)
    setCurrentChapterHref(chapterHref)
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
      setBook(null)
      setProgress(null)
      setTxtContent('')
      setEpubData(null)
      return
    }

    if (!config?.currentBookId) {
      setBookLoading(false)
      setBook(null)
      setProgress(null)
      setTxtContent('')
      setEpubData(null)
      return
    }

    let cancelled = false
    setBookLoading(true)

    async function loadCurrentBook() {
      const books = await window.api.getAllBooks()
      const currentBook = books.find((candidate) => candidate.id === config.currentBookId) ?? null

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

  const readerTitle = book?.title ?? t('reader.title')
  const readerMeta = book
    ? `${book.author || t('reader.unknownAuthor')} · ${book.format.toUpperCase()}`
    : loading || bookLoading
      ? t('reader.loadingMeta')
      : t('reader.noBookMeta')

  useEffect(() => {
    onTitleChange?.(book?.title ?? t('app.readerTitle'))
  }, [book?.title, onTitleChange, t])

  return (
    <ReaderLayout title={readerTitle} meta={readerMeta} toc={toc} progress={book?.format === 'epub' ? currentChapterPercent : (progress?.percentage ?? null)} chapterProgressMap={book?.format === 'epub' ? chapterProgressRef.current : undefined} currentChapterHref={currentChapterHref} immersive={immersive} onExitImmersive={onExitImmersive} onChapterSelect={book?.format === 'epub' ? (href: string) => {
      const savedPct = chapterProgressRef.current[href]
        ?? chapterProgressRef.current[href.split('#')[0]]
        ?? 0
      epubDisplayRef.current?.(href, savedPct > 0 ? savedPct : undefined)
    } : undefined}>
      {loading || bookLoading ? (
        <div className="reader-empty">
          <p className="reader-empty__eyebrow">{t('reader.eyebrow')}</p>
          <h1 className="reader-empty__title">{t('reader.title')}</h1>
          <p className="reader-empty__subtitle">{t('reader.preparingSubtitle')}</p>
          <p className="reader-empty__message">{t('reader.preparingMessage')}</p>
        </div>
      ) : !book ? (
        <div className="reader-empty">
          <p className="reader-empty__eyebrow">{t('reader.eyebrow')}</p>
          <h1 className="reader-empty__title">{t('reader.title')}</h1>
          <p className="reader-empty__subtitle">{t('reader.noBookSubtitle')}</p>
          <p className="reader-empty__message">{t('reader.noBookMessage')}</p>
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
  )
}
