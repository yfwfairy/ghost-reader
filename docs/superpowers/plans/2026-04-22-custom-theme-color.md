# 自定义主题色 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在阅读器主题色选择器中新增自定义主题槽位，支持 EyeDropper 屏幕取色、原生色板和 hex 输入三种方式设定背景色和文字色。

**Architecture:** 扩展 `ColorTheme` union 增加 `'custom'`，新增 `resolveTheme()` helper 统一解析预设和自定义主题。ReaderPage 计算出 `themeTextColor` 传入子渲染器，避免透传 AppConfig 字段。新增 `CustomThemePanel` 组件处理取色面板 UI 和 EyeDropper 交互。

**Tech Stack:** React 19 + TypeScript + Electron 35 (EyeDropper API) + CSS 变量

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/shared/types.ts` | `ColorTheme` 加 `'custom'`，`AppConfig` 加 `customThemeBg?` / `customThemeText?` |
| `src/shared/constants.ts` | 新增 `lerpColor()` + `resolveTheme()` |
| `tests/shared/constants.test.ts` | `lerpColor` 和 `resolveTheme` 单元测试 |
| `src/renderer/src/assets/noise/index.ts` | `NOISE_MAP` 类型改 `Partial`，不含 `custom` |
| `src/shared/i18n/en.ts` / `zh.ts` / `zh-TW.ts` | 新增取色面板翻译 key |
| `src/renderer/src/components/reader/TxtRenderer.tsx` | 用 `themeTextColor` prop 替代 `THEME_MAP[colorTheme].text` |
| `src/renderer/src/components/reader/EpubRenderer.tsx` | 用 `themeTextColor` prop 替代 `THEME_MAP[colorTheme].text` |
| `src/renderer/src/components/reader/ReaderPage.tsx` | 用 `resolveTheme()` 驱动 CSS 变量 + 传 `themeTextColor` 给子渲染器 + NOISE_MAP fallback |
| `src/renderer/src/components/reader/CustomThemePanel.tsx` | **新增** — 取色面板组件 |
| `src/renderer/src/components/reader/ReaderDrawer.tsx` | 色块行末尾加虚线自定义色块 + 展开 CustomThemePanel |
| `src/renderer/src/styles/global.css` | 虚线色块 + 取色面板样式 |

---

### Task 0: 创建开发分支

**Files:**
- 无文件变更

- [ ] **Step 1: 从 main 创建 feat/v0.3.0 分支**

```bash
git checkout -b feat/v0.3.0
```

- [ ] **Step 2: 验证分支**

Run: `git branch --show-current`
Expected: `feat/v0.3.0`

---

### Task 1: 类型系统变更

**Files:**
- Modify: `src/shared/types.ts:33` — ColorTheme union
- Modify: `src/shared/types.ts:36-49` — AppConfig interface

- [ ] **Step 1: 扩展 ColorTheme union**

在 `src/shared/types.ts:33`，把：

```typescript
export type ColorTheme = 'obsidian' | 'parchment' | 'midnight' | 'onyx' | 'ember' | 'forest' | 'ocean' | 'slate'
```

改为：

```typescript
export type ColorTheme = 'obsidian' | 'parchment' | 'midnight' | 'onyx' | 'ember' | 'forest' | 'ocean' | 'slate' | 'custom'
```

- [ ] **Step 2: AppConfig 新增字段**

在 `src/shared/types.ts` 的 `AppConfig` interface 中，`noiseTexture: boolean` 之后新增两个可选字段：

```typescript
export interface AppConfig {
  fontSize: number
  lineHeight: number
  fontFamily: FontFamily
  brightness: number
  colorTheme: ColorTheme
  appearance: AppearanceMode
  appearanceFollowSystem: boolean
  currentBookId: string | null
  alwaysOnTop: boolean
  language: Locale
  onboardingCompleted: boolean
  noiseTexture: boolean
  customThemeBg?: string
  customThemeText?: string
}
```

- [ ] **Step 3: 运行 typecheck**

Run: `bun run typecheck`
Expected: 编译错误 — `THEME_MAP` 的类型 `Record<ColorTheme, ThemeColors>` 要求包含 `custom` 键但缺失，以及 `NOISE_MAP` 同理。这是预期的，下一个 Task 会修复。

- [ ] **Step 4: 提交**

```bash
git add src/shared/types.ts
git commit -m "feat: ColorTheme 新增 custom 类型，AppConfig 新增 customThemeBg/customThemeText"
```

---

### Task 2: resolveTheme helper + 单元测试

**Files:**
- Modify: `src/shared/constants.ts:1,32,76` — 导入 AppConfig，修改 THEME_MAP 类型，新增 lerpColor + resolveTheme
- Modify: `tests/shared/constants.test.ts` — 新增测试

- [ ] **Step 1: 修改 THEME_MAP 类型，排除 custom**

在 `src/shared/constants.ts:1`，把：

```typescript
import type { ColorTheme } from './types'
```

改为：

```typescript
import type { AppConfig, ColorTheme } from './types'
```

在 `src/shared/constants.ts:32`，把：

```typescript
export const THEME_MAP: Record<ColorTheme, ThemeColors> = {
```

改为：

```typescript
export const THEME_MAP: Record<Exclude<ColorTheme, 'custom'>, ThemeColors> = {
```

- [ ] **Step 2: 新增 lerpColor 和 resolveTheme**

在 `src/shared/constants.ts` 文件末尾（`hexToRgbTriplet` 函数之后）追加：

```typescript
export function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
  const ca = parse(a), cb = parse(b)
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t)
  return `#${mix(ca[0], cb[0]).toString(16).padStart(2, '0')}${mix(ca[1], cb[1]).toString(16).padStart(2, '0')}${mix(ca[2], cb[2]).toString(16).padStart(2, '0')}`
}

