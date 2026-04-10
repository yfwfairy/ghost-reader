import type { ReactNode } from 'react'
import { useTranslation } from '../../hooks/useTranslation'

type AppFrameProps = {
  title: string
  progress?: number | null
  alwaysOnTop: boolean | null
  onToggleAlwaysOnTop: () => void | Promise<void>
  onBack?: () => void
  chromeless?: boolean
  children: ReactNode
}

export function AppFrame({ title, progress, alwaysOnTop, onToggleAlwaysOnTop, onBack, chromeless = false, children }: AppFrameProps) {
  const { t } = useTranslation()
  const pinLoading = alwaysOnTop === null
  const pinAriaLabel = pinLoading
    ? t('app.pinLoading')
    : alwaysOnTop
      ? t('app.unpin')
      : t('app.pin')

  return (
    <section className={`app-frame ${chromeless ? 'app-frame--chromeless' : ''}`}>
      <header className="app-frame__titlebar">
        <div className="app-frame__titlebar-left" />
        <div className="app-frame__titlebar-center">
          <p className="app-frame__title">{title}</p>
          {progress != null && (
            <span className="app-frame__progress">{t('reader.progressRead', String(progress))}</span>
          )}
        </div>
        <div className="app-frame__actions no-drag">
          <button
            className={`app-frame__pin ${alwaysOnTop ? 'app-frame__pin--active' : ''}`}
            type="button"
            aria-label={pinAriaLabel}
            disabled={pinLoading}
            onClick={() => void onToggleAlwaysOnTop()}
          >
            <span className="material-symbols-outlined" aria-hidden="true">push_pin</span>
          </button>
          {onBack && (
            <button
              className="app-frame__back"
              type="button"
              aria-label={t('reader.backToShelf')}
              onClick={onBack}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                library_books
              </span>
            </button>
          )}
        </div>
      </header>
      <div className="app-frame__content">{children}</div>
    </section>
  )
}
