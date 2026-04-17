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
    .map((file) => window.electronUtils.getPathForFile(file))
    .filter((path): path is string => Boolean(path))
}

const SIDEBAR_MIN = 200
const SIDEBAR_MAX = 300
const SIDEBAR_DEFAULT = 250

type BookshelfPageProps = {
  activeView: 'recent' | 'library'
  onChangeView: (view: 'recent' | 'library') => void
  onOpenReader: () => void
}

export function BookshelfPage({ activeView, onChangeView, onOpenReader }: BookshelfPageProps) {
  const { libraryBooks, recentBooks, loading, addBooks, removeBook, resetBooks } = useBookshelfData()
  const { config, fallbackConfig, updateConfig } = useConfig()
  const { t } = useTranslation()
  const [dragActive, setDragActive] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT)
  const resizing = useRef(false)
  // 计数器解决 dragEnter/dragLeave 在子元素间切换时的闪烁问题
  const dragCounter = useRef(0)

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
    <div className="bookshelf-page">
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
      <main
        className="bookshelf-content"
        onDragEnter={(event) => {
          event.preventDefault()
          dragCounter.current++
          setDragActive(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
        }}
        onDragLeave={() => {
          dragCounter.current--
          if (dragCounter.current <= 0) {
            dragCounter.current = 0
            setDragActive(false)
          }
        }}
        onDrop={async (event) => {
          event.preventDefault()
          dragCounter.current = 0
          setDragActive(false)
          const paths = getDroppedPaths(event.dataTransfer.files)
          if (paths.length > 0) {
            await addBooks(paths)
          }
        }}
      >
        <div className="bookshelf-content__drag-bar" />
        {loading ? (
          <p className="bookshelf-status">{t('app.loading')}</p>
        ) : activeView === 'recent' ? (
          <RecentView books={recentBooks} onOpen={handleOpen} onOpenLibrary={() => onChangeView('library')} resetBooks={resetBooks} />
        ) : (
          <LibraryView
            books={libraryBooks}
            onOpen={handleOpen}
            onRemove={removeBook}
            onImport={handleImport}
          />
        )}
        {/* 拖放蒙版 */}
        {dragActive && (
          <div className="drop-overlay">
            <div className="drop-zone-icon">
              {/* 浮动文件组 */}
              <div className="floating-files">
                <div className="file-ghost file-1">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <div className="file-ghost file-2">
                  <span className="material-symbols-outlined">menu_book</span>
                </div>
                <div className="file-ghost file-3">
                  <span className="material-symbols-outlined">text_snippet</span>
                </div>
              </div>
              {/* 动态箭头 */}
              <div className="drop-arrow">
                <span className="material-symbols-outlined">arrow_downward</span>
                <div className="arrow-trail" />
              </div>
              {/* 发光容器 */}
              <div className="glow-sink">
                <div className="sink-inner">
                  <span className="material-symbols-outlined">archive</span>
                </div>
                <div className="sink-ring ring-1" />
                <div className="sink-ring ring-2" />
              </div>
              {/* 提示文字 */}
              <div className="drop-hint">
                <span>{t('library.dragHint')}</span>
                <span>{t('library.dragHintSub')}</span>
              </div>
            </div>
          </div>
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