export function resolveTheme(
  config: Pick<AppConfig, 'colorTheme' | 'customThemeBg' | 'customThemeText'>
): ThemeColors {
  if (config.colorTheme !== 'custom') {
    return THEME_MAP[config.colorTheme]
  }
  const bg = config.customThemeBg ?? '#121212'
  const text = config.customThemeText ?? '#e7e5e4'
  const accent = lerpColor(bg, text, 0.4)
  return { bg, text, accent }
}
```

- [ ] **Step 3: 运行 typecheck**

Run: `bun run typecheck`
Expected: PASS（THEME_MAP 类型排除了 custom，不再报错。NOISE_MAP 仍会报错，Task 3 修复。）

- [ ] **Step 4: 编写 lerpColor 测试**

在 `tests/shared/constants.test.ts` 中，把现有 import：

```typescript
import {
  DEFAULT_APP_CONFIG,
  DEFAULT_WINDOW_SIZE,
  SUPPORTED_BOOK_FORMATS,
} from '../../src/shared/constants'
```

改为：

```typescript
import {
  DEFAULT_APP_CONFIG,
  DEFAULT_WINDOW_SIZE,
  SUPPORTED_BOOK_FORMATS,
  lerpColor,
  resolveTheme,
  THEME_MAP,
} from '../../src/shared/constants'
```

然后在文件末尾（最后一个 `describe` 块的 `})` 之后）追加：

describe('lerpColor', () => {
  it('returns start color at t=0', () => {
    expect(lerpColor('#000000', '#ffffff', 0)).toBe('#000000')
  })

  it('returns end color at t=1', () => {
    expect(lerpColor('#000000', '#ffffff', 1)).toBe('#ffffff')
  })

  it('returns midpoint at t=0.5', () => {
    expect(lerpColor('#000000', '#ffffff', 0.5)).toBe('#808080')
  })

  it('interpolates colored values', () => {
    expect(lerpColor('#121212', '#e7e5e4', 0.4)).toBe('#676666')
  })
})
```

- [ ] **Step 5: 编写 resolveTheme 测试**

在同一个文件中追加：

```typescript
describe('resolveTheme', () => {
  it('returns preset theme from THEME_MAP', () => {
    const result = resolveTheme({ colorTheme: 'obsidian' })
    expect(result).toEqual(THEME_MAP.obsidian)
  })

  it('returns custom theme with provided colors', () => {
    const result = resolveTheme({
      colorTheme: 'custom',
      customThemeBg: '#2b3a2e',
      customThemeText: '#c8d4c0',
    })
    expect(result.bg).toBe('#2b3a2e')
    expect(result.text).toBe('#c8d4c0')
    expect(result.accent).toBe('#6a7868')
  })

  it('falls back to obsidian defaults when custom colors are undefined', () => {
    const result = resolveTheme({ colorTheme: 'custom' })
    expect(result.bg).toBe('#121212')
    expect(result.text).toBe('#e7e5e4')
  })
})
```

- [ ] **Step 6: 运行测试**

Run: `bun run test -- tests/shared/constants.test.ts`
Expected: PASS（所有新旧测试通过）

- [ ] **Step 7: 提交**

```bash
git add src/shared/constants.ts tests/shared/constants.test.ts
git commit -m "feat: 新增 lerpColor + resolveTheme helper 及单元测试"
```

---

### Task 3: NOISE_MAP 类型修复

