# 自定义主题色设计

## 概述

在阅读器外观设置的主题色选择器中，新增一个自定义主题槽位。用户通过 EyeDropper 屏幕取色、原生色板选择或直接输入 hex 值来设定背景色和文字色，accent 强调色自动派生。本功能为 v0.3.0 P0 优先级，独立于 SQLite 迁移和书签/高亮系统。

---

## 1. 类型系统变更

### 1.1 ColorTheme 扩展

```typescript
// src/shared/types.ts
export type ColorTheme = 'obsidian' | 'parchment' | 'midnight' | 'onyx' | 'ember' | 'forest' | 'ocean' | 'slate' | 'custom'
```

### 1.2 AppConfig 新增字段

```typescript
export interface AppConfig {
  // ... 现有字段不变
  colorTheme: ColorTheme
  customThemeBg?: string    // hex 格式，如 '#2b3a2e'
  customThemeText?: string  // hex 格式，如 '#c8d4c0'
}
```

`customThemeBg` 和 `customThemeText` 仅在 `colorTheme === 'custom'` 时有意义。未设置时 fallback 到 obsidian 主题的默认值。

---

## 2. resolveTheme helper

新增统一的主题解析函数，替代所有直接访问 `THEME_MAP[colorTheme]` 的地方：

```typescript
// src/shared/constants.ts

export function lerpColor(a: string, b: string, t: number): string {
  const parse = (hex: string) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
  const ca = parse(a), cb = parse(b)
  const lerp = (x: number, y: number) => Math.round(x + (y - x) * t)
  const r = lerp(ca[0], cb[0]), g = lerp(ca[1], cb[1]), b2 = lerp(ca[2], cb[2])
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b2.toString(16).padStart(2, '0')}`
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

**accent 派生算法**：bg 和 text 的 40% 线性插值。观察现有 8 个预设主题，accent 明度都介于 bg 和 text 之间、偏向 bg 一侧，40% 插值能很好拟合这个规律。

---

## 3. 主题选择器 UI

### 3.1 自定义色块

在现有 8 个预设色块末尾新增一个自定义色块，通过虚线圆环与预设色块的实心样式区分：

- **未设置自定义色**：外层 `2px dashed` 虚线圆环，内部彩虹渐变环 + 中心「+」号
- **已设置自定义色**：外层虚线圆环，内部显示已选 bg/text 预览（与预设色块相同的「A」字母）
- **选中态**：虚线颜色加亮（如 `#888`）

交互：
- 当前主题不是 custom 时，点击自定义色块 → 如果已有保存值则直接切换到 `custom` 主题，同时展开取色面板供修改
- 当前主题已是 custom 时，点击自定义色块 → 展开/收起取色面板
- 点击未设置过的自定义色块 → 展开取色面板（以 obsidian 默认值填充）

### 3.2 取色面板（CustomThemePanel）

点击自定义色块后，在色块行下方展开一个紧凑面板（宽度跟随父容器），包含：

**实时预览区：**
- 以当前选中的 bg 为背景，text 为文字色
- 显示中英文混合示例文本
- 随用户操作实时更新（纯组件内 state，不写 config）

**背景色 + 文字色（同一行，左右并排）：**

每个颜色区块包含三种输入方式：
1. **色块方块**（24×24px 圆角方块）→ 点击弹出原生 `<input type="color">` 色板
2. **hex 输入框** → 直接键入 `#rrggbb`，回车或失焦生效
3. **🎯 EyeDropper 按钮** → 调用 `new EyeDropper().open()` 取屏幕任意位置颜色

**底部操作按钮：**
- 「取消」→ 关闭面板，不保存
- 「应用」→ 调用 `updateConfig({ colorTheme: 'custom', customThemeBg, customThemeText, noiseTexture: false })`，关闭面板

### 3.3 EyeDropper API

```typescript
const eyeDropper = new EyeDropper()
const result = await eyeDropper.open()
// result.sRGBHex → '#rrggbb'
```

- Electron 35 (Chromium 134) 原生支持，无需 polyfill
- 加 `typeof EyeDropper !== 'undefined'` 检查，不可用时隐藏 🎯 按钮（保留色板和 hex 输入）
- 取色期间 EyeDropper 自带放大镜 UI，可取屏幕任意位置（包括应用外部）

---

## 4. 噪点纹理处理

- `NOISE_MAP` 类型从 `Record<ColorTheme, string>` 改为 `Partial<Record<ColorTheme, string>>`，不含 `custom` 键
- 首次应用自定义主题时，`updateConfig` 同时设置 `noiseTexture: false`
- 用户可手动重开噪点开关，此时 fallback 到 obsidian 噪点图
- ReaderPage 中噪点取值：`NOISE_MAP[config.colorTheme] ?? NOISE_MAP.obsidian`

