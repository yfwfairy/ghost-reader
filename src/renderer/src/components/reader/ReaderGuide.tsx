import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'

type ReaderGuideProps = {
  immersive: boolean
  bookFormat?: 'txt' | 'epub'
  onComplete: () => void
}

// 聚光灯步骤定义
type SpotlightStep = {
  target: string          // CSS 选择器
  titleKey: string
  descKey: string
  position: 'below' | 'above'
  interactive?: boolean   // 需要用户点击目标元素
}

// 沉浸退出步骤（特殊，无目标元素）
type ImmersiveExitStep = {
  special: 'immersive-exit'
  titleKey: string
  descKey: string
}

// 快捷键卡片步骤
type ShortcutsStep = {
  special: 'shortcuts'
}

type GuideStep = SpotlightStep | ImmersiveExitStep | ShortcutsStep

const STEPS: GuideStep[] = [
  { target: '.app-frame__pin', titleKey: 'guide.pinTitle', descKey: 'guide.pinDesc', position: 'below' },
  { target: '.app-frame__back', titleKey: 'guide.backTitle', descKey: 'guide.backDesc', position: 'below' },
  { target: '.app-frame__fullscreen', titleKey: 'guide.fullscreenTitle', descKey: 'guide.fullscreenDesc', position: 'below', interactive: true },
  { special: 'immersive-exit', titleKey: 'guide.immersiveExitTitle', descKey: 'guide.immersiveExitDesc' },
  { target: '.reader-bottom-nav__btn:first-child', titleKey: 'guide.chaptersTitle', descKey: 'guide.chaptersDesc', position: 'above' },
  { target: '.reader-bottom-nav__btn:last-child', titleKey: 'guide.appearanceTitle', descKey: 'guide.appearanceDesc', position: 'above' },
  { special: 'shortcuts' },
]

// 快捷键卡片内容
const SHORTCUT_STEPS = [
  { icon: 'swipe_vertical', titleKey: 'guide.step1Title', descKey: 'guide.step1Desc' },
  { icon: 'keyboard', titleKey: 'guide.step2Title', descKey: 'guide.step2Desc' },
]

// 将 i18n 文案中 [KEY] 标记解析为内联 <kbd> 元素
function renderWithKbd(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  const re = /\[([^\]]+)\]/g
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    parts.push(<kbd key={match.index}>{match[1]}</kbd>)
    lastIndex = re.lastIndex
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }
  return parts
}

function isSpotlight(step: GuideStep): step is SpotlightStep {
  return 'target' in step
}

function isImmersiveExit(step: GuideStep): step is ImmersiveExitStep {
  return 'special' in step && step.special === 'immersive-exit'
}

function isShortcuts(step: GuideStep): step is ShortcutsStep {
  return 'special' in step && step.special === 'shortcuts'
}