**Files:**
- Modify: `src/renderer/src/assets/noise/index.ts:1,13`

- [ ] **Step 1: 修改 NOISE_MAP 类型**

在 `src/renderer/src/assets/noise/index.ts:13`，把：

```typescript
export const NOISE_MAP: Record<ColorTheme, string> = {
```

改为：

```typescript
export const NOISE_MAP: Partial<Record<ColorTheme, string>> = {
```

- [ ] **Step 2: 移除未使用的 ColorTheme 导入（改用内联）**

第 1 行的导入不需要修改，`ColorTheme` 仍然作为类型参数使用。

- [ ] **Step 3: 运行 typecheck**

Run: `bun run typecheck`
Expected: PASS（所有类型错误消除。ReaderPage 的 `NOISE_MAP[activeConfig.colorTheme]` 现在返回 `string | undefined`，会在 Task 7 修复使用处。）

- [ ] **Step 4: 提交**

```bash
git add src/renderer/src/assets/noise/index.ts
git commit -m "refactor: NOISE_MAP 类型改为 Partial，不含 custom 键"
```

---

### Task 4: i18n 新增翻译 key

**Files:**
- Modify: `src/shared/i18n/en.ts`
- Modify: `src/shared/i18n/zh.ts`
- Modify: `src/shared/i18n/zh-TW.ts`

- [ ] **Step 1: 英文翻译**

在 `src/shared/i18n/en.ts` 的 `'appearance.noiseTexture'` 行之后添加：

```typescript
  'appearance.customTheme': 'Custom',
  'appearance.customPanel.bg': 'Background',
  'appearance.customPanel.text': 'Text',
  'appearance.customPanel.preview': 'Preview',
  'appearance.customPanel.pickColor': 'Pick color',
  'appearance.customPanel.apply': 'Apply',
  'appearance.customPanel.cancel': 'Cancel',
```

- [ ] **Step 2: 中文翻译**

在 `src/shared/i18n/zh.ts` 的 `'appearance.noiseTexture'` 行之后添加：

```typescript
  'appearance.customTheme': '自定义',
  'appearance.customPanel.bg': '背景',
  'appearance.customPanel.text': '文字',
  'appearance.customPanel.preview': '预览效果',
  'appearance.customPanel.pickColor': '取色',
  'appearance.customPanel.apply': '应用',
  'appearance.customPanel.cancel': '取消',
```

- [ ] **Step 3: 繁体中文翻译**

在 `src/shared/i18n/zh-TW.ts` 的 `'appearance.noiseTexture'` 行之后添加：

```typescript
  'appearance.customTheme': '自訂',
  'appearance.customPanel.bg': '背景',
  'appearance.customPanel.text': '文字',
  'appearance.customPanel.preview': '預覽效果',
  'appearance.customPanel.pickColor': '取色',
  'appearance.customPanel.apply': '套用',
  'appearance.customPanel.cancel': '取消',
```

- [ ] **Step 4: 提交**

```bash
git add src/shared/i18n/en.ts src/shared/i18n/zh.ts src/shared/i18n/zh-TW.ts
git commit -m "feat: 新增自定义主题色面板 i18n 翻译 key"
```

---

### Task 5: TxtRenderer 接收 themeTextColor prop

**Files:**
- Modify: `src/renderer/src/components/reader/TxtRenderer.tsx:2,6,10,18,55`

- [ ] **Step 1: 修改 props 和 imports**

在 `src/renderer/src/components/reader/TxtRenderer.tsx`，把 import 行：

```typescript
import type { ColorTheme, FontFamily, ReadingProgress } from '@shared/types'
import { THEME_MAP } from '@shared/constants'
```

改为：

```typescript
import type { FontFamily, ReadingProgress } from '@shared/types'
```

把 `TxtRendererProps` 类型中的 `colorTheme: ColorTheme` 改为 `themeTextColor: string`：

```typescript
type TxtRendererProps = {
  content: string
  config: {
    fontSize: number
    lineHeight: number
    fontFamily: FontFamily
    themeTextColor: string
  }
  savedProgress?: ReadingProgress | null
  scrollRef?: React.RefObject<HTMLDivElement | null>
  onProgressUpdate: (patch: Pick<ReadingProgress, 'txtScrollTop' | 'percentage' | 'updatedAt'>) => void
}
```

- [ ] **Step 2: 更新 style 中的颜色引用**

把第 55 行的：

```typescript
        color: THEME_MAP[config.colorTheme].text,
```

改为：

```typescript
        color: config.themeTextColor,
```

- [ ] **Step 3: 运行 typecheck**

