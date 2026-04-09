type SidebarNavProps = {
  activeView: 'recent' | 'library'
  onChangeView: (view: 'recent' | 'library') => void
  onOpenSettings: () => void
  style?: React.CSSProperties
}

const navIcons: Record<string, string> = {
  Recent: 'history',
  Library: 'library_books',
}

type SidebarNavItemProps = {
  label: 'Recent' | 'Library'
  active: boolean
  onClick: () => void
}

function SidebarNavItem({ label, active, onClick }: SidebarNavItemProps) {
  return (
    <button
      type="button"
      className={`sidebar-nav__item ${active ? 'sidebar-nav__item--active' : ''}`}
      aria-label={`Open ${label.toLowerCase()} view`}
      aria-pressed={active}
      onClick={onClick}
    >
      <span className="material-symbols-outlined" aria-hidden="true">{navIcons[label]}</span>
      <span>{label.toUpperCase()}</span>
    </button>
  )
}

export function SidebarNav({ activeView, onChangeView, onOpenSettings, style }: SidebarNavProps) {
  return (
    <aside className="sidebar-nav" style={style}>
      <div className="sidebar-nav__brand">
        <h1>Ghost Reader</h1>
        <p>Nocturnal Monolith</p>
      </div>
      <nav className="sidebar-nav__menu">
        <SidebarNavItem label="Recent" active={activeView === 'recent'} onClick={() => onChangeView('recent')} />
        <SidebarNavItem label="Library" active={activeView === 'library'} onClick={() => onChangeView('library')} />
      </nav>
      <button className="sidebar-nav__settings" type="button" onClick={onOpenSettings}>
        <span className="material-symbols-outlined" aria-hidden="true">settings</span>
        <span>Settings</span>
      </button>
    </aside>
  )
}
