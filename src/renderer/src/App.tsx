import { BookshelfPage } from './components/bookshelf/BookshelfPage'
import './styles/global.css'

function getMode(): 'bookshelf' | 'reader' {
  const params = new URLSearchParams(window.location.search)
  return params.get('mode') === 'reader' ? 'reader' : 'bookshelf'
}

function ReaderPlaceholder() {
  return <div className="reader-placeholder">Reader view loading...</div>
}

export default function App() {
  return getMode() === 'reader' ? <ReaderPlaceholder /> : <BookshelfPage />
}
