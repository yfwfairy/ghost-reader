import { useEffect, useCallback, useRef, useState } from 'react'
import { AppFrame } from './components/chrome/AppFrame'
import { BookshelfPage } from './components/bookshelf/BookshelfPage'
import { ReaderPage } from './components/reader/ReaderPage'
import type { ReaderActions } from './components/reader/ReaderPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useConfig } from './hooks/useConfig'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { I18nProvider } from './hooks/I18nProvider'
import { useTranslation } from './hooks/useTranslation'
import './styles/global.css'

export type HomeView = 'recent' | 'library'
export type AppPage = 'home' | 'reader'

// 阅读器崩溃降级 UI
function ReaderErrorFallback({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="error-fallback">
      <span className="error-fallback__icon material-symbols-outlined" aria-hidden="true">
        error_outline
      </span>
      <h2 className="error-fallback__title">{t('error.readerTitle')}</h2>
      <p className="error-fallback__description">
        {t('error.readerDescription')}
      </p>
      <button className="error-fallback__btn" type="button" onClick={onBack}>
        {t('error.backToShelf')}
      </button>
    </div>
  )
}

// 监听系统深浅色偏好
function useSystemDarkMode(enabled: boolean) {
  const [dark, setDark] = useState(() =>
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  useEffect(() => {
    if (!enabled) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setDark(mq.matches)
    const handler = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [enabled])
  return dark
}

function AppInner() {
  const { config, fallbackConfig, updateConfig } = useConfig()
  const { t } = useTranslation()
  const [page, setPage] = useState<AppPage>('home')
  const [homeView, setHomeView] = useState<HomeView>('library')
  const [readerTitle, setReaderTitle] = useState(t('app.readerTitle'))
  const [immersive, setImmersive] = useState(false)
  // 哨兵值：区分"未初始化"和"无书籍（undefined）"
  const NOT_INITIALIZED = useRef(Symbol('not-initialized'))
  const lastObservedBookId = useRef<string | null | undefined | symbol>(NOT_INITIALIZED.current)
  const readerBackRef = useRef<(() => void | Promise<void>) | null>(null)
  const readerActionsRef = useRef<ReaderActions | null>(null)
  const activeConfig = config ?? fallbackConfig

  // 返回书架的回调（用于快捷键和 AppFrame）
  const handleBackToHome = useCallback(() => {
    void readerBackRef.current?.()
  }, [])

  // 阅读器键盘快捷键
  useKeyboardShortcuts({
    enabled: page === 'reader',
    immersive,
    setImmersive,
    readerActionsRef,
    onBack: handleBackToHome,
    fontSize: activeConfig.fontSize,
    updateConfig,
  })

  // 跟随系统 or 手动选择
  const systemDark = useSystemDarkMode(activeConfig.appearanceFollowSystem)
  const effectiveAppearance = activeConfig.appearanceFollowSystem
    ? (systemDark ? 'dark' : 'light')
    : activeConfig.appearance

  useEffect(() => {
    document.documentElement.dataset.appearance = effectiveAppearance
  }, [effectiveAppearance])

  useEffect(() => {
    if (config === null) {
      return
    }

    const currentBookId = config.currentBookId
    const previousBookId = lastObservedBookId.current
    lastObservedBookId.current = currentBookId

    if (previousBookId === NOT_INITIALIZED.current) {
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
        <ErrorBoundary
          fallback={<ReaderErrorFallback onBack={() => {
            void window.api.setAlwaysOnTop(false)
            setImmersive(false)
            setPage('home')
            void window.api.setMinWindowSize(800, 450)
          }} />}
          onReset={() => {
            void window.api.setAlwaysOnTop(false)
            setImmersive(false)
            setPage('home')
            void window.api.setMinWindowSize(800, 450)
          }}
        >
          <ReaderPage
            backRef={readerBackRef}
            readerActionsRef={readerActionsRef}
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
        </ErrorBoundary>
      )}
    </AppFrame>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <ErrorBoundary>
        <AppInner />
      </ErrorBoundary>
    </I18nProvider>
  )
}
