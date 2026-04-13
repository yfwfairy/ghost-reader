import { useEffect, useRef, useState } from 'react'
import { AppFrame } from './components/chrome/AppFrame'
import { BookshelfPage } from './components/bookshelf/BookshelfPage'
import { ReaderPage } from './components/reader/ReaderPage'
import { useConfig } from './hooks/useConfig'
import { I18nProvider, useTranslation } from './hooks/useTranslation'
import './styles/global.css'

export type HomeView = 'recent' | 'library'
export type AppPage = 'home' | 'reader'

function AppInner() {
  const { config, fallbackConfig } = useConfig()
  const { t } = useTranslation()
  const [page, setPage] = useState<AppPage>('home')
  const [homeView, setHomeView] = useState<HomeView>('library')
  const [readerTitle, setReaderTitle] = useState(t('app.readerTitle'))
  const [immersive, setImmersive] = useState(false)
  const lastObservedBookId = useRef<string | null | undefined>(undefined)
  const readerBackRef = useRef<(() => void | Promise<void>) | null>(null)
  const activeConfig = config ?? fallbackConfig

  useEffect(() => {
    if (config === null) {
      return
    }

    const currentBookId = config.currentBookId
    const previousBookId = lastObservedBookId.current
    lastObservedBookId.current = currentBookId

    if (previousBookId === undefined) {
      // 始终从首页进入，不自动恢复阅读器
      setPage('home')
      void window.api.setMinWindowSize(800, 450)
      return
    }

    if (currentBookId === previousBookId) {
      return
    }

    setReaderTitle(t('app.readerTitle'))
    setPage(currentBookId ? 'reader' : 'home')
    if (currentBookId) {
      void window.api.setMinWindowSize(300, 200)
    } else {
      void window.api.setMinWindowSize(800, 450)
    }
  }, [config, t])

  return (
    <AppFrame
      title={page === 'home' ? t('app.title') : readerTitle}
      alwaysOnTop={config ? config.alwaysOnTop : null}
      onToggleAlwaysOnTop={() => void window.api.setAlwaysOnTop(!activeConfig.alwaysOnTop)}
      onBack={page === 'reader' ? () => void readerBackRef.current?.() : undefined}
      chromeless={page === 'home'}
      immersive={page === 'reader' && immersive}
      onToggleImmersive={page === 'reader' ? () => setImmersive((prev) => !prev) : undefined}
    >
      {page === 'home' ? (
        <BookshelfPage
          activeView={homeView}
          onChangeView={setHomeView}
          onOpenReader={() => {
            setReaderTitle(t('app.readerTitle'))
            setPage('reader')
            void window.api.setMinWindowSize(300, 200)
          }}
        />
      ) : (
        <ReaderPage
          backRef={readerBackRef}
          onBack={() => {
            void window.api.setAlwaysOnTop(false)
            setImmersive(false)
            setPage('home')
            void window.api.setMinWindowSize(800, 450)
          }}
          onTitleChange={(nextTitle) => setReaderTitle(nextTitle)}
          immersive={immersive}
          onExitImmersive={() => setImmersive(false)}
        />
      )}
    </AppFrame>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  )
}
