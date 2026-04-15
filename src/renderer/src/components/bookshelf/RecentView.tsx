import { useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'
import type { BookshelfBook } from '../../hooks/useBookshelfData'
import { RecentBookCard } from './RecentBookCard'

type RecentViewProps = {
  books: BookshelfBook[]
  onOpen: (bookId: string) => void | Promise<void>
  onOpenLibrary: () => void
  resetBooks: (bookIds: string[]) => Promise<void>
}

export function RecentView({ books, onOpen, onOpenLibrary, resetBooks }: RecentViewProps) {
  const { t } = useTranslation()
  const [managing, setManaging] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  function toggleSelect(bookId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(bookId)) {
        next.delete(bookId)
      } else {
        next.add(bookId)
      }
      return next
    })
  }

  function handleSelectAll() {
    if (selectedIds.size === books.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(books.map((b) => b.id)))
    }
  }

  async function handleDelete() {
    if (selectedIds.size === 0) return
    await resetBooks([...selectedIds])
    setSelectedIds(new Set())
    setManaging(false)
  }

  async function handleResetSingle(bookId: string) {
    await resetBooks([bookId])
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(bookId)
      return next
    })
  }

  function exitManaging() {
    setManaging(false)
    setSelectedIds(new Set())
  }

  if (books.length === 0) {
    return (
      <section className="recent-view recent-view--empty">
        <h2 className="sr-only">{t('recent.heading')}</h2>
        <div className="recent-view__empty-center">
          {/* 水晶碎片插画 */}
          <div className="recent-view__crystal crystal-float" aria-hidden="true">
            <div className="recent-view__crystal-glow" />
            <div className="recent-view__crystal-glow recent-view__crystal-glow--pulse" />
            <div className="recent-view__crystal-body">
              <div className="recent-view__crystal-layer recent-view__crystal-layer--back" />
              <div className="recent-view__crystal-layer recent-view__crystal-layer--front" />
              <div className="recent-view__crystal-icons">
                <span className="material-symbols-outlined recent-view__crystal-icon-main">auto_stories</span>
                <div className="recent-view__crystal-divider" />
                <span className="material-symbols-outlined recent-view__crystal-icon-sub">diamond</span>
              </div>
            </div>
          </div>
          <h3 className="recent-view__empty-title">{t('recent.emptyTitle')}</h3>
          <p className="recent-view__empty-copy">
            {t('recent.emptyCopy')}
          </p>
          <button type="button" className="recent-view__empty-action" onClick={onOpenLibrary}>
            <span>{t('recent.emptyAction')}</span>
            <span className="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
          </button>
        </div>
        <footer className="recent-view__empty-footer" aria-hidden="true">
          <span>{t('recent.footerSilence')}</span>
          <span className="recent-view__empty-footer-dot" />
          <span>{t('recent.footerFocus')}</span>
          <span className="recent-view__empty-footer-dot" />
          <span>{t('recent.footerImmersion')}</span>
        </footer>
      </section>
    )
  }

  const allSelected = selectedIds.size === books.length

  return (
    <section className="recent-view">
      <header className="recent-view__header">
        <div className="recent-view__header-text">
          <h2>{t('recent.heading')}</h2>
          <p>{t('recent.subtitle')}</p>
        </div>
        {managing ? (
          <button type="button" className="recent-view__manage-btn recent-view__manage-btn--exit" onClick={exitManaging}>
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
            <span>{t('recent.exitManage')}</span>
          </button>
        ) : (
          <button type="button" className="recent-view__manage-btn" onClick={() => setManaging(true)}>
            <span className="material-symbols-outlined" aria-hidden="true">edit_note</span>
            <span>{t('recent.manage')}</span>
          </button>
        )}
      </header>
      <div className="recent-view__list">
        {books.map((book) => (
          <RecentBookCard
            key={book.id}
            book={book}
            onOpen={onOpen}
            managing={managing}
            selected={selectedIds.has(book.id)}
            onToggleSelect={toggleSelect}
            onResetSingle={handleResetSingle}
          />
        ))}
      </div>

      {/* 底部管理操作栏 */}
      <div className={`recent-manage-bar ${managing ? 'recent-manage-bar--visible' : ''}`}>
        <button type="button" className="recent-manage-bar__btn" onClick={handleSelectAll}>
          <span className="material-symbols-outlined" aria-hidden="true">
            {allSelected ? 'deselect' : 'select_all'}
          </span>
          <span>{allSelected ? t('recent.deselectAll') : t('recent.selectAll')}</span>
        </button>
        <button
          type="button"
          className="recent-manage-bar__btn recent-manage-bar__btn--delete"
          disabled={selectedIds.size === 0}
          onClick={() => void handleDelete()}
        >
          <span className="material-symbols-outlined" aria-hidden="true">delete</span>
          <span>{t('recent.delete')}{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}</span>
        </button>
      </div>
    </section>
  )
}