export function ReaderGuide({ immersive, bookFormat, onComplete }: ReaderGuideProps) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [shortcutStep, setShortcutStep] = useState(0)
  const [animating, setAnimating] = useState(false)
  const prevImmersiveRef = useRef(immersive)

  const current = STEPS[step]

  // 追踪目标元素位置
  const updateRect = useCallback(() => {
    if (isSpotlight(current)) {
      const el = document.querySelector(current.target)
      if (el) {
        setRect(el.getBoundingClientRect())
      }
    } else {
      setRect(null)
    }
  }, [current])

  useEffect(() => {
    // 双层 rAF 确保目标元素布局完成后再获取位置
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(updateRect)
    })
    window.addEventListener('resize', updateRect)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', updateRect)
    }
  }, [updateRect])

  // 步骤 2→3：用户点击全屏按钮 → immersive 变 true → 进入沉浸退出步骤
  // 步骤 3→4：用户退出沉浸 → immersive 变 false → 进入底部按钮步骤
  useEffect(() => {
    const prev = prevImmersiveRef.current
    prevImmersiveRef.current = immersive

    if (!prev && immersive && step === 2) {
      // 进入沉浸模式，推进到步骤 3
      setStep(3)
    } else if (prev && !immersive && step === 3) {
      // 退出沉浸模式，推进到步骤 4
      setStep(4)
    }
  }, [immersive, step])

  // ESC 拦截（非交互步骤跳过引导，交互步骤中不拦截）
  useEffect(() => {
    const curr = STEPS[step]
    // 沉浸退出步骤中不拦截 ESC（让 ESC 触发退出沉浸）
    if (isImmersiveExit(curr)) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onComplete()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [step, onComplete])

  function goNext() {
    const nextStep = step + 1
    if (nextStep < STEPS.length) {
      setStep(nextStep)
    } else {
      onComplete()
    }
  }

  function goNextShortcut() {
    if (shortcutStep < SHORTCUT_STEPS.length - 1) {
      setAnimating(true)
      setTimeout(() => {
        setShortcutStep(shortcutStep + 1)
        setAnimating(false)
      }, 150)
    } else {
      onComplete()
    }
  }

  // 聚光灯步骤
  if (isSpotlight(current)) {
    const pad = 6
    const holeStyle = rect ? {
      top: rect.top - pad,
      left: rect.left - pad,
      width: rect.width + pad * 2,
      height: rect.height + pad * 2,
    } : undefined

    // tooltip 定位 — 右侧按钮右对齐，避免被视口截断
    const tooltipStyle: React.CSSProperties = {}
    let isRightSide = false
    if (rect) {
      const centerX = rect.left + rect.width / 2
      isRightSide = centerX > window.innerWidth / 2

      if (current.position === 'below') {
        tooltipStyle.top = rect.bottom + 14
        if (isRightSide) {
          // 右侧按钮：tooltip 右边缘对齐按钮右边缘
          tooltipStyle.right = window.innerWidth - rect.right
        } else {
          tooltipStyle.left = centerX
          tooltipStyle.transform = 'translateX(-50%)'
        }
      } else {
        tooltipStyle.bottom = window.innerHeight - rect.top + 14
        if (isRightSide) {
          tooltipStyle.right = window.innerWidth - rect.right
        } else {
          tooltipStyle.left = centerX
          tooltipStyle.transform = 'translateX(-50%)'
        }
      }
    }

    return (
      <>
        {/* 非交互步骤：全屏点击阻断；交互步骤：放开点击 */}
        {!current.interactive && <div className="spotlight-blocker" />}

        {/* 聚光灯孔洞 */}
        {holeStyle && (
          <div className="spotlight-hole" style={holeStyle} />
        )}

        {/* Tooltip */}
        <div
          className={`spotlight-tooltip spotlight-tooltip--${current.position}${isRightSide ? ' spotlight-tooltip--right' : ''}`}
          style={tooltipStyle}
        >
          <div className="spotlight-tooltip__body">
            <h4 className="spotlight-tooltip__title">{t(current.titleKey)}</h4>
            <p className="spotlight-tooltip__desc">{renderWithKbd(t(current.descKey))}</p>
          </div>
          <div className="spotlight-tooltip__actions">
            <button
              type="button"
              className="spotlight-tooltip__skip"
              onClick={onComplete}
            >
              {t('guide.skip')}
            </button>
            {current.interactive ? (
              <span className="spotlight-tooltip__hint">{t('guide.tryIt')}</span>
            ) : (
              <button
                type="button"
                className="spotlight-tooltip__btn"
                onClick={goNext}
              >
                {t('guide.next')}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            )}
          </div>
        </div>
      </>
    )
  }

  // 沉浸退出步骤 — 根据书籍格式显示不同引导
  if (isImmersiveExit(current)) {
    const isEpub = bookFormat === 'epub'
    const descKey = isEpub ? 'guide.immersiveExitDescEpub' : 'guide.immersiveExitDescTxt'

    return (
      <div className="immersive-exit-guide">
        {/* epub：高亮可点击退出的边缘区域 */}
        {isEpub && (
          <>
            <div className="immersive-exit-guide__edge immersive-exit-guide__edge--left" />
            <div className="immersive-exit-guide__edge immersive-exit-guide__edge--right" />
            <div className="immersive-exit-guide__edge immersive-exit-guide__edge--bottom" />
          </>
        )}
        <div className="immersive-exit-guide__card">
          <span className="immersive-exit-guide__icon material-symbols-outlined">
            fullscreen_exit
          </span>
          <h4 className="immersive-exit-guide__title">{t(current.titleKey)}</h4>
          <p className="immersive-exit-guide__desc">{renderWithKbd(t(descKey))}</p>
        </div>
      </div>
    )
  }

  // 快捷键卡片步骤
  if (isShortcuts(current)) {
    const sc = SHORTCUT_STEPS[shortcutStep]
    const isLastShortcut = shortcutStep === SHORTCUT_STEPS.length - 1

    return (
      <div className="reader-guide">
        <div className={`reader-guide__card ${animating ? 'reader-guide__card--exit' : 'reader-guide__card--enter'}`}>
          {!isLastShortcut && (
            <button
              type="button"
              className="reader-guide__skip"
              onClick={onComplete}
            >
              {t('guide.skip')}
            </button>
          )}

          <span className="reader-guide__icon material-symbols-outlined">
            {sc.icon}
          </span>

          <h3 className="reader-guide__title">{t(sc.titleKey)}</h3>
          <p className="reader-guide__desc">{renderWithKbd(t(sc.descKey))}</p>

          <div className="reader-guide__nav">
            <div className="reader-guide__dots">
              {SHORTCUT_STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`reader-guide__dot ${i === shortcutStep ? 'reader-guide__dot--active' : ''}`}
                />
              ))}
            </div>
            <button
              type="button"
              className="reader-guide__btn"
              onClick={goNextShortcut}
            >
              {isLastShortcut ? t('guide.finish') : t('guide.next')}
              {!isLastShortcut && (
                <span className="material-symbols-outlined reader-guide__btn-arrow">arrow_forward</span>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
