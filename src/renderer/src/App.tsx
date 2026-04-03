import { useEffect, useState } from 'react'
import { BookshelfPage } from './components/bookshelf/BookshelfPage'
import { ReaderPage } from './components/reader/ReaderPage'
import './styles/global.css'

export type AppPage = 'bookshelf' | 'reader'

export default function App() {
  const [page, setPage] = useState<AppPage>('bookshelf')

  useEffect(() => {
    let active = true

    void window.api.getConfig().then((config) => {
      if (active) {
        setPage(config.currentBookId ? 'reader' : 'bookshelf')
      }
    })

    return () => {
      active = false
    }
  }, [])

  return page === 'bookshelf' ? (
    <BookshelfPage onOpenReader={() => setPage('reader')} />
  ) : (
    <ReaderPage onBack={() => setPage('bookshelf')} />
  )
}
