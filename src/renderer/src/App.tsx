import { useEffect, useRef, useState } from 'react'
import { AppFrame } from './components/chrome/AppFrame'
import { BookshelfPage } from './components/bookshelf/BookshelfPage'
import { ReaderPage } from './components/reader/ReaderPage'
import { useConfig } from './hooks/useConfig'
import './styles/global.css'

export type HomeView = 'recent' | 'library'
export type AppPage = 'home' | 'reader'

export default function App() {
  const { config, fallbackConfig } = useConfig()
  const [page, setPage] = useState<AppPage>('home')
  const [homeView, setHomeView] = useState<HomeView>('library')
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
      setPage(currentBookId ? 'reader' : 'home')
      return
    }

    if (currentBookId === previousBookId) {
      return
    }

    setReaderTitle('Reading')
    setPage(currentBookId ? 'reader' : 'home')
  }, [config])

  return (
    <AppFrame
      title={page === 'home' ? 'Ghost Reader' : readerTitle}
      alwaysOnTop={config ? config.alwaysOnTop : null}
      onToggleAlwaysOnTop={() => void window.api.setAlwaysOnTop(!activeConfig.alwaysOnTop)}
    >
      {page === 'home' ? (
        <BookshelfPage
          activeView={homeView}
          onChangeView={setHomeView}
          onOpenReader={() => {
            setReaderTitle('Reading')
            setPage('reader')
          }}
        />
      ) : (
        <ReaderPage
          onBack={() => setPage('home')}
          onTitleChange={(nextTitle) => setReaderTitle(nextTitle)}
        />
      )}
    </AppFrame>
  )
}
