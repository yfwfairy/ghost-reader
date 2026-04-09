import type { ReactNode } from 'react'

type AppFrameProps = {
  title: string
  alwaysOnTop: boolean | null
  onToggleAlwaysOnTop: () => void | Promise<void>
  chromeless?: boolean
  children: ReactNode
}

export function AppFrame({ title, alwaysOnTop, onToggleAlwaysOnTop, chromeless = false, children }: AppFrameProps) {
  const pinLoading = alwaysOnTop === null
  const pinAriaLabel = pinLoading ? 'Loading pin state' : alwaysOnTop ? 'Unpin window' : 'Pin window'

  return (
    <section className={`app-frame ${chromeless ? 'app-frame--chromeless' : ''}`}>
      <header className="app-frame__titlebar">
        <p className="app-frame__title">{title}</p>
        <div className="app-frame__actions no-drag">
          <button
            className={`app-frame__pin ${alwaysOnTop ? 'app-frame__pin--active' : ''}`}
            type="button"
            aria-label={pinAriaLabel}
            disabled={pinLoading}
            onClick={() => void onToggleAlwaysOnTop()}
          >
            {alwaysOnTop ? 'Pinned' : 'Pin'}
          </button>
        </div>
      </header>
      <div className="app-frame__content">{children}</div>
    </section>
  )
}
