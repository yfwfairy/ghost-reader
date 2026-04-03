import { useEffect, useRef, useState } from 'react'
import type { BookRecord, ReadingProgress } from '@shared/types'
import { useConfig } from '../../hooks/useConfig'
import { useReaderState } from '../../hooks/useReaderState'
import { EpubRenderer } from './EpubRenderer'
import { ReaderLayout } from './ReaderLayout'
import { TxtRenderer } from './TxtRenderer'

export function ReaderPage() {
  const { config, fallbackConfig, loading } = useConfig()
  const [book, setBook] = useState<BookRecord | null>(null)
  const [progress, setProgress] = useState<ReadingProgress | null>(null)
  const [txtContent, setTxtContent] = useState('')
  const [bookLoading, setBookLoading] = useState(true)
  const saveTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const activeConfig = config ?? fallbackConfig
  const readerState = useReaderState({ fadeDelayMs: activeConfig.fadeDelayMs })

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
    setProgress(nextProgress)
    saveTimer.current = window.setTimeout(() => {
      void window.api.saveProgress(nextProgress)
      saveTimer.current = null
    }, 800)
  }

  return (
    <ReaderLayout
      mode={readerState.mode}
      onHide={readerState.hideReader}
      onMouseEnter={() => readerState.handleMouseEnter()}
      onMouseLeave={() => readerState.handleMouseLeave()}
    >
      {loading || bookLoading ? (
        <div className="reader-empty">
          <p className="reader-empty__eyebrow">Reading</p>
          <h1 className="reader-empty__title">Reading Lens</h1>
          <p className="reader-empty__subtitle">A suspended reading surface for long-form focus.</p>
          <p className="reader-empty__message">Preparing reader...</p>
        </div>
      ) : !book ? (
        <div className="reader-empty">
          <p className="reader-empty__eyebrow">Reading</p>
          <h1 className="reader-empty__title">Reading Lens</h1>
          <p className="reader-empty__subtitle">A suspended reading surface for long-form focus.</p>
          <p className="reader-empty__message">No book selected.</p>
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
            void window.api.saveProgress(nextProgress)
          }}
        />
      )}
    </ReaderLayout>
  )
}
