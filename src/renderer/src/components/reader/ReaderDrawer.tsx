import { useEffect, useRef, useState } from 'react'
import type { ColorTheme, FontFamily, TocEntry } from '@shared/types'
import { THEME_MAP } from '@shared/constants'
import { useConfig } from '../../hooks/useConfig'
import { useTranslation } from '../../hooks/useTranslation'

export type DrawerTab = 'chapters' | 'appearance'

type ReaderDrawerProps = {
  open: boolean
  activeTab: DrawerTab
  onTabChange: (tab: DrawerTab) => void
  onClose: () => void
  toc?: TocEntry[]
  chapterProgressMap?: Record<string, number>
  currentChapterHref?: string | null
  onChapterSelect?: (href: string) => void
}

const FONT_OPTIONS: { value: FontFamily; className: string }[] = [
  { value: 'Newsreader', className: 'font-picker__btn--newsreader' },
  { value: 'Manrope', className: 'font-picker__btn--manrope' },
  { value: 'Inter', className: 'font-picker__btn--inter' },
  { value: 'Lora', className: 'font-picker__btn--lora' },
  { value: 'Merriweather', className: 'font-picker__btn--merriweather' },
]

const THEME_KEYS: ColorTheme[] = [
  'obsidian', 'parchment', 'midnight', 'onyx',
  'ember', 'forest', 'ocean', 'slate',
]

// 判断是否为合集：顶层条目有 subitems 即为合集
function isAnthologyToc(toc: TocEntry[]): boolean {
  return toc.some((e) => (e.subitems?.length ?? 0) > 0)
}

// 在 toc 树中查找包含 href 的章节，返回 { bookIndex, chapterId }
function findChapterByHref(
  toc: TocEntry[],
  href: string | null | undefined,
  anthology: boolean,
): { bookIndex: number; chapterId: string | null } {
  if (!href) return { bookIndex: 0, chapterId: null }
  const curBase = href.split('#')[0]

  const matchesHref = (entry: TocEntry): boolean => {
    const eBase = entry.href.split('#')[0]
    return entry.href === href || eBase === curBase
  }

  const matchesInSubtree = (entry: TocEntry): boolean => {
    if (matchesHref(entry)) return true
    return entry.subitems?.some((s) => matchesInSubtree(s)) ?? false
  }

  if (anthology) {
    for (let bi = 0; bi < toc.length; bi++) {
      const chapters = toc[bi].subitems ?? []
      for (const ch of chapters) {
        if (matchesInSubtree(ch)) return { bookIndex: bi, chapterId: ch.id }
      }
    }
  } else {
    for (const ch of toc) {
      if (matchesInSubtree(ch)) return { bookIndex: 0, chapterId: ch.id }
    }
  }

  return { bookIndex: 0, chapterId: null }
}

