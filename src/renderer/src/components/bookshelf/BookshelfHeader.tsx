import { useState } from 'react'
import { useConfig } from '../../hooks/useConfig'
import { SettingsPanel } from '../settings/SettingsPanel'

type BookshelfHeaderProps = {
  activeView: 'recent' | 'library'
  onChangeView: (view: 'recent' | 'library') => void
  onImport: () => Promise<void>
}

export function BookshelfHeader({ activeView, onChangeView, onImport }: BookshelfHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { config, fallbackConfig, updateConfig } = useConfig()

  return (
    <>
      <header className="bookshelf-header">
        <div className="bookshelf-header__actions">
          <button
            type="button"
            className="bookshelf-header__action"
            aria-label="Open recent view"
            aria-pressed={activeView === 'recent'}
            onClick={() => onChangeView('recent')}
          >
            Recent
          </button>
          <button
            type="button"
            className="bookshelf-header__action"
            aria-label="Open library view"
            aria-pressed={activeView === 'library'}
            onClick={() => onChangeView('library')}
          >
            Library
          </button>
          <button className="bookshelf-header__action" onClick={() => void onImport()}>
            Import Books
          </button>
          <button className="bookshelf-header__action" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </header>
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