Run: `bun run typecheck`
Expected: ReaderPage 中传给 TxtRenderer 的 `colorTheme` prop 会报错（预期，Task 7 修复）。

- [ ] **Step 4: 提交**

```bash
git add src/renderer/src/components/reader/TxtRenderer.tsx
git commit -m "refactor: TxtRenderer 用 themeTextColor prop 替代 THEME_MAP 查找"
```

---

### Task 6: EpubRenderer 接收 themeTextColor prop

**Files:**
- Modify: `src/renderer/src/components/reader/EpubRenderer.tsx:2-3,7-13,202-209,359-382`

- [ ] **Step 1: 修改 imports**

在 `src/renderer/src/components/reader/EpubRenderer.tsx`，把：

```typescript
import type { ColorTheme, FontFamily, ReadingProgress, TocEntry } from '@shared/types'
import { THEME_MAP } from '@shared/constants'
```

改为：

```typescript
import type { FontFamily, ReadingProgress, TocEntry } from '@shared/types'
```

- [ ] **Step 2: 修改 props 类型**

在 `EpubRendererProps` 中，把 `colorTheme: ColorTheme` 改为 `themeTextColor: string`：

```typescript
type EpubRendererProps = {
  bookId: string
  bookData: ArrayBuffer
  fontSize: number
  lineHeight: number
  fontFamily: FontFamily
  themeTextColor: string
  savedCfi?: string
  displayRef?: React.RefObject<((href: string, scrollPct?: number) => void) | null>
  chapterNavRef?: React.RefObject<{ prev: () => void; next: () => void } | null>
  onProgressUpdate: (patch: Pick<ReadingProgress, 'epubCfi' | 'percentage' | 'updatedAt'>) => void
  onChapterScroll?: (chapterHref: string, percent: number) => void
  onTocLoaded?: (toc: TocEntry[]) => void
  onSpineReady?: (spineHrefs: string[]) => void
}
```

- [ ] **Step 3: 更新组件解构和 ref**

在函数签名和组件内部：
- 解构参数中的 `colorTheme` 改为 `themeTextColor`
- 找到 `colorThemeRef` 的声明（类似 `const colorThemeRef = useRef(colorTheme)`），改为 `const themeTextColorRef = useRef(themeTextColor)`
- 全部 `colorThemeRef.current` 改为 `themeTextColorRef.current`

- [ ] **Step 4: 更新初始化主题（约第 202-209 行）**

把：

```typescript
      rendition.themes.default({
        body: {
          'font-family': `'${fontFamilyRef.current}', serif !important`,
          'font-size': `${fontSizeRef.current}px`,
          'line-height': String(lineHeightRef.current),
          background: 'transparent',
          color: THEME_MAP[colorThemeRef.current].text,
        },
      })
```

改为：

```typescript
      rendition.themes.default({
        body: {
          'font-family': `'${fontFamilyRef.current}', serif !important`,
          'font-size': `${fontSizeRef.current}px`,
          'line-height': String(lineHeightRef.current),
          background: 'transparent',
          color: themeTextColorRef.current,
        },
      })
```

- [ ] **Step 5: 更新热更新 useEffect（约第 359-382 行）**

把：

```typescript
  useEffect(() => {
    fontSizeRef.current = fontSize
    lineHeightRef.current = lineHeight
    fontFamilyRef.current = fontFamily
    colorThemeRef.current = colorTheme
    if (!renditionRef.current) {
      return
    }
    renditionRef.current.themes.default({
      body: {
        'font-family': `'${fontFamily}', serif !important`,
        'font-size': `${fontSize}px`,
        'line-height': String(lineHeight),
        background: 'transparent',
        color: THEME_MAP[colorTheme].text,
      },
    })
```

改为：

```typescript
  useEffect(() => {
    fontSizeRef.current = fontSize
    lineHeightRef.current = lineHeight
    fontFamilyRef.current = fontFamily
    themeTextColorRef.current = themeTextColor
    if (!renditionRef.current) {
      return
    }
    renditionRef.current.themes.default({
      body: {
        'font-family': `'${fontFamily}', serif !important`,
        'font-size': `${fontSize}px`,
        'line-height': String(lineHeight),
        background: 'transparent',
        color: themeTextColor,
      },
    })
```

同时更新该 useEffect 的依赖数组，把 `colorTheme` 改为 `themeTextColor`。

- [ ] **Step 6: 提交**

```bash
git add src/renderer/src/components/reader/EpubRenderer.tsx
git commit -m "refactor: EpubRenderer 用 themeTextColor prop 替代 THEME_MAP 查找"
```