export function ReaderDrawer({ open, activeTab, onTabChange, onClose, toc = [], chapterProgressMap, currentChapterHref, onChapterSelect }: ReaderDrawerProps) {
  const { t } = useTranslation()
  const { config, fallbackConfig, updateConfig } = useConfig()
  const activeConfig = config ?? fallbackConfig
  const activeItemRef = useRef<HTMLLIElement | null>(null)

  const [selectedBookIndex, setSelectedBookIndex] = useState(0)
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const anthology = isAnthologyToc(toc)
  const activeToc = anthology ? (toc[selectedBookIndex]?.subitems ?? []) : toc
  const sortedToc = sortOrder === 'asc' ? activeToc : [...activeToc].reverse()

  // 判断某个 entry 是否是当前阅读位置的祖先
  const isAncestorOfCurrent = (entry: TocEntry): boolean => {
    if (!currentChapterHref) return false
    const curBase = currentChapterHref.split('#')[0]
    const matchesHref = (e: TocEntry): boolean => {
      const eBase = e.href.split('#')[0]
      return e.href === currentChapterHref || eBase === curBase
    }
    // 自身匹配不算祖先
    if (matchesHref(entry)) return false
    const hasInSubtree = (e: TocEntry): boolean => {
      if (matchesHref(e)) return true
      return e.subitems?.some((s) => hasInSubtree(s)) ?? false
    }
    return entry.subitems?.some((s) => hasInSubtree(s)) ?? false
  }

  // 抽屉打开时：自动选中当前书+章节，滚动到可见区域
  useEffect(() => {
    if (!open || activeTab !== 'chapters') return

    const { bookIndex, chapterId } = findChapterByHref(toc, currentChapterHref, anthology)
    if (anthology) setSelectedBookIndex(bookIndex)
    setExpandedChapterId(chapterId)

    requestAnimationFrame(() => {
      activeItemRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' })
    })
  }, [open, activeTab])

  // 渲染 L2/L3 子项
  const renderSubItem = (entry: TocEntry, depth: 2 | 3): React.ReactNode => {
    const curBase = currentChapterHref?.split('#')[0]
    const eBase = entry.href.split('#')[0]
    const hasFragment = entry.href.includes('#')
    const isActive = currentChapterHref === entry.href || (!hasFragment && curBase === eBase)
    const isAncestor = isAncestorOfCurrent(entry)
    const hasChildren = depth === 2 && (entry.subitems?.length ?? 0) > 0
    const depthClass = depth === 2 ? 'chapter-subitems__item--l2' : 'chapter-subitems__item--l3'

    return (
      <li key={entry.id}>
        <div
          className={[
            'chapter-subitems__item',
            depthClass,
            isActive ? 'chapter-subitems__item--active' : '',
            isAncestor ? 'chapter-subitems__item--ancestor' : '',
          ].join(' ').trim()}
          onClick={() => onChapterSelect?.(entry.href)}
        >
          <span className="chapter-subitems__prefix" aria-hidden="true" />
          <span className="chapter-subitems__title">{entry.label}</span>
          {isActive && <span className="chapter-subitems__reading-label">{t('drawer.reading')}</span>}
        </div>
        {hasChildren && (
          <ul className="chapter-subitems chapter-subitems--nested">
            {entry.subitems!.map((sub) => renderSubItem(sub, 3))}
          </ul>
        )}
      </li>
    )
  }

  // context title 根据当前 tab 切换
  const contextTitle = activeTab === 'chapters'
    ? t('drawer.titleChapters')
    : t('drawer.titleAppearance')

  return (
    <>
      {/* 抽屉主体 */}
      <div className={`reader-drawer ${open ? 'reader-drawer--open' : ''}`}>
        {/* 头部：context title + close */}
        <div className="reader-drawer__header">
          <div className="reader-drawer__context-title">{contextTitle}</div>
          <button className="reader-drawer__close" type="button" onClick={onClose}>
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        {/* 标签页内容 */}
        <div className="reader-drawer__body">
          {activeTab === 'chapters' && (
            <div className="reader-drawer__pane">
              {toc.length > 0 ? (
                <>
                  {/* 置顶 meta 行：合集下拉 + 章节数 + 排序 */}
                  <div className="chapter-list__meta chapter-list__meta--sticky">
                    {anthology && (
                      <select
                        className="chapter-list__book-select"
                        value={selectedBookIndex}
                        onChange={(e) => {
                          setSelectedBookIndex(Number(e.target.value))
                          setExpandedChapterId(null)
                        }}
                      >
                        {toc.map((book, idx) => (
                          <option key={book.id} value={idx}>{book.label}</option>
                        ))}
                      </select>
                    )}
                    <div className="chapter-list__meta-right">
                      <span className="chapter-list__count">
                        {activeToc.length} {t('drawer.chaptersTotal')}
                      </span>
                      <button
                        type="button"
                        className={`chapter-list__sort-btn ${sortOrder === 'desc' ? 'chapter-list__sort-btn--active' : ''}`}
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">swap_vert</span>
                      </button>
                    </div>
                  </div>

                  {sortedToc.length > 0 ? (
                    <ul className="chapter-list">
                      {sortedToc.map((entry, i) => {
                        const baseHref = entry.href.split('#')[0]
                        const pct = chapterProgressMap?.[entry.href]
                          ?? chapterProgressMap?.[baseHref]
                          ?? 0
                        const curBase = currentChapterHref?.split('#')[0]
                        const isActive = currentChapterHref === entry.href
                          || currentChapterHref === baseHref
                          || curBase === baseHref
                        const hasChildren = (entry.subitems?.length ?? 0) > 0
                        const isExpanded = expandedChapterId === entry.id
                        const isAncestor = isAncestorOfCurrent(entry)

                        const radius = 9
                        const stroke = 2
                        const circumference = 2 * Math.PI * radius
                        const offset = circumference - (pct / 100) * circumference

                        return (
                          <li
                            key={entry.id}
                            ref={(isActive || isAncestor) ? activeItemRef : undefined}
                            className={[
                              'chapter-list__item',
                              isActive ? 'chapter-list__item--active' : '',
                              isAncestor ? 'chapter-list__item--ancestor' : '',
                            ].join(' ').trim()}
                          >
                            <div
                              className="chapter-list__item-row"
                              onClick={() => {
                                if (hasChildren) {
                                  setExpandedChapterId(isExpanded ? null : entry.id)
                                } else {
                                  onChapterSelect?.(entry.href)
                                }
                              }}
                            >
                              <span className="chapter-list__number">
                                {String(i + 1).padStart(2, '0')}
                              </span>
                              {hasChildren ? (
                                <span
                                  className={`chapter-list__chevron material-symbols-outlined ${isExpanded ? 'chapter-list__chevron--open' : ''}`}
                                  aria-hidden="true"
                                >
                                  chevron_right
                                </span>
                              ) : (
                                <span className="chapter-list__chevron chapter-list__chevron--placeholder" aria-hidden="true" />
                              )}
                              <span className="chapter-list__title">{entry.label}</span>
                              <svg className="chapter-list__ring" width="22" height="22" viewBox="0 0 22 22">
                                <circle cx="11" cy="11" r={radius} fill="none" stroke="rgba(var(--theme-text), 0.1)" strokeWidth={stroke} />
                                <circle cx="11" cy="11" r={radius} fill="none" stroke="rgba(var(--theme-text), 0.6)" strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(-90 11 11)" />
                              </svg>
                            </div>

                            {/* 手风琴子项 */}
                            {hasChildren && (
                              <div className={`chapter-subitems-wrap ${isExpanded ? 'chapter-subitems-wrap--open' : ''}`}>
                                <ul className="chapter-subitems">
                                  {entry.subitems!.map((sub) => renderSubItem(sub, 2))}
                                </ul>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="reader-drawer__placeholder">{t('reader.noChapters')}</p>
                  )}
                </>
              ) : (
                <p className="reader-drawer__placeholder">{t('reader.noChapters')}</p>
              )}
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="reader-drawer__pane reader-drawer__pane--appearance">
              {/* 字体选择 */}
              <div className="appearance-section">
                <label className="appearance-section__label">{t('appearance.typography')}</label>
                <div className="font-picker">
                  {FONT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`font-picker__btn ${opt.className} ${activeConfig.fontFamily === opt.value ? 'font-picker__btn--active' : ''}`}
                      onClick={() => void updateConfig({ fontFamily: opt.value })}
                    >
                      {opt.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* 字号 + Glass Intensity 两列 */}
              <div className="appearance-grid">
                {/* 字号 */}
                <div className="appearance-section">
                  <div className="appearance-section__header">
                    <label className="appearance-section__label">{t('appearance.fontSize')}</label>
                    <span className="appearance-section__value">{activeConfig.fontSize}PX</span>
                  </div>
                  <input
                    className="appearance-control__slider"
                    type="range"
                    min={10}
                    max={30}
                    step={1}
                    value={activeConfig.fontSize}
                    onChange={(e) => void updateConfig({ fontSize: Number(e.target.value) })}
                  />
                </div>

                {/* Glass Intensity */}
                <div className="appearance-section">
                  <div className="appearance-section__header">
                    <label className="appearance-section__label">{t('appearance.glassIntensity')}</label>
                    <span className="appearance-section__value">{activeConfig.glassIntensity}%</span>
                  </div>
                  <input
                    className="appearance-control__slider"
                    type="range"
                    min={20}
                    max={100}
                    step={1}
                    value={activeConfig.glassIntensity}
                    onChange={(e) => void updateConfig({ glassIntensity: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* 主题色 */}
              <div className="appearance-section">
                <label className="appearance-section__label">{t('appearance.colorTheme')}</label>
                <div className="theme-picker">
                  {THEME_KEYS.map((key) => {
                    const theme = THEME_MAP[key]
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`theme-swatch ${activeConfig.colorTheme === key ? 'theme-swatch--active' : ''}`}
                        style={{ backgroundColor: theme.bg }}
                        onClick={() => void updateConfig({ colorTheme: key })}
                        aria-label={key}
                      >
                        <span className="theme-swatch__letter" style={{ color: theme.text }}>A</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
