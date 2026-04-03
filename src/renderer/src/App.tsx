import { BookshelfPage } from './components/bookshelf/BookshelfPage'
import './styles/global.css'

function getMode(): 'bookshelf' | 'reader' {
  const params = new URLSearchParams(window.location.search)
  return params.get('mode') === 'reader' ? 'reader' : 'bookshelf'
}

function ReaderPlaceholder() {
  return (
    <div className="reader-shell">
      <div className="reader-shell__panel">
        <div className="reader-shell__drag-rail" />
        <div className="reader-shell__content">
          <p className="reader-shell__eyebrow">Reading</p>
          <h1 className="reader-shell__title">Reading Lens</h1>
          <p className="reader-shell__subtitle">A suspended reading surface for long-form focus.</p>
          <div className="reader-shell__excerpt">
            <p>
              The text should stay brighter than the panel, as if the whole surface exists only to hold
              the words.
            </p>
            <p>
              Quiet contrast, soft translucency, and stable rhythm should do the work, never loud chrome.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return getMode() === 'reader' ? <ReaderPlaceholder /> : <BookshelfPage />
}
