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

export function ReaderDrawer({ open, activeTab, onTabChange, onClose, toc = [] }: ReaderDrawerProps) {
  const { t } = useTranslation()
  const { config, fallbackConfig, updateConfig } = useConfig()
  const activeConfig = config ?? fallbackConfig

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
                  <div className="chapter-list__meta">
                    <span className="chapter-list__count">
                      {toc.length} {t('drawer.chaptersTotal')}
                    </span>
                  </div>
                  <ul className="chapter-list">
                    {toc.map((entry, i) => (
                      <li key={entry.id} className="chapter-list__item">
                        <span className="chapter-list__number">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className="chapter-list__title">{entry.label}</span>
                      </li>
                    ))}
                  </ul>
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
