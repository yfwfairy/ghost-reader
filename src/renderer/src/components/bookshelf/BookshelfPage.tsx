import { useCallback, useRef, useState } from 'react'
import { useConfig } from '../../hooks/useConfig'
import { useTranslation } from '../../hooks/useTranslation'
import { SettingsPanel } from '../settings/SettingsPanel'
import { useBookshelfData } from '../../hooks/useBookshelfData'
import { LibraryView } from './LibraryView'
import { RecentView } from './RecentView'
import { SidebarNav } from './SidebarNav'

function getDroppedPaths(fileList: FileList) {
  return Array.from(fileList)
    .map((file) => (file as File & { path?: string }).path)
    .filter((path): path is string => Boolean(path))
}

const SIDEBAR_MIN = 220
const SIDEBAR_MAX = 420
const SIDEBAR_DEFAULT = 288

type BookshelfPageProps = {
  activeView: 'recent' | 'library'
  onChangeView: (view: 'recent' | 'library') => void
  onOpenReader: () => void
}

export function BookshelfPage({ activeView, onChangeView, onOpenReader }: BookshelfPageProps) {
  const { libraryBooks, recentBooks, loading, addBooks, removeBook } = useBookshelfData()
  const { config, fallbackConfig, updateConfig } = useConfig()
  const { t } = useTranslation()
  const [dragActive, setDragActive] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const resizing = useRef(false)

  const handleResizeStart = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    resizing.current = true

    const onMove = (moveEvent: MouseEvent) => {
      if (!resizing.current) return
      const next = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, moveEvent.clientX))
      setSidebarWidth(next)
    }

    const onUp = () => {
      resizing.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

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
      <SidebarNav
        activeView={activeView}
        onChangeView={onChangeView}
        onOpenSettings={() => setSettingsOpen(true)}
        style={{ width: sidebarWidth }}
      />
      <div
        className="sidebar-resize-handle"
        onMouseDown={handleResizeStart}
        role="separator"
        aria-orientation="vertical"
      />
      <main className="bookshelf-content">
        <div className="bookshelf-content__drag-bar" />
        {loading ? (
          <p className="bookshelf-status">{t('app.loading')}</p>
        ) : activeView === 'recent' ? (
          <RecentView books={recentBooks} onOpen={handleOpen} onOpenLibrary={() => onChangeView('library')} />
        ) : (
          <LibraryView
            books={libraryBooks}
            onOpen={handleOpen}
            onRemove={removeBook}
            onImport={handleImport}
          />
        )}
      </main>
      {settingsOpen ? (
        <SettingsPanel
          config={config ?? fallbackConfig}
          onClose={() => setSettingsOpen(false)}
          onSave={async (patch) => {
            await updateConfig(patch)
          }}
        />
      ) : null}
    </div>
  )
}
