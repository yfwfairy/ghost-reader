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
  const saveTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const readerState = useReaderState({ fadeDelayMs: config?.fadeDelayMs ?? fallbackConfig.fadeDelayMs })

  useEffect(() => {
    if (loading || !config?.currentBookId) {
      setBook(null)
      setProgress(null)
      setTxtContent('')
      return
    }

    let cancelled = false

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
        }
      } else {
        setTxtContent('')
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

  if (loading || !config) {
    return null
  }

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
      onActivate={readerState.enterReading}
      onMouseEnter={() => readerState.handleMouseEnter()}
      onMouseLeave={() => readerState.handleMouseLeave()}
    >
      {!book ? (
        <div className="reader-empty">
          <p className="reader-empty__eyebrow">Reading</p>
          <h1 className="reader-empty__title">Reading Lens</h1>
          <p className="reader-empty__subtitle">A suspended reading surface for long-form focus.</p>
          <p className="reader-empty__message">No book selected.</p>
        </div>
      ) : book.format === 'txt' ? (
        <TxtRenderer
          content={txtContent}
          config={{ fontSize: config.fontSize, lineHeight: config.lineHeight }}
          savedProgress={progress}
          onProgressUpdate={saveProgressLater}
        />
      ) : (
        <EpubRenderer
          filePath={book.filePath}
          fontSize={config.fontSize}
          lineHeight={config.lineHeight}
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
