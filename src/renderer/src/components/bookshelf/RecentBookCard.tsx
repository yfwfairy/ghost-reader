import { useTranslation } from '../../hooks/useTranslation'
import type { BookshelfBook } from '../../hooks/useBookshelfData'
import { PlaceholderCover } from './PlaceholderCover'

type RecentBookCardProps = {
  book: BookshelfBook
  onOpen: (bookId: string) => void | Promise<void>
  managing?: boolean
  selected?: boolean
  onToggleSelect?: (bookId: string) => void
  onResetSingle?: (bookId: string) => void
}

function clampPercentage(value: number) {
  if (value < 0) {
    return 0
  }
  if (value > 100) {
    return 100
  }
  return value
}

function formatLastOpened(updatedAt: number) {
  return new Date(updatedAt).toISOString().slice(0, 10)
}

export function RecentBookCard({ book, onOpen, managing = false, selected = false, onToggleSelect, onResetSingle }: RecentBookCardProps) {
  const { t } = useTranslation()
  const progressPercentage = clampPercentage(book.progress?.percentage ?? 0)
  const lastOpenedLabel = formatLastOpened(book.progress?.updatedAt ?? book.updatedAt)

  function handleCardClick() {
    if (managing) {
      onToggleSelect?.(book.id)
    } else {
      void onOpen(book.id)
    }
  }

  return (
    <div className={`recent-book-card-row ${managing ? 'recent-book-card-row--managing' : ''}`}>
      {/* 左侧勾选框（独立控件） */}
      <button
        type="button"
        className={`recent-book-card__checkbox-btn ${selected ? 'recent-book-card__checkbox-btn--checked' : ''}`}
        aria-hidden={!managing}
        tabIndex={managing ? 0 : -1}
        onClick={() => onToggleSelect?.(book.id)}
      >
        <div className="recent-book-card__checkbox-dot">
          {selected && <span className="material-symbols-outlined">check</span>}
        </div>
      </button>

      {/* 卡片主体 */}
      <article className={`recent-book-card ${managing ? 'recent-book-card--managing' : ''} ${selected ? 'recent-book-card--selected' : ''}`}>
        <button
          type="button"
          className="recent-book-card__open"
          aria-label={t('recent.openAria', book.title)}
          onClick={handleCardClick}
        >
          <div className="recent-book-card__cover">
            {book.coverDataUrl ? <img src={book.coverDataUrl} alt={book.title} /> : <PlaceholderCover bookId={book.id} title={book.title} />}
            <div className="recent-book-card__cover-fade" />
          </div>
          <div className="recent-book-card__body">
            <h3 className="recent-book-card__title">{book.title}</h3>
            {book.author && book.author.toLowerCase() !== 'unknown' && <p className="recent-book-card__author">{book.author}</p>}
            <div className="recent-book-card__progress-section">
              <div className="recent-book-card__stats">
                <span>{t('recent.percentRead', progressPercentage)}</span>
                <span>{t('recent.lastOpened', lastOpenedLabel)}</span>
              </div>
              <div className="recent-book-card__progress" role="presentation" aria-hidden>
                <span style={{ width: `${progressPercentage}%` }} />
              </div>
            </div>
          </div>
        </button>

        {/* 右侧删除抽屉（管理模式悬停展开，压缩卡片主体） */}
        {managing && (
          <button
            type="button"
            className="recent-book-card__delete-drawer"
            onClick={(e) => {
              e.stopPropagation()
              onResetSingle?.(book.id)
            }}
          >
            <span className="material-symbols-outlined">delete</span>
          </button>
        )}
      </article>
    </div>
  )
}
