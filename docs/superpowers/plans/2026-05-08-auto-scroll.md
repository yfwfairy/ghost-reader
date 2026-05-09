# 自动播放 & 更多菜单 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在阅读器右上角新增「更多」按钮，点击弹出菜单（自动播放设置 + 使用说明），实现 RAF 驱动的自动滚动引擎，以及将快捷键信息从 SettingsPanel 迁移到使用说明面板。

**Architecture:** MoreMenu 是轻量 popover 菜单组件；AutoScrollPanel 和 UsageGuidePanel 是 overlay 面板；useAutoScroll 是核心滚动引擎 hook（RAF 循环）。状态由 ReaderPage 以 useState 持有并通过 props 传递。AppFrame 新增 slot 用于插入更多按钮。

**Tech Stack:** React 19, TypeScript, Material Symbols, CSS BEM, Vitest + Testing Library

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/renderer/src/hooks/useAutoScroll.ts` | 核心自动滚动 hook（RAF 循环、暂停/恢复） |
| `src/renderer/src/components/reader/MoreMenu.tsx` | 更多按钮 + popover 菜单 |
| `src/renderer/src/components/reader/AutoScrollPanel.tsx` | 自动播放设置面板 |
| `src/renderer/src/components/reader/UsageGuidePanel.tsx` | 使用说明面板 |
| `src/renderer/src/components/reader/ReaderPage.tsx` | 新增自动播放状态 + 集成 |
| `src/renderer/src/components/reader/ReaderLayout.tsx` | 底部导航新增更多按钮（与章节、外观按钮同排） |
| `src/renderer/src/hooks/useKeyboardShortcuts.ts` | 新增空格键处理 |
| `src/renderer/src/components/reader/ReaderGuide.tsx` | 新增自动播放相关引导内容 |
| `src/renderer/src/components/settings/SettingsPanel.tsx` | 删除 Shortcuts tab |
| `src/shared/i18n/en.ts` | 新增 i18n keys |
| `src/shared/i18n/zh.ts` | 新增 i18n keys |
| `src/shared/i18n/zh-TW.ts` | 新增 i18n keys |
| `src/renderer/src/styles/global.css` | 新增菜单/面板/指示器样式 |
| `tests/renderer/auto-scroll.test.ts` | useAutoScroll hook 单元测试 |
| `tests/renderer/more-menu.test.tsx` | MoreMenu 组件测试 |

---

## Task 1: useAutoScroll Hook

**Files:**
- Create: `src/renderer/src/hooks/useAutoScroll.ts`
- Create: `tests/renderer/auto-scroll.test.ts`

- [ ] **Step 1: 编写 useAutoScroll hook 的失败测试**

```typescript
// tests/renderer/auto-scroll.test.ts
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoScroll } from '../../src/renderer/src/hooks/useAutoScroll'

