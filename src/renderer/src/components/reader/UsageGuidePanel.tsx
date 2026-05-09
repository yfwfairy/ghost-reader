import { useEffect } from 'react'
import { useTranslation } from '../../hooks/useTranslation'

type UsageGuidePanelProps = {
  onClose: () => void
}

// 将 [KEY] 格式的文本渲染为 <kbd> 元素
function renderWithKbd(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  const re = /\[([^\]]+)\]/g
  let match: RegExpExecArray | null
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    parts.push(<kbd key={match.index}>{match[1]}</kbd>)
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts
}

export function UsageGuidePanel({ onClose }: UsageGuidePanelProps) {
  const { t } = useTranslation()

  // ESC 关闭面板，阻止冒泡避免触发父层处理
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [onClose])

  // 操作说明卡片数据
  const cards = [
    {
      icon: 'swipe_vertical',
      titleKey: 'usageGuide.basicOps',
      descKey: 'usageGuide.basicOpsDesc',
    },
    {
      icon: 'fullscreen',
      titleKey: 'usageGuide.immersive',
      descKey: 'usageGuide.immersiveDesc',
    },
    {
      icon: 'play_circle',
      titleKey: 'usageGuide.autoScroll',
      descKey: 'usageGuide.autoScrollDesc',
    },
    {
      icon: 'palette',
      titleKey: 'usageGuide.appearance',
      descKey: 'usageGuide.appearanceDesc',
    },
  ] as const

  // 快捷键数据
  const shortcuts = [
    { labelKey: 'usageGuide.shortcutScroll', keys: 'PGUP / PGDN' },
    { labelKey: 'usageGuide.shortcutChapter', keys: '← / →' },
    { labelKey: 'usageGuide.shortcutImmersive', keys: '⌘/Ctrl + F' },
    { labelKey: 'usageGuide.shortcutBack', keys: '⌘/Ctrl + B' },
    { labelKey: 'usageGuide.shortcutFontSize', keys: '⌘/Ctrl + +/-' },
    { labelKey: 'usageGuide.shortcutAutoScroll', keys: 'Space' },
  ] as const

  return (
    <div
      className="usage-guide-backdrop"
      onMouseDown={(e) => {
        // 点击遮罩关闭，点击面板内部不关闭
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="usage-guide-panel">
        {/* 顶栏：标题 + 关闭按钮 */}
        <div className="usage-guide-panel__header">
          <h3>{t('usageGuide.title')}</h3>
          <button
            type="button"
            className="usage-guide-panel__close"
            onClick={onClose}
            aria-label="close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* 主体内容 */}
        <div className="usage-guide-panel__body">
          {/* 操作说明卡片 */}
          {cards.map((card) => (
            <div key={card.icon} className="usage-guide-panel__card">
              <span className="material-symbols-outlined usage-guide-panel__card-icon">
                {card.icon}
              </span>
              <div>
                <p className="usage-guide-panel__card-title">{t(card.titleKey)}</p>
                <p className="usage-guide-panel__card-desc">
                  {renderWithKbd(t(card.descKey))}
                </p>
              </div>
            </div>
          ))}

          {/* 快捷键列表 */}
          <div className="usage-guide-panel__shortcuts">
            <p className="usage-guide-panel__section-title">
              <span className="material-symbols-outlined">keyboard</span>
              {t('usageGuide.shortcuts')}
            </p>
            <div className="usage-guide-panel__shortcut-list">
              {shortcuts.map((row) => (
                <div key={row.labelKey} className="usage-guide-panel__shortcut-row">
                  <span>{t(row.labelKey)}</span>
                  <span className="usage-guide-panel__shortcut-keys">{row.keys}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
