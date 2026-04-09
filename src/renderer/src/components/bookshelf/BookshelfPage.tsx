import { useState } from 'react'
import { useBookshelfData } from '../../hooks/useBookshelfData'
import { LibraryView } from './LibraryView'
import { SidebarNav } from './SidebarNav'

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
  const { libraryBooks, recentBooks, loading, addBooks, removeBook } = useBookshelfData()
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
      <SidebarNav activeView={activeView} onChangeView={onChangeView} />
      <main className="bookshelf-content">
        {loading ? (
          <p className="bookshelf-status">Loading library...</p>
        ) : (
          <LibraryView
            books={activeView === 'recent' ? recentBooks : libraryBooks}
            onOpen={handleOpen}
            onRemove={removeBook}
            onImport={handleImport}
            showAddTile={activeView === 'library'}
          />
        )}
      </main>
    </div>
  )
}
