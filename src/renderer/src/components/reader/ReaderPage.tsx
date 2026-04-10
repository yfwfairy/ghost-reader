import { useEffect, useRef, useState } from 'react'
import type { BookRecord, ReadingProgress } from '@shared/types'
import { useConfig } from '../../hooks/useConfig'
import { useTranslation } from '../../hooks/useTranslation'
import { EpubRenderer } from './EpubRenderer'
import { ReaderLayout } from './ReaderLayout'
import { TxtRenderer } from './TxtRenderer'

type ReaderPageProps = {
  backRef?: React.RefObject<(() => void | Promise<void>) | null>
  onBack: () => void
  onTitleChange?: (title: string) => void
  onProgressChange?: (percentage: number) => void
}

export function ReaderPage({ backRef, onBack, onTitleChange, onProgressChange }: ReaderPageProps) {
  const { config, fallbackConfig, loading } = useConfig()
  const { t } = useTranslation()
  const [book, setBook] = useState<BookRecord | null>(null)
  const [progress, setProgress] = useState<ReadingProgress | null>(null)
  const [txtContent, setTxtContent] = useState('')
  const [bookLoading, setBookLoading] = useState(true)
  const [isNavigatingBack, setIsNavigatingBack] = useState(false)
  const saveTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const pendingTxtProgress = useRef<ReadingProgress | null>(null)
  const mountedRef = useRef(true)
  const backNavigationRef = useRef<Promise<void> | null>(null)
  const activeConfig = config ?? fallbackConfig

  useEffect(() => {
    document.documentElement.dataset.appMode = 'reader'
    document.body.dataset.appMode = 'reader'

    return () => {
      mountedRef.current = false
      delete document.documentElement.dataset.appMode
      delete document.body.dataset.appMode
    }
  }, [])

  useEffect(() => {
    if (loading) {
      setBookLoading(true)
      setBook(null)
      setProgress(null)
      setTxtContent('')
      return
    }

    if (!config?.currentBookId) {
      setBookLoading(false)
      setBook(null)
      setProgress(null)
      setTxtContent('')
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
          setBookLoading(false)
        }
      } else {
        setTxtContent('')
        setBookLoading(false)
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
    onProgressChange?.(patch.percentage ?? nextProgress.percentage ?? 0)
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
    <ReaderLayout title={readerTitle} meta={readerMeta}>
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
          config={{ fontSize: activeConfig.fontSize, lineHeight: activeConfig.lineHeight }}
          savedProgress={progress}
          onProgressUpdate={saveProgressLater}
        />
      ) : (
        <EpubRenderer
          filePath={book.filePath}
          fontSize={activeConfig.fontSize}
          lineHeight={activeConfig.lineHeight}
          savedCfi={progress?.epubCfi}
          onProgressUpdate={(patch) => {
            if (!book) {
              return
            }

            const nextProgress: ReadingProgress = { bookId: book.id, ...patch }
            setProgress(nextProgress)
            onProgressChange?.(patch.percentage ?? 0)
            void window.api.saveProgress(nextProgress)
          }}
        />
      )}
    </ReaderLayout>
  )
}
