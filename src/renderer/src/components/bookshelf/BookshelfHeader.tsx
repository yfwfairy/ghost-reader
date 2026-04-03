import { useState } from 'react'
import { useConfig } from '../../hooks/useConfig'
import { SettingsPanel } from '../settings/SettingsPanel'

type BookshelfHeaderProps = {
  onImport: () => Promise<void>
}

export function BookshelfHeader({ onImport }: BookshelfHeaderProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { config, fallbackConfig, updateConfig } = useConfig()

  return (
    <>
      <header className="bookshelf-header">
        <div className="bookshelf-header__intro">
          <p className="bookshelf-header__eyebrow">Ghost Reader</p>
          <h1>Bookshelf</h1>
          <p className="bookshelf-header__summary">Quiet shelf for imported books.</p>
        </div>
        <div className="bookshelf-header__actions">
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
