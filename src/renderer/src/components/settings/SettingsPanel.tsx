import { useEffect, useRef, useState } from 'react'
import type { AppConfig, Locale } from '@shared/types'
import { useTranslation } from '../../hooks/useTranslation'

type SettingsPanelProps = {
  config: AppConfig
  onSave: (patch: Partial<AppConfig>) => Promise<unknown>
  onClose: () => void
}

const NAV_ITEMS = [
  { id: 'appearance', icon: 'palette' },
  { id: 'language', icon: 'translate' },
  { id: 'shortcuts', icon: 'keyboard' },
] as const

type SectionId = (typeof NAV_ITEMS)[number]['id']

const LANGUAGES: { locale: Locale; native: string; key: string }[] = [
  { locale: 'en', native: 'English', key: 'settings.lang.en' },
  { locale: 'zh', native: '简体中文', key: 'settings.lang.zh' },
  { locale: 'zh-TW', native: '繁體中文', key: 'settings.lang.zh-TW' },
]

export function SettingsPanel({ config, onSave, onClose }: SettingsPanelProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(config)
  const [activeSection, setActiveSection] = useState<SectionId>('appearance')

  // ESC 关闭设置面板（阻止冒泡，防止 App 级 ESC 同时触发）
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const appearanceRef = useRef<HTMLElement>(null)
  const languageRef = useRef<HTMLElement>(null)
  const shortcutsRef = useRef<HTMLElement>(null)
  const isScrollingRef = useRef(false)

  const sectionRefs: Record<SectionId, React.RefObject<HTMLElement | null>> = {
    appearance: appearanceRef,
    language: languageRef,
    shortcuts: shortcutsRef,
  }

  useEffect(() => {
    setDraft(config)
  }, [config])

  // Scroll spy
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      if (isScrollingRef.current) return

      const scrollTop = container.scrollTop
      let active: SectionId = 'appearance'

      for (const item of NAV_ITEMS) {
        const el = sectionRefs[item.id].current
        if (el) {
          const offset = el.offsetTop - container.offsetTop
          if (scrollTop >= offset - 80) {
            active = item.id
          }
        }
      }
      setActiveSection(active)
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  })

  function handleNavClick(id: SectionId) {
    const el = sectionRefs[id].current
    if (!el) return

    isScrollingRef.current = true
    setActiveSection(id)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })

    setTimeout(() => {
      isScrollingRef.current = false
    }, 500)
  }

  // 实时保存：选中后立即持久化
  function applyChange(patch: Partial<AppConfig>) {
    const next = { ...draft, ...patch }
    setDraft(next)
    void onSave(patch)
  }

  // 导航项的翻译 key 映射
  const navLabelKey: Record<SectionId, string> = {
    appearance: 'settings.appearance',
    language: 'settings.language',
    shortcuts: 'settings.shortcuts',
  }

  return (
    <div
      className="settings-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section className="settings-panel">
        {/* 左侧导航 */}
        <div className="settings-panel__sidebar">
          <p className="settings-panel__sidebar-title">{t('sidebar.settings')}</p>
          <nav className="settings-panel__nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`settings-panel__nav-item ${activeSection === item.id ? 'settings-panel__nav-item--active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{t(navLabelKey[item.id])}</span>
              </button>
            ))}
          </nav>
          <div className="settings-panel__sidebar-footer">
            <p className="settings-panel__version-label">Ghost Reader</p>
            <p className="settings-panel__version">v0.1.0-obsidian</p>
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="settings-panel__main">
          {/* 固定顶部 header */}
          <div className="settings-panel__content-header">
            <div>
              <h2>{t('settings.title')}</h2>
              <p className="settings-panel__summary">{t('settings.summary')}</p>
            </div>
            <button
              className="settings-panel__close"
              onClick={onClose}
              aria-label={t('settings.closeAria')}
            >
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
            </button>
          </div>

          {/* 可滚动内容区 */}
          <div className="settings-panel__content" ref={scrollContainerRef}>
            {/* Interface Theme */}
            <section className="settings-panel__section" ref={appearanceRef}>
              <div className="settings-theme-header">
                <h3>{t('settings.theme')}</h3>
                <label className="settings-toggle">
                  <span className="settings-toggle__label">{t('settings.followSystem')}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={draft.appearanceFollowSystem}
                    className={`settings-toggle__track ${draft.appearanceFollowSystem ? 'settings-toggle__track--on' : ''}`}
                    onClick={() => applyChange({ appearanceFollowSystem: !draft.appearanceFollowSystem })}
                  >
                    <span className="settings-toggle__thumb" />
                  </button>
                </label>
              </div>
              <div className={`settings-theme-grid ${draft.appearanceFollowSystem ? 'settings-theme-grid--collapsed' : ''}`}>
                <button
                  type="button"
                  className={`settings-theme-card ${draft.appearance === 'dark' ? 'settings-theme-card--active' : ''}`}
                  onClick={() => applyChange({ appearance: 'dark' })}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    dark_mode
                  </span>
                  <span className="settings-theme-card__label">{t('settings.themeObsidian')}</span>
                </button>
                <button
                  type="button"
                  className={`settings-theme-card ${draft.appearance === 'light' ? 'settings-theme-card--active' : ''}`}
                  onClick={() => applyChange({ appearance: 'light' })}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">
                    light_mode
                  </span>
                  <span className="settings-theme-card__label">{t('settings.themeLunar')}</span>
                </button>
              </div>
            </section>

            {/* Display Language */}
            <section className="settings-panel__section" ref={languageRef}>
              <h3>{t('settings.langLabel')}</h3>
              <div className="settings-lang-list">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.locale}
                    className={`settings-lang-row ${draft.language === lang.locale ? 'settings-lang-row--active' : ''}`}
                    onClick={() => applyChange({ language: lang.locale })}
                  >
                    <span className="settings-lang-row__current">{t(lang.key)}</span>
                    <span className="settings-lang-row__native">{lang.native}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Reading Shortcuts */}
            <section className="settings-panel__section" ref={shortcutsRef}>
              <h3>{t('settings.shortcuts.title')}</h3>
              <div className="settings-shortcut-list">
                <div className="settings-shortcut-row">
                  <span>{t('settings.shortcutPage')}</span>
                  <div className="settings-shortcut-keys">
                    <kbd>PGUP</kbd>
                    <kbd>PGDN</kbd>
                  </div>
                </div>
                <div className="settings-shortcut-row">
                  <span>{t('settings.shortcutChapter')}</span>
                  <div className="settings-shortcut-keys">
                    <kbd>←</kbd>
                    <kbd>→</kbd>
                  </div>
                </div>
                <div className="settings-shortcut-row">
                  <span>{t('settings.shortcutHide')}</span>
                  <div className="settings-shortcut-keys">
                    <kbd>ESC</kbd>
                  </div>
                </div>
                <div className="settings-shortcut-row">
                  <span>{t('settings.shortcutFullscreen')}</span>
                  <div className="settings-shortcut-keys">
                    <kbd>⌘/Ctrl</kbd><span>+</span><kbd>F</kbd>
                  </div>
                </div>
                <div className="settings-shortcut-row">
                  <span>{t('settings.shortcutBack')}</span>
                  <div className="settings-shortcut-keys">
                    <kbd>⌘/Ctrl</kbd><span>+</span><kbd>B</kbd>
                  </div>
                </div>
                <div className="settings-shortcut-row">
                  <span>{t('settings.shortcutFontSize')}</span>
                  <div className="settings-shortcut-keys">
                    <kbd>⌘/Ctrl</kbd><span>+</span><kbd>+</kbd><span>/</span><kbd>-</kbd>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="settings-panel__footer">
              <div className="settings-panel__footer-links">
                <span>{t('settings.privacyPolicy')}</span>
                <span>{t('settings.termsOfService')}</span>
              </div>
            </footer>
          </div>
        </div>
      </section>
    </div>
  )
}
