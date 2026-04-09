import { useState } from 'react'
import { useConfig } from '../../hooks/useConfig'
import { useLibrary } from '../../hooks/useLibrary'
import { BookGrid } from './BookGrid'
import { SettingsPanel } from '../settings/SettingsPanel'

function getDroppedPaths(fileList: FileList) {
  return Array.from(fileList)
    .map((file) => (file as File & { path?: string }).path)
    .filter((path): path is string => Boolean(path))
}

type BookshelfPageProps = {
  activeView: 'recent' | 'library'
  onChangeView: (view: 'recent' | 'library') => void
  onOpenReader: () => void
}

export function BookshelfPage({ activeView, onChangeView, onOpenReader }: BookshelfPageProps) {
  const { books, loading, addBooks, removeBook } = useLibrary()
  const { config, fallbackConfig, updateConfig } = useConfig()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  async function handleImport() {
    const paths = await window.api.openFileDialog()
    if (paths.length > 0) {
      await addBooks(paths)
    }
  }

  async function handleOpen(bookId: string) {
    await window.api.setConfig({ currentBookId: bookId })
    onOpenReader()
  }

  return (
    <div
      className={`bookshelf-page ${dragActive ? 'bookshelf-page--drag' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={async (event) => {
        event.preventDefault()
        setDragActive(false)
        const paths = getDroppedPaths(event.dataTransfer.files)
        if (paths.length > 0) {
          await addBooks(paths)
        }
      }}
    >
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
          <button className="bookshelf-header__action" onClick={() => void handleImport()}>
            Import Books
          </button>
          <button className="bookshelf-header__action" onClick={() => setSettingsOpen(true)}>
            Settings
          </button>
        </div>
      </header>
      <main className="bookshelf-main">
        {loading ? (
          <p className="bookshelf-status">Loading library...</p>
        ) : (
          <BookGrid books={books} onOpen={handleOpen} onRemove={removeBook} onImport={handleImport} />
        )}
      </main>
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
    </div>
  )
}