---

### Task 7: ReaderPage 集成 resolveTheme

**Files:**
- Modify: `src/renderer/src/components/reader/ReaderPage.tsx:2,7,91-98,371-382,386-398,431`

- [ ] **Step 1: 更新 imports**

在 `src/renderer/src/components/reader/ReaderPage.tsx`，把：

```typescript
import { THEME_MAP, hexToRgbTriplet } from '@shared/constants'
```

改为：

```typescript
import { resolveTheme, hexToRgbTriplet } from '@shared/constants'
```

- [ ] **Step 2: 更新 CSS 变量同步 useEffect**

把约第 91-98 行的：

```typescript
  useEffect(() => {
    const theme = THEME_MAP[activeConfig.colorTheme]
    const root = document.documentElement
    root.dataset.colorTheme = activeConfig.colorTheme
    root.style.setProperty('--theme-bg', hexToRgbTriplet(theme.bg))
    root.style.setProperty('--theme-text', hexToRgbTriplet(theme.text))
    root.style.setProperty('--theme-accent', hexToRgbTriplet(theme.accent))
  }, [activeConfig.colorTheme])
```

改为：

```typescript
  const themeColors = resolveTheme(activeConfig)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.colorTheme = activeConfig.colorTheme
    root.style.setProperty('--theme-bg', hexToRgbTriplet(themeColors.bg))
    root.style.setProperty('--theme-text', hexToRgbTriplet(themeColors.text))
    root.style.setProperty('--theme-accent', hexToRgbTriplet(themeColors.accent))
  }, [activeConfig.colorTheme, activeConfig.customThemeBg, activeConfig.customThemeText, themeColors])
```

- [ ] **Step 3: 更新 TxtRenderer props**

找到 TxtRenderer 的 JSX（约第 371-382 行），把 `colorTheme` prop 改为 `themeTextColor`：

```typescript
            <TxtRenderer
              content={txtContent}
              config={{
                fontSize: activeConfig.fontSize,
                lineHeight: activeConfig.lineHeight,
                fontFamily: activeConfig.fontFamily,
                themeTextColor: themeColors.text,
              }}
              savedProgress={progress}
              scrollRef={txtScrollRef}
              onProgressUpdate={saveProgressLater}
            />
```

- [ ] **Step 4: 更新 EpubRenderer props**

找到 EpubRenderer 的 JSX（约第 386-398 行），把 `colorTheme` prop 改为 `themeTextColor`：

```typescript
            <EpubRenderer
              bookId={book.id}
              bookData={epubData}
              fontSize={activeConfig.fontSize}
              lineHeight={activeConfig.lineHeight}
              fontFamily={activeConfig.fontFamily}
              themeTextColor={themeColors.text}
              savedCfi={progress?.epubCfi}
```

（其余 props 不变。）

- [ ] **Step 5: 更新 NOISE_MAP fallback**

把约第 431 行的：

```typescript
          style={{ backgroundImage: `url(${NOISE_MAP[activeConfig.colorTheme]})` }}
```

改为：

```typescript
          style={{ backgroundImage: `url(${NOISE_MAP[activeConfig.colorTheme] ?? NOISE_MAP.obsidian})` }}
```

- [ ] **Step 6: 运行 typecheck + lint**

Run: `bun run typecheck && bun run lint`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add src/renderer/src/components/reader/ReaderPage.tsx
git commit -m "feat: ReaderPage 使用 resolveTheme 驱动 CSS 变量和子渲染器"
```

---

### Task 8: CustomThemePanel 组件

**Files:**
- Create: `src/renderer/src/components/reader/CustomThemePanel.tsx`

- [ ] **Step 1: 创建 CustomThemePanel 组件**

创建 `src/renderer/src/components/reader/CustomThemePanel.tsx`：

```typescript
import { useState } from 'react'
import { lerpColor } from '@shared/constants'
import { useTranslation } from '../../hooks/useTranslation'

