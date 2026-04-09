import { useState } from 'react'
import { useLibrary } from '../../hooks/useLibrary'
import { BookGrid } from './BookGrid'
import { BookshelfHeader } from './BookshelfHeader'

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
      <BookshelfHeader activeView={activeView} onChangeView={onChangeView} onImport={handleImport} />
      <main className="bookshelf-main">
        {loading ? (
          <p className="bookshelf-status">Loading library...</p>
        ) : (
          <BookGrid books={books} onOpen={handleOpen} onRemove={removeBook} onImport={handleImport} />
        )}
      </main>
    </div>
  )
}