describe('useAutoScroll', () => {
  let rafCallbacks: FrameRequestCallback[]
  let rafId: number

  beforeEach(() => {
    rafCallbacks = []
    rafId = 0
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb)
      return ++rafId
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function flushRaf() {
    const cbs = [...rafCallbacks]
    rafCallbacks = []
    cbs.forEach((cb) => cb(performance.now()))
  }

  it('does not start scrolling when disabled', () => {
    const scrollEl = document.createElement('div')
    const ref = { current: scrollEl }
    const onChapterEnd = vi.fn()

    renderHook(() =>
      useAutoScroll({ enabled: false, speed: 3, pauseOnHover: false, scrollRef: ref, onChapterEnd }),
    )

    expect(window.requestAnimationFrame).not.toHaveBeenCalled()
  })

  it('starts RAF loop when enabled', () => {
    const scrollEl = document.createElement('div')
    const ref = { current: scrollEl }
    const onChapterEnd = vi.fn()

    renderHook(() =>
      useAutoScroll({ enabled: true, speed: 3, pauseOnHover: false, scrollRef: ref, onChapterEnd }),
    )

    expect(window.requestAnimationFrame).toHaveBeenCalled()
  })

  it('increments scrollTop each frame based on speed', () => {
    const scrollEl = document.createElement('div')
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 2000, configurable: true })
    Object.defineProperty(scrollEl, 'clientHeight', { value: 500, configurable: true })
    scrollEl.scrollTop = 0
    const ref = { current: scrollEl }
    const onChapterEnd = vi.fn()

    renderHook(() =>
      useAutoScroll({ enabled: true, speed: 3, pauseOnHover: false, scrollRef: ref, onChapterEnd }),
    )

    flushRaf()
    expect(scrollEl.scrollTop).toBeGreaterThan(0)
  })

  it('calls onChapterEnd when scrolled to bottom', () => {
    const scrollEl = document.createElement('div')
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 1000, configurable: true })
    Object.defineProperty(scrollEl, 'clientHeight', { value: 500, configurable: true })
    scrollEl.scrollTop = 499
    const ref = { current: scrollEl }
    const onChapterEnd = vi.fn()

    renderHook(() =>
      useAutoScroll({ enabled: true, speed: 3, pauseOnHover: false, scrollRef: ref, onChapterEnd }),
    )

    flushRaf()
    expect(onChapterEnd).toHaveBeenCalledTimes(1)
  })

  it('toggle pauses and resumes scrolling', () => {
    const scrollEl = document.createElement('div')
    Object.defineProperty(scrollEl, 'scrollHeight', { value: 2000, configurable: true })
    Object.defineProperty(scrollEl, 'clientHeight', { value: 500, configurable: true })
    scrollEl.scrollTop = 0
    const ref = { current: scrollEl }
    const onChapterEnd = vi.fn()

    const { result } = renderHook(() =>
      useAutoScroll({ enabled: true, speed: 3, pauseOnHover: false, scrollRef: ref, onChapterEnd }),
    )

    expect(result.current.paused).toBe(false)

    act(() => result.current.toggle())
    expect(result.current.paused).toBe(true)

    flushRaf()
    expect(scrollEl.scrollTop).toBe(0) // 暂停时不滚动

    act(() => result.current.toggle())
    expect(result.current.paused).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/yang/AiProjects/ghost-reader && bunx vitest run tests/renderer/auto-scroll.test.ts`
Expected: FAIL with "Cannot find module useAutoScroll"

- [ ] **Step 3: 实现 useAutoScroll hook**

```typescript
// src/renderer/src/hooks/useAutoScroll.ts
import { useCallback, useEffect, useRef, useState } from 'react'

type UseAutoScrollOptions = {
  enabled: boolean
  speed: number // 1-5
  pauseOnHover: boolean
  scrollRef: React.RefObject<HTMLElement | null>
  onChapterEnd: () => void
}

type UseAutoScrollReturn = {
  paused: boolean
  pause: () => void
  resume: () => void
  toggle: () => void
}

const SPEED_MAP: Record<number, number> = {
  1: 0.3,
  2: 0.6,
  3: 1.0,
  4: 1.8,
  5: 3.0,
}

export function useAutoScroll({
  enabled,
  speed,
  pauseOnHover,
  scrollRef,
  onChapterEnd,
}: UseAutoScrollOptions): UseAutoScrollReturn {
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const hoverPausedRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const onChapterEndRef = useRef(onChapterEnd)
  const speedRef = useRef(speed)
  const chapterEndFiredRef = useRef(false)

  useEffect(() => { onChapterEndRef.current = onChapterEnd }, [onChapterEnd])
  useEffect(() => { speedRef.current = speed }, [speed])

  // 重置暂停状态当 enabled 变化
  useEffect(() => {
    if (enabled) {
      setPaused(false)
      pausedRef.current = false
      chapterEndFiredRef.current = false
    }
  }, [enabled])

  // RAF 循环
  useEffect(() => {
    if (!enabled) return

    function tick() {
      const el = scrollRef.current
      if (!el) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      if (!pausedRef.current && !hoverPausedRef.current) {
        const delta = SPEED_MAP[speedRef.current] ?? 1.0
        el.scrollTop += delta

        const maxScroll = el.scrollHeight - el.clientHeight
        if (el.scrollTop >= maxScroll - 1 && !chapterEndFiredRef.current) {
          chapterEndFiredRef.current = true
          onChapterEndRef.current()
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [enabled, scrollRef])

  // 鼠标 hover 暂停
  useEffect(() => {
    if (!enabled || !pauseOnHover) {
      hoverPausedRef.current = false
      return
    }

    const el = scrollRef.current
    if (!el) return

    function handleEnter() { hoverPausedRef.current = true }
    function handleLeave() { hoverPausedRef.current = false }

    el.addEventListener('mouseenter', handleEnter)
    el.addEventListener('mouseleave', handleLeave)
    return () => {
      el.removeEventListener('mouseenter', handleEnter)
      el.removeEventListener('mouseleave', handleLeave)
      hoverPausedRef.current = false
    }
  }, [enabled, pauseOnHover, scrollRef])

  // 章节切换后重置 chapterEndFired
  useEffect(() => {
    if (enabled) {
      chapterEndFiredRef.current = false
    }
  })

  const pause = useCallback(() => {
    setPaused(true)
    pausedRef.current = true
  }, [])

  const resume = useCallback(() => {
    setPaused(false)
    pausedRef.current = false
    chapterEndFiredRef.current = false
  }, [])

  const toggle = useCallback(() => {
    if (pausedRef.current) {
      setPaused(false)
      pausedRef.current = false
      chapterEndFiredRef.current = false
    } else {
      setPaused(true)
      pausedRef.current = true
    }
  }, [])

  return { paused, pause, resume, toggle }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/yang/AiProjects/ghost-reader && bunx vitest run tests/renderer/auto-scroll.test.ts`
Expected: 5 tests PASS

- [ ] **Step 5: 提交**

```bash
git add src/renderer/src/hooks/useAutoScroll.ts tests/renderer/auto-scroll.test.ts
git commit -m "feat: 实现 useAutoScroll hook — RAF 驱动平滑滚动引擎"
```

---

## Task 2: i18n 键值

**Files:**
- Modify: `src/shared/i18n/en.ts`
- Modify: `src/shared/i18n/zh.ts`
- Modify: `src/shared/i18n/zh-TW.ts`

- [ ] **Step 1: 添加新的 i18n 键值到三个语言文件**

**en.ts** — 在 `'guide.finish'` 之前插入：

```typescript
// 更多菜单
'more.autoScroll': 'Auto Scroll',
'more.usageGuide': 'Usage Guide',

// 自动播放面板
'autoScroll.title': 'Auto Scroll',
'autoScroll.enable': 'Auto Scroll',
'autoScroll.speed': 'Speed',
'autoScroll.speed.1': 'Very Slow',
'autoScroll.speed.2': 'Slow',
'autoScroll.speed.3': 'Medium',
'autoScroll.speed.4': 'Fast',
'autoScroll.speed.5': 'Very Fast',
'autoScroll.pauseOnHover': 'Pause when mouse hovers',

// 使用说明面板
'usageGuide.title': 'Usage Guide',
'usageGuide.basicOps': 'Basic Operations',
'usageGuide.basicOpsDesc': 'Scroll to read, use [PageUp]/[PageDown] for line scrolling.',
'usageGuide.shortcuts': 'Keyboard Shortcuts',
'usageGuide.shortcutScroll': 'Scroll line',
'usageGuide.shortcutChapter': 'Previous / Next chapter',
'usageGuide.shortcutImmersive': 'Toggle immersive mode',
'usageGuide.shortcutBack': 'Back to bookshelf',
'usageGuide.shortcutFontSize': 'Font size +/−',
'usageGuide.shortcutAutoScroll': 'Pause / Resume auto scroll',
'usageGuide.immersive': 'Immersive Mode',
'usageGuide.immersiveDesc': 'Press [⌘/Ctrl]+[F] or tap the fullscreen button to enter.\nClick the reading area or press [ESC] to exit.',
'usageGuide.autoScroll': 'Auto Scroll',
'usageGuide.autoScrollDesc': 'Open via ⋯ button → Auto Scroll.\nPress [Space] to pause / resume.',
'usageGuide.appearance': 'Appearance',
'usageGuide.appearanceDesc': 'Open Ghost panel from bottom bar to adjust font, theme, margin, and opacity.',
```

**zh.ts** — 对应中文：

```typescript
// 更多菜单
'more.autoScroll': '自动播放设置',
'more.usageGuide': '使用说明',

// 自动播放面板
'autoScroll.title': '自动播放',
'autoScroll.enable': '自动播放',
'autoScroll.speed': '速度',
'autoScroll.speed.1': '极慢',
'autoScroll.speed.2': '慢',
'autoScroll.speed.3': '中',
'autoScroll.speed.4': '快',
'autoScroll.speed.5': '极快',
'autoScroll.pauseOnHover': '鼠标移开后滚动',

// 使用说明面板
'usageGuide.title': '使用说明',
'usageGuide.basicOps': '基础操作',
'usageGuide.basicOpsDesc': '滚动阅读，使用 [PageUp]/[PageDown] 逐行滚动。',
'usageGuide.shortcuts': '快捷键',
'usageGuide.shortcutScroll': '逐行滚动',
'usageGuide.shortcutChapter': '上/下一章',
'usageGuide.shortcutImmersive': '切换沉浸模式',
'usageGuide.shortcutBack': '返回书架',
'usageGuide.shortcutFontSize': '字号加减',
'usageGuide.shortcutAutoScroll': '暂停/恢复自动播放',
'usageGuide.immersive': '沉浸模式',
'usageGuide.immersiveDesc': '按 [⌘/Ctrl]+[F] 或点击全屏按钮进入。\n点击阅读区域或按 [ESC] 退出。',
'usageGuide.autoScroll': '自动播放',
'usageGuide.autoScrollDesc': '通过 ⋯ 按钮 → 自动播放设置 开启。\n按 [空格] 暂停/恢复。',
'usageGuide.appearance': '外观设置',
'usageGuide.appearanceDesc': '从底部栏打开 Ghost 面板调整字体、主题色、边距和透明度。',
```

**zh-TW.ts** — 对应繁体：

```typescript
// 更多菜单
'more.autoScroll': '自動播放設定',
'more.usageGuide': '使用說明',

// 自动播放面板
'autoScroll.title': '自動播放',
'autoScroll.enable': '自動播放',
'autoScroll.speed': '速度',
'autoScroll.speed.1': '極慢',
'autoScroll.speed.2': '慢',
'autoScroll.speed.3': '中',
'autoScroll.speed.4': '快',
'autoScroll.speed.5': '極快',
'autoScroll.pauseOnHover': '滑鼠移開後捲動',

// 使用说明面板
'usageGuide.title': '使用說明',
'usageGuide.basicOps': '基礎操作',
'usageGuide.basicOpsDesc': '捲動閱讀，使用 [PageUp]/[PageDown] 逐行捲動。',
'usageGuide.shortcuts': '快捷鍵',
'usageGuide.shortcutScroll': '逐行捲動',
'usageGuide.shortcutChapter': '上/下一章',
'usageGuide.shortcutImmersive': '切換沉浸模式',
'usageGuide.shortcutBack': '返回書架',
'usageGuide.shortcutFontSize': '字號加減',
'usageGuide.shortcutAutoScroll': '暫停/恢復自動播放',
'usageGuide.immersive': '沉浸模式',
'usageGuide.immersiveDesc': '按 [⌘/Ctrl]+[F] 或點擊全螢幕按鈕進入。\n點擊閱讀區域或按 [ESC] 退出。',
'usageGuide.autoScroll': '自動播放',
'usageGuide.autoScrollDesc': '透過 ⋯ 按鈕 → 自動播放設定 開啟。\n按 [空格] 暫停/恢復。',
'usageGuide.appearance': '外觀設定',
'usageGuide.appearanceDesc': '從底部欄開啟 Ghost 面板調整字體、主題色、邊距和透明度。',
```

- [ ] **Step 2: 运行 typecheck**

Run: `cd /Users/yang/AiProjects/ghost-reader && bun run typecheck`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/shared/i18n/en.ts src/shared/i18n/zh.ts src/shared/i18n/zh-TW.ts
git commit -m "feat: 添加自动播放和使用说明 i18n 键值"
```

---

## Task 3: MoreMenu 组件

**Files:**
- Create: `src/renderer/src/components/reader/MoreMenu.tsx`
- Create: `tests/renderer/more-menu.test.tsx`
- Modify: `src/renderer/src/styles/global.css`

- [ ] **Step 1: 编写 MoreMenu 的失败测试**

```typescript
// tests/renderer/more-menu.test.tsx
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MoreMenu } from '../../src/renderer/src/components/reader/MoreMenu'

// Mock useTranslation
vi.mock('../../src/renderer/src/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

describe('MoreMenu', () => {
  it('renders the more button', () => {
    render(
      <MoreMenu
        autoScrollActive={false}
        onAutoScroll={vi.fn()}
        onUsageGuide={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'more.autoScroll' })).toBeInTheDocument()
  })

  it('opens popover on click and shows menu items', () => {
    render(
      <MoreMenu
        autoScrollActive={false}
        onAutoScroll={vi.fn()}
        onUsageGuide={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('more.autoScroll')).toBeInTheDocument()
    expect(screen.getByText('more.usageGuide')).toBeInTheDocument()
  })

  it('calls onAutoScroll when auto scroll item is clicked', () => {
    const onAutoScroll = vi.fn()
    render(
      <MoreMenu
        autoScrollActive={false}
        onAutoScroll={onAutoScroll}
        onUsageGuide={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button'))
    fireEvent.click(screen.getByText('more.autoScroll'))
    expect(onAutoScroll).toHaveBeenCalledTimes(1)
  })

  it('shows indicator dot when autoScrollActive is true', () => {
    const { container } = render(
      <MoreMenu
        autoScrollActive={true}
        onAutoScroll={vi.fn()}
        onUsageGuide={vi.fn()}
      />,
    )
    expect(container.querySelector('.more-menu__indicator')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/yang/AiProjects/ghost-reader && bunx vitest run tests/renderer/more-menu.test.tsx`
Expected: FAIL

- [ ] **Step 3: 实现 MoreMenu 组件**

```tsx
// src/renderer/src/components/reader/MoreMenu.tsx
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../hooks/useTranslation'

type MoreMenuProps = {
  autoScrollActive: boolean
  autoScrollPaused?: boolean
  onAutoScroll: () => void
  onUsageGuide: () => void
}

export function MoreMenu({ autoScrollActive, autoScrollPaused, onAutoScroll, onUsageGuide }: MoreMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="more-menu" ref={menuRef}>
      <button
        className="more-menu__trigger reader-bottom-nav__btn"
        type="button"
        aria-label={t('more.autoScroll')}
        onClick={() => setOpen(!open)}
      >
        <span className="material-symbols-outlined" aria-hidden="true">more_horiz</span>
        {autoScrollActive && (
          <span className={`more-menu__indicator ${autoScrollPaused ? 'more-menu__indicator--paused' : ''}`} />
        )}
      </button>

      {open && (
        <div className="more-menu__popover">
          <button
            type="button"
            className="more-menu__item"
            onClick={() => { setOpen(false); onAutoScroll() }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">play_circle</span>
            <span>{t('more.autoScroll')}</span>
          </button>
          <button
            type="button"
            className="more-menu__item"
            onClick={() => { setOpen(false); onUsageGuide() }}
          >
            <span className="material-symbols-outlined" aria-hidden="true">help_outline</span>
            <span>{t('more.usageGuide')}</span>
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: 添加 CSS 样式**

在 `src/renderer/src/styles/global.css` 末尾追加：

```css
/* MoreMenu 更多菜单 */
.more-menu {
  position: relative;
}

.more-menu__trigger {
  position: relative;
}

.more-menu__indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgb(var(--theme-accent));
  animation: breathe 1.5s ease-in-out infinite;
}

.more-menu__indicator--paused {
  animation: none;
}

@keyframes breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.more-menu__popover {
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  min-width: 180px;
  padding: 6px;
  border-radius: 12px;
  background: var(--bg-panel);
  border: 1px solid var(--border-soft);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.more-menu__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.more-menu__item:hover {
  background: rgba(255, 255, 255, 0.06);
}

.more-menu__item .material-symbols-outlined {
  font-size: 18px;
  opacity: 0.7;
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd /Users/yang/AiProjects/ghost-reader && bunx vitest run tests/renderer/more-menu.test.tsx`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/renderer/src/components/reader/MoreMenu.tsx tests/renderer/more-menu.test.tsx src/renderer/src/styles/global.css
git commit -m "feat: 实现 MoreMenu 更多菜单组件"
```

---

## Task 4: AutoScrollPanel 组件

**Files:**
- Create: `src/renderer/src/components/reader/AutoScrollPanel.tsx`
- Modify: `src/renderer/src/styles/global.css`

- [ ] **Step 1: 实现 AutoScrollPanel**

```tsx
// src/renderer/src/components/reader/AutoScrollPanel.tsx
import { useEffect } from 'react'
import { useTranslation } from '../../hooks/useTranslation'

type AutoScrollPanelProps = {
  enabled: boolean
  speed: number // 1-5
  pauseOnHover: boolean
  onEnabledChange: (enabled: boolean) => void
  onSpeedChange: (speed: number) => void
  onPauseOnHoverChange: (value: boolean) => void
  onClose: () => void
}

export function AutoScrollPanel({
  enabled,
  speed,
  pauseOnHover,
  onEnabledChange,
  onSpeedChange,
  onPauseOnHoverChange,
  onClose,
}: AutoScrollPanelProps) {
  const { t } = useTranslation()

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

  const speedLabel = t(`autoScroll.speed.${speed}`)

  return (
    <div className="auto-scroll-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="auto-scroll-panel">
        <div className="auto-scroll-panel__header">
          <h3>{t('autoScroll.title')}</h3>
          <button type="button" className="auto-scroll-panel__close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="auto-scroll-panel__body">
          {/* 自动播放开关 */}
          <div className="auto-scroll-panel__row">
            <span>{t('autoScroll.enable')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              className={`settings-toggle__track ${enabled ? 'settings-toggle__track--on' : ''}`}
              onClick={() => onEnabledChange(!enabled)}
            >
              <span className="settings-toggle__thumb" />
            </button>
          </div>

          {/* 开关打开后展开 */}
          {enabled && (
            <>
              {/* 速度滑块 */}
              <div className="auto-scroll-panel__row auto-scroll-panel__row--column">
                <div className="auto-scroll-panel__row-header">
                  <span>{t('autoScroll.speed')}</span>
                  <span className="auto-scroll-panel__value">{speedLabel}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={speed}
                  onChange={(e) => onSpeedChange(Number(e.target.value))}
                  className="auto-scroll-panel__slider"
                />
              </div>

              {/* 鼠标移开后滚动 */}
              <div className="auto-scroll-panel__row">
                <span>{t('autoScroll.pauseOnHover')}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={pauseOnHover}
                  className={`settings-toggle__track ${pauseOnHover ? 'settings-toggle__track--on' : ''}`}
                  onClick={() => onPauseOnHoverChange(!pauseOnHover)}
                >
                  <span className="settings-toggle__thumb" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 添加 CSS 样式**

在 `global.css` 追加：

```css
/* AutoScrollPanel 自动播放设置面板 */
.auto-scroll-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.auto-scroll-panel {
  width: 320px;
  border-radius: 16px;
  background: var(--bg-panel);
  border: 1px solid var(--border-soft);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}

.auto-scroll-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
}

.auto-scroll-panel__header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.auto-scroll-panel__close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}

.auto-scroll-panel__close:hover {
  background: rgba(255, 255, 255, 0.06);
}

.auto-scroll-panel__body {
  padding: 8px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auto-scroll-panel__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--text-primary);
}

.auto-scroll-panel__row--column {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}

.auto-scroll-panel__row-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.auto-scroll-panel__value {
  font-size: 12px;
  color: var(--text-secondary);
}

.auto-scroll-panel__slider {
  width: 100%;
  accent-color: rgb(var(--theme-accent));
}
```

- [ ] **Step 3: 运行 typecheck**

Run: `cd /Users/yang/AiProjects/ghost-reader && bun run typecheck`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/renderer/src/components/reader/AutoScrollPanel.tsx src/renderer/src/styles/global.css
git commit -m "feat: 实现 AutoScrollPanel 自动播放设置面板"
```

---

## Task 5: UsageGuidePanel 组件

**Files:**
- Create: `src/renderer/src/components/reader/UsageGuidePanel.tsx`
- Modify: `src/renderer/src/styles/global.css`

- [ ] **Step 1: 实现 UsageGuidePanel**

```tsx
// src/renderer/src/components/reader/UsageGuidePanel.tsx
import { useEffect } from 'react'
import { useTranslation } from '../../hooks/useTranslation'

type UsageGuidePanelProps = {
  onClose: () => void
}

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

type ShortcutRow = { label: string; keys: string }

export function UsageGuidePanel({ onClose }: UsageGuidePanelProps) {
  const { t } = useTranslation()

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

  const shortcuts: ShortcutRow[] = [
    { label: t('usageGuide.shortcutScroll'), keys: 'PGUP / PGDN' },
    { label: t('usageGuide.shortcutChapter'), keys: '← / →' },
    { label: t('usageGuide.shortcutImmersive'), keys: '⌘/Ctrl + F' },
    { label: t('usageGuide.shortcutBack'), keys: '⌘/Ctrl + B' },
    { label: t('usageGuide.shortcutFontSize'), keys: '⌘/Ctrl + +/-' },
    { label: t('usageGuide.shortcutAutoScroll'), keys: 'Space' },
  ]

  const sections = [
    { icon: 'swipe_vertical', title: t('usageGuide.basicOps'), desc: t('usageGuide.basicOpsDesc') },
    { icon: 'fullscreen', title: t('usageGuide.immersive'), desc: t('usageGuide.immersiveDesc') },
    { icon: 'play_circle', title: t('usageGuide.autoScroll'), desc: t('usageGuide.autoScrollDesc') },
    { icon: 'palette', title: t('usageGuide.appearance'), desc: t('usageGuide.appearanceDesc') },
  ]

  return (
    <div className="usage-guide-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="usage-guide-panel">
        <div className="usage-guide-panel__header">
          <h3>{t('usageGuide.title')}</h3>
          <button type="button" className="usage-guide-panel__close" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        <div className="usage-guide-panel__body">
          {/* 操作说明卡片 */}
          {sections.map((section) => (
            <div key={section.title} className="usage-guide-panel__card">
              <span className="material-symbols-outlined usage-guide-panel__card-icon">{section.icon}</span>
              <div>
                <h4 className="usage-guide-panel__card-title">{section.title}</h4>
                <p className="usage-guide-panel__card-desc">{renderWithKbd(section.desc)}</p>
              </div>
            </div>
          ))}

          {/* 快捷键表格 */}
          <div className="usage-guide-panel__shortcuts">
            <h4 className="usage-guide-panel__section-title">
              <span className="material-symbols-outlined">keyboard</span>
              {t('usageGuide.shortcuts')}
            </h4>
            <div className="usage-guide-panel__shortcut-list">
              {shortcuts.map((row) => (
                <div key={row.label} className="usage-guide-panel__shortcut-row">
                  <span>{row.label}</span>
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
```

- [ ] **Step 2: 添加 CSS 样式**

在 `global.css` 追加：

```css
/* UsageGuidePanel 使用说明面板 */
.usage-guide-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.usage-guide-panel {
  width: 380px;
  max-height: 80vh;
  border-radius: 16px;
  background: var(--bg-panel);
  border: 1px solid var(--border-soft);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
}

.usage-guide-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  flex-shrink: 0;
}

.usage-guide-panel__header h3 {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.usage-guide-panel__close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
}

.usage-guide-panel__close:hover {
  background: rgba(255, 255, 255, 0.06);
}

.usage-guide-panel__body {
  padding: 8px 20px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.usage-guide-panel__card {
  display: flex;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-soft);
}

.usage-guide-panel__card-icon {
  font-size: 20px;
  color: rgb(var(--theme-accent));
  flex-shrink: 0;
  margin-top: 2px;
}

.usage-guide-panel__card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px;
}

.usage-guide-panel__card-desc {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
  white-space: pre-line;
}

.usage-guide-panel__card-desc kbd {
  display: inline-block;
  padding: 1px 5px;
  font-size: 11px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border-soft);
  font-family: inherit;
}

.usage-guide-panel__shortcuts {
  padding-top: 8px;
}

.usage-guide-panel__section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 10px;
}

.usage-guide-panel__section-title .material-symbols-outlined {
  font-size: 18px;
}

.usage-guide-panel__shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.usage-guide-panel__shortcut-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-primary);
}

.usage-guide-panel__shortcut-keys {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: monospace;
}
```

- [ ] **Step 3: 运行 typecheck**

Run: `cd /Users/yang/AiProjects/ghost-reader && bun run typecheck`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/renderer/src/components/reader/UsageGuidePanel.tsx src/renderer/src/styles/global.css
git commit -m "feat: 实现 UsageGuidePanel 使用说明面板"
```

---

## Task 6: 集成到 ReaderLayout — 底部导航添加更多按钮

**Files:**
- Modify: `src/renderer/src/components/reader/ReaderLayout.tsx`

- [ ] **Step 1: 修改 ReaderLayout 添加更多按钮到底部导航**

ReaderLayout 需要接收新的 props 来控制更多菜单：

```typescript
// 在 ReaderLayoutProps 中新增：
autoScrollActive?: boolean
autoScrollPaused?: boolean
onAutoScrollPanel?: () => void
onUsageGuidePanel?: () => void
```

在底部导航 `.reader-bottom-nav__actions` 中，在外观按钮之后添加 MoreMenu：

```tsx
import { MoreMenu } from './MoreMenu'

// 在 <nav> 的 actions div 中追加：
<MoreMenu
  autoScrollActive={autoScrollActive ?? false}
  autoScrollPaused={autoScrollPaused}
  onAutoScroll={onAutoScrollPanel ?? (() => {})}
  onUsageGuide={onUsageGuidePanel ?? (() => {})}
/>
```

- [ ] **Step 2: 运行 typecheck**

Run: `cd /Users/yang/AiProjects/ghost-reader && bun run typecheck`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/renderer/src/components/reader/ReaderLayout.tsx
git commit -m "feat: 底部导航栏集成 MoreMenu 更多按钮"
```

---

## Task 7: ReaderPage 集成自动播放状态 + 面板

**Files:**
- Modify: `src/renderer/src/components/reader/ReaderPage.tsx`

- [ ] **Step 1: 在 ReaderPage 中添加自动播放状态和面板逻辑**

在 ReaderPage 中添加：

```typescript
// 状态声明（在 useState 区域）
const [autoScrollEnabled, setAutoScrollEnabled] = useState(false)
const [autoScrollSpeed, setAutoScrollSpeed] = useState(3)
const [autoScrollPauseOnHover, setAutoScrollPauseOnHover] = useState(false)
const [showAutoScrollPanel, setShowAutoScrollPanel] = useState(false)
const [showUsageGuide, setShowUsageGuide] = useState(false)
```

添加 lazy import：

```typescript
const AutoScrollPanel = lazy(() => import('./AutoScrollPanel').then(m => ({ default: m.AutoScrollPanel })))
const UsageGuidePanel = lazy(() => import('./UsageGuidePanel').then(m => ({ default: m.UsageGuidePanel })))
```

使用 useAutoScroll hook：

```typescript
import { useAutoScroll } from '../../hooks/useAutoScroll'

const { paused: autoScrollPaused, toggle: toggleAutoScroll } = useAutoScroll({
  enabled: autoScrollEnabled,
  speed: autoScrollSpeed,
  pauseOnHover: autoScrollPauseOnHover,
  scrollRef: book?.format === 'txt' ? txtScrollRef : epubScrollRef,
  onChapterEnd: () => {
    if (book?.format === 'txt') {
      // TXT 到底停止自动播放
      setAutoScrollEnabled(false)
    } else {
      // EPUB：判断是否已是最后一章
      const spineHrefs = spineHrefsRef.current
      const currentHref = currentChapterHref?.split('#')[0] ?? ''
      const isLastChapter = spineHrefs.length > 0 && spineHrefs[spineHrefs.length - 1] === currentHref
      if (isLastChapter) {
        setAutoScrollEnabled(false)
      } else {
        epubChapterNavRef.current?.next()
      }
    }
  },
})
```

需要新增一个 `epubScrollRef`：

```typescript
const epubScrollRef = useRef<HTMLElement | null>(null)

// 在 ReaderActions useEffect 中，给 epubScrollRef 赋值：
useEffect(() => {
  if (book?.format === 'epub') {
    epubScrollRef.current = document.querySelector('.epub-container') as HTMLElement | null
  }
})
```

在 ReaderLayout 中传递 props：

```tsx
<ReaderLayout
  // ... 现有 props ...
  autoScrollActive={autoScrollEnabled}
  autoScrollPaused={autoScrollPaused}
  onAutoScrollPanel={() => setShowAutoScrollPanel(true)}
  onUsageGuidePanel={() => setShowUsageGuide(true)}
>
```

在 return JSX 末尾（ReaderGuide 之后）添加面板：

```tsx
{showAutoScrollPanel && (
  <Suspense fallback={null}>
    <AutoScrollPanel
      enabled={autoScrollEnabled}
      speed={autoScrollSpeed}
      pauseOnHover={autoScrollPauseOnHover}
      onEnabledChange={setAutoScrollEnabled}
      onSpeedChange={setAutoScrollSpeed}
      onPauseOnHoverChange={setAutoScrollPauseOnHover}
      onClose={() => setShowAutoScrollPanel(false)}
    />
  </Suspense>
)}

{showUsageGuide && (
  <Suspense fallback={null}>
    <UsageGuidePanel onClose={() => setShowUsageGuide(false)} />
  </Suspense>
)}
```

- [ ] **Step 2: 导出 autoScrollEnabled 和 toggleAutoScroll 给键盘快捷键**

扩展 `ReaderActions` 类型：

```typescript
export type ReaderActions = {
  scrollLine: (direction: 'up' | 'down') => void
  chapterPrev: () => void
  chapterNext: () => void
  toggleAutoScroll?: () => void
  autoScrollEnabled?: boolean
}
```

在 readerActionsRef 赋值中添加：

```typescript
readerActionsRef.current = {
  // ... 现有内容 ...
  toggleAutoScroll: toggleAutoScroll,
  autoScrollEnabled: autoScrollEnabled,
}
```

- [ ] **Step 3: 运行 typecheck**

Run: `cd /Users/yang/AiProjects/ghost-reader && bun run typecheck`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/renderer/src/components/reader/ReaderPage.tsx
git commit -m "feat: ReaderPage 集成自动播放状态与面板"
```

---

## Task 8: 空格键快捷键

**Files:**
- Modify: `src/renderer/src/hooks/useKeyboardShortcuts.ts`

- [ ] **Step 1: 在 useKeyboardShortcuts 中添加空格键处理**

在 switch 语句中添加 `case ' ':` (空格键)：

```typescript
case ' ':
  // 空格键：仅在自动播放已开启时有效（暂停/恢复）
  if (!mod) {
    const actions = readerActionsRef.current
    if (actions?.autoScrollEnabled) {
      e.preventDefault()
      actions.toggleAutoScroll?.()
    }
  }
  break
```

- [ ] **Step 2: 运行已有测试确保不破坏现有功能**

Run: `cd /Users/yang/AiProjects/ghost-reader && bun run test`
Expected: All tests PASS

- [ ] **Step 3: 提交**

```bash
git add src/renderer/src/hooks/useKeyboardShortcuts.ts
git commit -m "feat: 空格键暂停/恢复自动播放（仅在启用时生效）"
```

---

## Task 9: SettingsPanel 删除 Shortcuts Tab

**Files:**
- Modify: `src/renderer/src/components/settings/SettingsPanel.tsx`

- [ ] **Step 1: 删除 Shortcuts 导航项和内容区域**

从 `NAV_ITEMS` 数组中移除 `{ id: 'shortcuts', icon: 'keyboard' }`：

```typescript
const NAV_ITEMS = [
  { id: 'appearance', icon: 'palette' },
  { id: 'language', icon: 'translate' },
] as const
```

删除 `shortcutsRef` 相关代码：
- 移除 `const shortcutsRef = useRef<HTMLElement>(null)`
- 从 `sectionRefs` 中移除 `shortcuts`
- 从 `navLabelKey` 中移除 `shortcuts`
- 删除整个 `{/* Reading Shortcuts */}` section（第 246-288 行）

- [ ] **Step 2: 运行 typecheck 和 lint**

Run: `cd /Users/yang/AiProjects/ghost-reader && bun run typecheck && bun run lint`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/renderer/src/components/settings/SettingsPanel.tsx
git commit -m "refactor: 从设置面板移除快捷键 tab（迁移至使用说明面板）"
```

---

## Task 10: ReaderGuide 新手引导更新

**Files:**
- Modify: `src/renderer/src/components/reader/ReaderGuide.tsx`
- Modify: `src/shared/i18n/en.ts`
- Modify: `src/shared/i18n/zh.ts`
- Modify: `src/shared/i18n/zh-TW.ts`

- [ ] **Step 1: 添加新引导 i18n 键值**

**en.ts:**
```typescript
'guide.step3Title': 'Auto Scroll',
'guide.step3Desc': 'Tap ⋯ in bottom bar → Auto Scroll.\nPress [Space] to pause / resume.',
```

**zh.ts:**
```typescript
'guide.step3Title': '自动播放',
'guide.step3Desc': '点击底部 ⋯ → 自动播放设置。\n按 [空格] 暂停/恢复。',
```

**zh-TW.ts:**
```typescript
'guide.step3Title': '自動播放',
'guide.step3Desc': '點擊底部 ⋯ → 自動播放設定。\n按 [空格] 暫停/恢復。',
```

- [ ] **Step 2: 在 SHORTCUT_STEPS 数组中添加新卡片**

```typescript
const SHORTCUT_STEPS = [
  { icon: 'swipe_vertical', titleKey: 'guide.step1Title', descKey: 'guide.step1Desc' },
  { icon: 'keyboard', titleKey: 'guide.step2Title', descKey: 'guide.step2Desc' },
  { icon: 'play_circle', titleKey: 'guide.step3Title', descKey: 'guide.step3Desc' },
]
```

- [ ] **Step 3: 运行测试**

Run: `cd /Users/yang/AiProjects/ghost-reader && bun run test`
Expected: PASS

- [ ] **Step 4: 提交**

```bash
git add src/renderer/src/components/reader/ReaderGuide.tsx src/shared/i18n/en.ts src/shared/i18n/zh.ts src/shared/i18n/zh-TW.ts
git commit -m "feat: 新手引导新增自动播放卡片"
```

---

## Task 11: 全量测试 + 最终验证

**Files:** 无新文件

- [ ] **Step 1: 运行完整 CI 流水线**

Run: `cd /Users/yang/AiProjects/ghost-reader && bun run typecheck && bun run lint && bun run test`
Expected: All PASS

- [ ] **Step 2: 修复任何失败的测试（如 mock 不完整等）**

已知需要更新的 mock 文件列表：
- `tests/renderer/reader-page.test.tsx` — 如 ReaderPage 增加了新 props
- `tests/renderer/app-shell.test.tsx` — 如有新 API 调用

- [ ] **Step 3: 启动开发服务器验证功能**

Run: `cd /Users/yang/AiProjects/ghost-reader && bun run dev`

验证清单：
- [ ] 底部导航栏出现 ⋯ 更多按钮
- [ ] 点击更多按钮弹出 popover（自动播放设置 + 使用说明）
- [ ] 点击菜单外区域关闭菜单
- [ ] 点击自动播放设置 → 打开面板
- [ ] 面板中开启自动播放 → 内容开始滚动
- [ ] 速度滑块 5 档实时切换生效
- [ ] 鼠标移开后滚动开关工作正常
- [ ] 空格键暂停/恢复（仅在开启后有效）
- [ ] 更多按钮旁出现呼吸圆点（暂停时静止）
- [ ] 关闭自动播放后圆点消失
- [ ] 沉浸模式下自动播放正常运行
- [ ] TXT 格式到底停止播放
- [ ] EPUB 格式到底自动切换下一章
- [ ] 使用说明面板内容完整（5 个分区）
- [ ] 设置面板不再有快捷键 tab
- [ ] 新手引导出现自动播放卡片

- [ ] **Step 4: 提交修复（如有）**

```bash
git add -A
git commit -m "fix: 修复自动播放集成测试问题"
```