type CustomThemePanelProps = {
  initialBg: string
  initialText: string
  onApply: (bg: string, text: string) => void
  onCancel: () => void
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

function isValidHex(value: string): boolean {
  return HEX_RE.test(value)
}

export function CustomThemePanel({ initialBg, initialText, onApply, onCancel }: CustomThemePanelProps) {
  const { t } = useTranslation()
  const [bg, setBg] = useState(initialBg)
  const [text, setText] = useState(initialText)
  const [bgInput, setBgInput] = useState(initialBg)
  const [textInput, setTextInput] = useState(initialText)

  const accent = lerpColor(bg, text, 0.4)
  const eyeDropperSupported = typeof window !== 'undefined' && 'EyeDropper' in window

  function updateBg(hex: string) {
    setBg(hex)
    setBgInput(hex)
  }

  function updateText(hex: string) {
    setText(hex)
    setTextInput(hex)
  }

  async function pickColor(setter: (hex: string) => void) {
    try {
      const dropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper()
      const result = await dropper.open()
      setter(result.sRGBHex)
    } catch {
      // 用户按 Esc 取消取色
    }
  }

  function handleBgInputBlur() {
    if (isValidHex(bgInput)) {
      setBg(bgInput)
    } else {
      setBgInput(bg)
    }
  }

  function handleTextInputBlur() {
    if (isValidHex(textInput)) {
      setText(textInput)
    } else {
      setTextInput(text)
    }
  }

  function handleBgInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleBgInputBlur()
  }

  function handleTextInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleTextInputBlur()
  }

  return (
    <div className="custom-theme-panel">
      {/* 实时预览 */}
      <div className="custom-theme-panel__preview" style={{ backgroundColor: bg }}>
        <div style={{ color: text, fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
          {t('appearance.customPanel.preview')}
        </div>
        <div style={{ color: accent, fontSize: 11 }}>
          宇宙洪荒 · The quick brown fox jumps over the lazy dog.
        </div>
      </div>

      {/* 背景色 + 文字色同行 */}
      <div className="custom-theme-panel__colors">
        {/* 背景色 */}
        <div className="custom-theme-panel__color-field">
          <div className="custom-theme-panel__color-label">{t('appearance.customPanel.bg')}</div>
          <div className="custom-theme-panel__color-row">
            <label className="custom-theme-panel__color-swatch">
              <input
                type="color"
                value={bg}
                onChange={(e) => updateBg(e.target.value)}
                className="custom-theme-panel__color-input-native"
              />
              <span style={{ backgroundColor: bg }} />
            </label>
            <input
              className="custom-theme-panel__hex-input"
              value={bgInput}
              onChange={(e) => setBgInput(e.target.value)}
              onBlur={handleBgInputBlur}
              onKeyDown={handleBgInputKeyDown}
              spellCheck={false}
            />
            {eyeDropperSupported && (
              <button
                type="button"
                className="custom-theme-panel__pick-btn"
                onClick={() => void pickColor(updateBg)}
                title={t('appearance.customPanel.pickColor')}
              >
                <span className="material-symbols-outlined">colorize</span>
              </button>
            )}
          </div>
        </div>

        {/* 文字色 */}
        <div className="custom-theme-panel__color-field">
          <div className="custom-theme-panel__color-label">{t('appearance.customPanel.text')}</div>
          <div className="custom-theme-panel__color-row">
            <label className="custom-theme-panel__color-swatch">
              <input
                type="color"
                value={text}
                onChange={(e) => updateText(e.target.value)}
                className="custom-theme-panel__color-input-native"
              />
              <span style={{ backgroundColor: text }} />
            </label>
            <input
              className="custom-theme-panel__hex-input"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onBlur={handleTextInputBlur}
              onKeyDown={handleTextInputKeyDown}
              spellCheck={false}
            />
            {eyeDropperSupported && (
              <button
                type="button"
                className="custom-theme-panel__pick-btn"
                onClick={() => void pickColor(updateText)}
                title={t('appearance.customPanel.pickColor')}
              >
                <span className="material-symbols-outlined">colorize</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="custom-theme-panel__actions">
        <button type="button" className="custom-theme-panel__btn custom-theme-panel__btn--cancel" onClick={onCancel}>
          {t('appearance.customPanel.cancel')}
        </button>
        <button type="button" className="custom-theme-panel__btn custom-theme-panel__btn--apply" onClick={() => onApply(bg, text)}>
          {t('appearance.customPanel.apply')}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 运行 typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/renderer/src/components/reader/CustomThemePanel.tsx
git commit -m "feat: 新增 CustomThemePanel 取色面板组件"
```

---

### Task 9: ReaderDrawer 集成自定义色块 + 面板

**Files:**
- Modify: `src/renderer/src/components/reader/ReaderDrawer.tsx:1-4,53-56,98,413-429`

- [ ] **Step 1: 更新 imports**

在 `src/renderer/src/components/reader/ReaderDrawer.tsx`，把：

```typescript
import type { ColorTheme, FontFamily, TocEntry } from '@shared/types'
import { THEME_MAP } from '@shared/constants'
```

改为：

```typescript
import type { ColorTheme, FontFamily, TocEntry } from '@shared/types'
import { THEME_MAP, resolveTheme } from '@shared/constants'
import { CustomThemePanel } from './CustomThemePanel'
```

- [ ] **Step 2: 添加 state**

在组件内部（`const [fontTab, setFontTab] = useState<FontTab>('zh')` 之后）添加：

```typescript
  const [customPanelOpen, setCustomPanelOpen] = useState(false)
```

- [ ] **Step 3: THEME_KEYS 保持不变**

`THEME_KEYS` 数组保持不变（只包含 8 个预设键），自定义色块在 JSX 中单独渲染。

- [ ] **Step 4: 修改主题选择器 JSX**

把主题选择器区域（约第 413-429 行）：

```typescript
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
```

改为：

```typescript
                <div className="theme-picker">
                  {THEME_KEYS.map((key) => {
                    const theme = THEME_MAP[key]
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`theme-swatch ${activeConfig.colorTheme === key ? 'theme-swatch--active' : ''}`}
                        style={{ backgroundColor: theme.bg }}
                        onClick={() => {
                          setCustomPanelOpen(false)
                          void updateConfig({ colorTheme: key })
                        }}
                        aria-label={key}
                      >
                        <span className="theme-swatch__letter" style={{ color: theme.text }}>A</span>
                      </button>
                    )
                  })}

                  {/* 自定义主题色块 */}
                  {(() => {
                    const hasCustom = activeConfig.customThemeBg != null
                    const isActive = activeConfig.colorTheme === 'custom'
                    const customTheme = hasCustom
                      ? resolveTheme({ colorTheme: 'custom', customThemeBg: activeConfig.customThemeBg, customThemeText: activeConfig.customThemeText })
                      : null

                    return (
                      <button
                        type="button"
                        className={`theme-swatch theme-swatch--custom ${isActive ? 'theme-swatch--active' : ''}`}
                        style={customTheme ? { backgroundColor: customTheme.bg } : undefined}
                        onClick={() => {
                          if (!hasCustom) {
                            setCustomPanelOpen(true)
                            return
                          }
                          if (isActive) {
                            setCustomPanelOpen((prev) => !prev)
                          } else {
                            void updateConfig({ colorTheme: 'custom' })
                            setCustomPanelOpen(true)
                          }
                        }}
                        aria-label={t('appearance.customTheme')}
                      >
                        {customTheme ? (
                          <span className="theme-swatch__letter" style={{ color: customTheme.text }}>A</span>
                        ) : (
                          <span className="theme-swatch__custom-icon">+</span>
                        )}
                      </button>
                    )
                  })()}
                </div>

                {/* 自定义取色面板 */}
                {customPanelOpen && (
                  <CustomThemePanel
                    initialBg={activeConfig.customThemeBg ?? '#121212'}
                    initialText={activeConfig.customThemeText ?? '#e7e5e4'}
                    onApply={(bg, text) => {
                      void updateConfig({
                        colorTheme: 'custom',
                        customThemeBg: bg,
                        customThemeText: text,
                        noiseTexture: false,
                      })
                      setCustomPanelOpen(false)
                    }}
                    onCancel={() => setCustomPanelOpen(false)}
                  />
                )}
```

- [ ] **Step 5: 运行 typecheck + lint**

Run: `bun run typecheck && bun run lint`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/renderer/src/components/reader/ReaderDrawer.tsx
git commit -m "feat: 主题选择器新增自定义色块 + 集成 CustomThemePanel"
```

---

### Task 10: CSS 样式

**Files:**
- Modify: `src/renderer/src/styles/global.css` — 在 `.theme-swatch__letter` 样式块之后添加

- [ ] **Step 1: 添加自定义色块和面板样式**

在 `src/renderer/src/styles/global.css` 中 `.theme-swatch__letter` 样式块（约第 3961-3966 行）之后添加：

```css
/* 自定义主题色块 — 虚线边框区分 */
.theme-swatch--custom {
  border: 2px dashed rgba(var(--theme-text), 0.3);
  background: conic-gradient(from 0deg, #f66, #fc6, #6f6, #6ff, #66f, #f6f, #f66);
  box-shadow: none;
}

.theme-swatch--custom.theme-swatch--active {
  border-color: rgba(var(--theme-text), 0.6);
  box-shadow: 0 0 0 2px rgba(148, 148, 148, 0.3);
}

.theme-swatch__custom-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: rgba(255, 255, 255, 0.6);
  font-size: 20px;
  font-weight: 300;
  line-height: 1;
  pointer-events: none;
}

/* 取色面板 */
.custom-theme-panel {
  margin-top: 12px;
  background: rgba(var(--theme-bg), 0.6);
  border: 1px solid rgba(var(--theme-text), 0.1);
  border-radius: 10px;
  padding: 14px 16px;
}

.custom-theme-panel__preview {
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
  border: 1px solid rgba(var(--theme-text), 0.08);
}

.custom-theme-panel__colors {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.custom-theme-panel__color-field {
  flex: 1;
  background: rgba(var(--theme-bg), 0.4);
  border-radius: 6px;
  padding: 8px;
}

.custom-theme-panel__color-label {
  color: rgba(var(--theme-text), 0.5);
  font-size: 10px;
  margin-bottom: 6px;
}

.custom-theme-panel__color-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.custom-theme-panel__color-swatch {
  position: relative;
  width: 24px;
  height: 24px;
  border-radius: 5px;
  overflow: hidden;
  cursor: pointer;
  flex-shrink: 0;
}

.custom-theme-panel__color-swatch span {
  display: block;
  width: 100%;
  height: 100%;
  border: 1px solid rgba(var(--theme-text), 0.15);
  border-radius: 5px;
}

.custom-theme-panel__color-input-native {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.custom-theme-panel__hex-input {
  flex: 1;
  min-width: 0;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(var(--theme-text), 0.1);
  border-radius: 4px;
  color: rgba(var(--theme-text), 0.7);
  font-size: 10px;
  font-family: var(--font-mono, monospace);
  padding: 3px 5px;
}

.custom-theme-panel__hex-input:focus {
  outline: none;
  border-color: rgba(var(--theme-text), 0.3);
}

.custom-theme-panel__pick-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--theme-text), 0.08);
  border: none;
  border-radius: 4px;
  padding: 3px 5px;
  cursor: pointer;
  flex-shrink: 0;
  color: rgba(var(--theme-text), 0.5);
}

.custom-theme-panel__pick-btn:hover {
  background: rgba(var(--theme-text), 0.15);
  color: rgba(var(--theme-text), 0.8);
}

.custom-theme-panel__pick-btn .material-symbols-outlined {
  font-size: 14px;
}

.custom-theme-panel__actions {
  display: flex;
  gap: 8px;
}

.custom-theme-panel__btn {
  flex: 1;
  padding: 6px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: opacity 150ms ease;
}

.custom-theme-panel__btn:hover {
  opacity: 0.85;
}

.custom-theme-panel__btn--cancel {
  background: transparent;
  border: 1px solid rgba(var(--theme-text), 0.15);
  color: rgba(var(--theme-text), 0.6);
}

.custom-theme-panel__btn--apply {
  background: rgba(var(--theme-text), 0.9);
  border: none;
  color: rgb(var(--theme-bg));
  font-weight: 600;
}
```

- [ ] **Step 2: 运行 typecheck + lint**

Run: `bun run typecheck && bun run lint`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add src/renderer/src/styles/global.css
git commit -m "feat: 新增自定义色块虚线样式 + 取色面板 CSS"
```

---

### Task 11: 端到端验证

- [ ] **Step 1: 启动开发服务器**

Run: `bun run dev`
Expected: Electron 窗口正常打开

- [ ] **Step 2: 验证预设主题不受影响**

打开阅读器 → 外观设置 → 逐个点击 8 个预设主题色块。
Expected: 每个主题正常切换，背景色/文字色/噪点纹理都正确。

- [ ] **Step 3: 验证自定义色块外观**

确认第 9 个色块显示为虚线圆环 + 彩虹渐变 + 中心「+」号，与预设色块的实心风格明显不同。

- [ ] **Step 4: 验证取色面板**

点击自定义色块 → 取色面板展开。确认：
- 预览区显示 obsidian 默认色
- 背景色/文字色并排显示
- 色块方块可点击弹出原生色板
- hex 输入框可编辑
- EyeDropper 🎯 按钮可用（点击后鼠标变放大镜，可取屏幕外颜色）

- [ ] **Step 5: 验证应用自定义主题**

在取色面板中选好颜色 → 点击「应用」。确认：
- 阅读器背景/文字/强调色切换到自定义颜色
- 噪点纹理自动关闭
- 自定义色块变为已设置状态（虚线环 + bg/text 预览）

- [ ] **Step 6: 验证预设-自定义切换**

切换到预设主题 → 再点击自定义色块。确认：自定义主题恢复（之前保存的颜色）。

- [ ] **Step 7: 运行完整测试套件**

Run: `bun run typecheck && bun run lint && bun run test`
Expected: 全部 PASS

- [ ] **Step 8: 提交（如有调整）**

```bash
git add -A
git commit -m "fix: 自定义主题色端到端验证调整"
```
