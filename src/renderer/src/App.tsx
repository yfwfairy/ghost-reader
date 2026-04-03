import { BookshelfPage } from './components/bookshelf/BookshelfPage'
import { ReaderPage } from './components/reader/ReaderPage'
import './styles/global.css'

function getMode(): 'bookshelf' | 'reader' {
  const params = new URLSearchParams(window.location.search)
  return params.get('mode') === 'reader' ? 'reader' : 'bookshelf'
}

export default function App() {
  return getMode() === 'reader' ? <ReaderPage /> : <BookshelfPage />
}
