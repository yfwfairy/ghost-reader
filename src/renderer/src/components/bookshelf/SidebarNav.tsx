import { useTranslation } from '../../hooks/useTranslation'

type SidebarNavProps = {
  activeView: 'recent' | 'library'
  onChangeView: (view: 'recent' | 'library') => void
  onOpenSettings: () => void
  style?: React.CSSProperties
}

export function SidebarNav({ activeView, onChangeView, onOpenSettings, style }: SidebarNavProps) {
  const { t } = useTranslation()

  return (
    <aside className="sidebar-nav" style={style}>
      <div className="sidebar-nav__brand">
        <h1>{t('sidebar.brand')}</h1>
        <p>{t('sidebar.subtitle')}</p>
      </div>
      <nav className="sidebar-nav__menu">
        <button
          type="button"
          className={`sidebar-nav__item ${activeView === 'recent' ? 'sidebar-nav__item--active' : ''}`}
          aria-label={t('sidebar.recentAria')}
          aria-pressed={activeView === 'recent'}
          onClick={() => onChangeView('recent')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">history</span>
          <span>{t('sidebar.recent')}</span>
        </button>
        <button
          type="button"
          className={`sidebar-nav__item ${activeView === 'library' ? 'sidebar-nav__item--active' : ''}`}
          aria-label={t('sidebar.libraryAria')}
          aria-pressed={activeView === 'library'}
          onClick={() => onChangeView('library')}
        >
          <span className="material-symbols-outlined" aria-hidden="true">library_books</span>
          <span>{t('sidebar.library')}</span>
        </button>
      </nav>
      <button className="sidebar-nav__settings" type="button" onClick={onOpenSettings}>
        <span className="material-symbols-outlined" aria-hidden="true">settings</span>
        <span>{t('sidebar.settings')}</span>
      </button>
    </aside>
  )
}
