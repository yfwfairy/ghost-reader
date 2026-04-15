import { useState, type PropsWithChildren } from 'react'
import type { TocEntry } from '@shared/types'
import { useConfig } from '../../hooks/useConfig'
import { useTranslation } from '../../hooks/useTranslation'
import { ReaderDrawer, type DrawerTab } from './ReaderDrawer'

type ReaderLayoutProps = PropsWithChildren<{
  title: string
  meta?: string
  toc?: TocEntry[]
  progress?: number | null
  chapterProgressMap?: Record<string, number>
  currentChapterHref?: string | null
  immersive?: boolean
  onExitImmersive?: () => void
  onChapterSelect?: (href: string) => void
}>

export function ReaderLayout({
  title: _title,
  meta: _meta,
  toc,
  progress,
  chapterProgressMap,
  currentChapterHref,
  immersive = false,
  onExitImmersive,
  onChapterSelect,
  children,
}: ReaderLayoutProps) {
  const { t } = useTranslation()
  const { config, fallbackConfig } = useConfig()
  const activeConfig = config ?? fallbackConfig
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('chapters')

  // glassIntensity 映射为蒙版透明度（0-100 → 0-0.6）
  const maskOpacity = (activeConfig.glassIntensity / 100) * 0.6

  function handleNavClick(tab: DrawerTab) {
    if (drawerOpen && drawerTab === tab) {
      setDrawerOpen(false)
    } else {
      setDrawerTab(tab)
      setDrawerOpen(true)
    }
  }

  return (
    <section className="reader-page">
      <section className="reader-page__shell">
        <div
          className="reader-page__body"
          onClick={immersive ? onExitImmersive : undefined}
        >
          <div className="reader-page__content">{children}</div>
          {/* 内容蒙版，由 Glass Intensity 控制 */}
          <div
            className="reader-page__glass-mask"
            style={{ opacity: maskOpacity }}
          />
        </div>
      </section>

      {/* 抽屉弹窗 */}
      <ReaderDrawer
        open={drawerOpen && !immersive}
        activeTab={drawerTab}
        onTabChange={setDrawerTab}
        onClose={() => setDrawerOpen(false)}
        toc={toc}
        chapterProgressMap={chapterProgressMap}
        currentChapterHref={currentChapterHref}
        onChapterSelect={onChapterSelect ? (href: string) => {
          onChapterSelect(href)
          setDrawerOpen(false)
        } : undefined}
      />

      {/* 底部导航栏 */}
      <nav className={`reader-bottom-nav ${immersive ? 'reader-bottom-nav--hidden' : ''}`}>
        <div className="reader-bottom-nav__actions">
          <button
            className={`reader-bottom-nav__btn ${drawerOpen && drawerTab === 'chapters' ? 'reader-bottom-nav__btn--active' : ''}`}
            type="button"
            onClick={() => handleNavClick('chapters')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">menu_book</span>
            <span>{t('reader.chapters')}</span>
          </button>
          <button
            className={`reader-bottom-nav__btn ${drawerOpen && drawerTab === 'appearance' ? 'reader-bottom-nav__btn--active' : ''}`}
            type="button"
            onClick={() => handleNavClick('appearance')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">palette</span>
            <span>{t('reader.appearance')}</span>
          </button>
        </div>
        {progress != null && (
          <span className="reader-bottom-nav__progress">{progress}%</span>
        )}
      </nav>

      {/* 沉浸模式下浮动进度 */}
      {immersive && progress != null && (
        <span className="reader-immersive-progress">{progress}%</span>
      )}

      {/* 沉浸模式下顶部拖拽区域（替代被隐藏的标题栏） */}
      {immersive && (
        <div className="reader-immersive-drag-bar" />
      )}
    </section>
  )
}
