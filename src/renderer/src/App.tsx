import { useEffect, useRef, useState } from 'react'
import { AppFrame } from './components/chrome/AppFrame'
import { BookshelfPage } from './components/bookshelf/BookshelfPage'
import { ReaderPage } from './components/reader/ReaderPage'
import { useConfig } from './hooks/useConfig'
import './styles/global.css'

export type AppPage = 'bookshelf' | 'reader'

export default function App() {
  const { config, fallbackConfig } = useConfig()
  const [page, setPage] = useState<AppPage>('bookshelf')
  const [readerTitle, setReaderTitle] = useState('Reading')
  const lastObservedBookId = useRef<string | null | undefined>(undefined)
  const activeConfig = config ?? fallbackConfig

  useEffect(() => {
    if (config === null) {
      return
    }

    const currentBookId = config.currentBookId
    const previousBookId = lastObservedBookId.current
    lastObservedBookId.current = currentBookId

    if (previousBookId === undefined) {
      setPage(currentBookId ? 'reader' : 'bookshelf')
      return
    }

    if (currentBookId === previousBookId) {
      return
    }

    setReaderTitle('Reading')
    setPage(currentBookId ? 'reader' : 'bookshelf')
  }, [config])

  return (
    <AppFrame
      title={page === 'bookshelf' ? 'Ghost Reader' : readerTitle}
      alwaysOnTop={config ? config.alwaysOnTop : null}
      onToggleAlwaysOnTop={() => void window.api.setAlwaysOnTop(!activeConfig.alwaysOnTop)}
    >
      {page === 'bookshelf' ? (
        <BookshelfPage
          onOpenReader={() => {
            setReaderTitle('Reading')
            setPage('reader')
          }}
        />
      ) : (
        <ReaderPage
          onBack={() => setPage('bookshelf')}
          onTitleChange={(nextTitle) => setReaderTitle(nextTitle)}
        />
      )}
    </AppFrame>
  )
}