---

## 5. 集成变更

所有 `THEME_MAP[colorTheme]` 的直接访问改为 `resolveTheme(config)`，涉及约 5 处：

| 位置 | 当前代码 | 改为 |
|------|---------|------|
| `ReaderPage.tsx` CSS 变量同步 | `THEME_MAP[activeConfig.colorTheme]` | `resolveTheme(activeConfig)` |
| `TxtRenderer.tsx` 文字色 | `THEME_MAP[config.colorTheme].text` | `resolveTheme(config).text`（需要扩展 props 传入 customThemeBg/customThemeText，或直接传入已解析的 ThemeColors） |
| `EpubRenderer.tsx` 初始化 | `THEME_MAP[colorThemeRef.current].text` | `resolveTheme(...)` |
| `EpubRenderer.tsx` 热更新 | `THEME_MAP[colorTheme].text` | `resolveTheme(...)` |
| `ReaderDrawer.tsx` 色块展示 | `THEME_MAP[key]`（遍历预设） | 预设部分不变，自定义色块单独处理 |

**TxtRenderer / EpubRenderer 传参方案**：为避免把 AppConfig 的 custom 字段一路透传，改为在 ReaderPage 中通过 `resolveTheme(activeConfig)` 计算出 `ThemeColors`，将 `themeTextColor: string` 作为 prop 传入。这样 TxtRenderer 和 EpubRenderer 只需要一个颜色字符串，不需要知道自定义主题的存在。

---

## 6. 数据流

```
点击自定义色块
  → 展开 CustomThemePanel（回显已保存值或 obsidian 默认值）
  → 用户通过 EyeDropper / 色板 / hex 修改颜色
  → 面板内 state 实时更新预览
  → 点击「应用」
    → updateConfig({ colorTheme: 'custom', customThemeBg, customThemeText, noiseTexture: false })
    → config 变化触发 ReaderPage useEffect
    → resolveTheme(config) → { bg, text, accent }
    → CSS 变量更新：--theme-bg, --theme-text, --theme-accent
    → TxtRenderer / EpubRenderer 收到新的 themeTextColor prop
    → 全局 60+ CSS 规则自动刷新
```

---

## 7. i18n 新增 key

| key | en | zh | zh-TW |
|-----|----|----|-------|
| `appearance.customTheme` | Custom | 自定义 | 自訂 |
| `appearance.customPanel.bg` | Background | 背景 | 背景 |
| `appearance.customPanel.text` | Text | 文字 | 文字 |
| `appearance.customPanel.preview` | Preview | 预览效果 | 預覽效果 |
| `appearance.customPanel.pickColor` | Pick color | 取色 | 取色 |
| `appearance.customPanel.apply` | Apply | 应用 | 套用 |
| `appearance.customPanel.cancel` | Cancel | 取消 | 取消 |

---

## 8. 文件变更清单

### 新增

| 文件 | 说明 |
|------|------|
| `src/renderer/src/components/reader/CustomThemePanel.tsx` | 取色面板组件（预览 + EyeDropper/色板/hex 输入 + 确认取消） |

### 修改

| 文件 | 说明 |
|------|------|
| `src/shared/types.ts` | `ColorTheme` 加 `'custom'`，`AppConfig` 加 `customThemeBg?` / `customThemeText?` |
| `src/shared/constants.ts` | 新增 `lerpColor()` + `resolveTheme()` |
| `src/renderer/src/components/reader/ReaderDrawer.tsx` | 色块行末尾加虚线自定义色块 + 展开 CustomThemePanel |
| `src/renderer/src/components/reader/ReaderPage.tsx` | `THEME_MAP[...]` → `resolveTheme(...)`，计算 themeTextColor prop |
| `src/renderer/src/components/reader/TxtRenderer.tsx` | 接收 `themeTextColor` prop 替代 `THEME_MAP[colorTheme].text` |
| `src/renderer/src/components/reader/EpubRenderer.tsx` | 同上 |
| `src/renderer/src/assets/noise/index.ts` | `NOISE_MAP` 类型改 `Partial` + fallback |
| `src/renderer/src/styles/global.css` | 虚线色块 + 取色面板样式 |
| `src/shared/i18n/en.ts` / `zh.ts` / `zh-TW.ts` | 新增面板翻译 key |

---

## 9. 开发分支

从 `main` 新建 `feat/v0.3.0` 分支，所有 v0.3.0 功能（含本需求 + 后续 SQLite 迁移/书签/高亮）在此分支开发。

---

## 10. 不在范围内

- 多个自定义主题槽位 → 视用户反馈后续版本考虑
- 自定义噪点纹理 → 不做
- 自定义 accent 色 → 当前自动派生，后续可开放
