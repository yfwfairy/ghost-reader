import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from '../../hooks/useTranslation'

type MoreMenuProps = {
  autoScrollEnabled: boolean
  autoScrollSpeed: number
  autoScrollPaused?: boolean
  pauseOnHover: boolean
  onEnabledChange: (enabled: boolean) => void
  onSpeedChange: (speed: number) => void
  onPauseOnHoverChange: (value: boolean) => void
  onUsageGuide: () => void
}

const SPEED_OPTIONS = [
  { value: 2, key: 'autoScroll.speed.2' },
  { value: 3, key: 'autoScroll.speed.3' },
  { value: 4, key: 'autoScroll.speed.4' },
]

export function MoreMenu({
  autoScrollEnabled,
  autoScrollSpeed,
  autoScrollPaused,
  pauseOnHover,
  onEnabledChange,
  onSpeedChange,
  onPauseOnHoverChange,
  onUsageGuide,
}: MoreMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(null)

  useEffect(() => {
    setPortalTarget(document.getElementById('more-menu-slot'))
  }, [])

  // 打开时计算 popover 位置（基于触发按钮的 rect）
  useEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setPopoverPos({
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    })
  }, [open])

  // 点击外部关闭菜单
  useEffect(() => {
    if (!open) return

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        triggerRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return
      }
      setOpen(false)
    }

    document.addEventListener('mousedown', handleMouseDown, true)
    window.addEventListener('blur', () => setOpen(false))
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, true)
      window.removeEventListener('blur', () => setOpen(false))
    }
  }, [open])

  const handleUsageGuide = () => {
    onUsageGuide()
    setOpen(false)
  }

  const trigger = (
    <button
      type="button"
      className="more-menu__trigger"
      aria-label="More"
      ref={triggerRef}
      onClick={() => setOpen((prev) => !prev)}
    >
      <span className="material-symbols-outlined" aria-hidden="true">more_vert</span>
      {autoScrollEnabled && (
        <span
          className={[
            'more-menu__indicator',
            autoScrollPaused ? 'more-menu__indicator--paused' : '',
          ].join(' ').trim()}
        />
      )}
    </button>
  )

  const popover = open && popoverPos ? createPortal(
    <>
      <div className="more-menu__backdrop" onMouseDown={() => setOpen(false)} />
      <div
        className="more-menu__popover"
        ref={popoverRef}
        style={{ top: popoverPos.top, right: popoverPos.right }}
      >
        {/* 自动播放行 + 内联 switch */}
        <div className="more-menu__section">
          <div className="more-menu__row">
            <span className="material-symbols-outlined more-menu__row-icon" aria-hidden="true">play_circle</span>
            <span className="more-menu__row-label">{t('more.autoScroll')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={autoScrollEnabled}
              className={`settings-toggle__track${autoScrollEnabled ? ' settings-toggle__track--on' : ''}`}
              onClick={() => onEnabledChange(!autoScrollEnabled)}
            >
              <span className="settings-toggle__thumb" />
            </button>
          </div>

          {/* 展开子项 */}
          {autoScrollEnabled && (
            <div className="more-menu__sub-items">
              {/* 滚动速度 */}
              <div className="more-menu__sub-row">
                <span className="more-menu__sub-label">{t('autoScroll.speed')}</span>
                <div className="more-menu__speed-tags">
                  {SPEED_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`more-menu__speed-tag${autoScrollSpeed === opt.value ? ' more-menu__speed-tag--active' : ''}`}
                      onClick={() => onSpeedChange(opt.value)}
                    >
                      {t(opt.key)}
                    </button>
                  ))}
                </div>
              </div>

              {/* 鼠标移开滚动 */}
              <div className="more-menu__sub-row">
                <span className="more-menu__sub-label">{t('autoScroll.pauseOnHover')}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pauseOnHover}
                  className={`settings-toggle__track${pauseOnHover ? ' settings-toggle__track--on' : ''}`}
                  onClick={() => onPauseOnHoverChange(!pauseOnHover)}
                >
                  <span className="settings-toggle__thumb" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="more-menu__divider" />

        {/* 使用说明 */}
        <button type="button" className="more-menu__item" onClick={handleUsageGuide}>
          <span className="material-symbols-outlined" aria-hidden="true">help_outline</span>
          {t('more.usageGuide')}
        </button>
      </div>
    </>,
    document.body,
  ) : null

  return (
    <>
      {portalTarget ? createPortal(trigger, portalTarget) : trigger}
      {popover}
    </>
  )
}
