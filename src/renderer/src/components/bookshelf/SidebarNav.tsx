import { useState } from 'react'
import { useConfig } from '../../hooks/useConfig'
import { SettingsPanel } from '../settings/SettingsPanel'

type SidebarNavProps = {
  activeView: 'recent' | 'library'
  onChangeView: (view: 'recent' | 'library') => void
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
      {label}
    </button>
  )
}

export function SidebarNav({ activeView, onChangeView }: SidebarNavProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { config, fallbackConfig, updateConfig } = useConfig()

  return (
    <>
      <aside className="sidebar-nav">
        <div className="sidebar-nav__brand">
          <h1>Ghost Reader</h1>
          <p>Nocturnal Monolith</p>
        </div>
        <nav className="sidebar-nav__menu">
          <SidebarNavItem label="Recent" active={activeView === 'recent'} onClick={() => onChangeView('recent')} />
          <SidebarNavItem label="Library" active={activeView === 'library'} onClick={() => onChangeView('library')} />
        </nav>
        <button className="sidebar-nav__settings" type="button" onClick={() => setSettingsOpen(true)}>
          Settings
        </button>
      </aside>
      {settingsOpen ? (
        <SettingsPanel
          config={config ?? fallbackConfig}
          onClose={() => setSettingsOpen(false)}
          onSave={async (patch) => {
            await updateConfig(patch)
            setSettingsOpen(false)
          }}
        />
      ) : null}
    </>
  )
}
