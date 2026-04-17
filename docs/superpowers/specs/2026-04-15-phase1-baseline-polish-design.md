# Phase 1: 补全基础体验

> v0.2.0 第一阶段 —— 技术债务清理 + 快捷键绑定

## 背景

v0.1.0 发布后存在若干半成品：设置页展示了快捷键但未绑定、i18n key 定义了但未使用或硬编码、UI 元素无实际功能。Phase 1 的目标是在添加新功能前先补齐这些缺口，提升基线质量。

## 范围

本阶段包含两块工作：

1. **技术债务清理**：i18n 清理、硬编码修复、无功能 UI 处理
2. **快捷键绑定**：绑定已展示的 3 组快捷键 + 补充 3 组常见阅读快捷键

拖动书本加入书架已确认功能完整，仅占位符文本问题归入技术债务。

---

## 一、技术债务清理

### 1.1 移除未使用的 i18n key

以下 key 在三个 locale 文件（`en.ts`、`zh.ts`、`zh-TW.ts`）中定义但无实际作用：

| Key | 说明 |
|-----|------|
| `reader.chaptersPlaceholder` | 章节占位符文本，无组件使用 |
| `reader.appearancePlaceholder` | 外观占位符文本，无组件使用 |
| `recent.preview` | 预览文本，无组件使用 |
| `library.subtitleSingular` | 格式字符串未使用此参数，空字符串 |
| `library.subtitlePlural` | 格式字符串未使用此参数，空字符串 |

### 1.2 连接已有但未使用的 i18n key

| Key | 当前问题 | 修复方式 |
|-----|---------|---------|
| `error.readerTitle` | ErrorBoundary 硬编码 "Reader crashed" | 替换为 `t('error.readerTitle')` |
| `error.readerDescription` | 硬编码英文描述 | 替换为 `t('error.readerDescription')` |
| `error.backToShelf` | 硬编码 "Back to bookshelf" | 替换为 `t('error.backToShelf')` |
| `library.subtitleSingular` / `library.subtitlePlural` | 值为空字符串，`library.subtitle` 格式字符串未使用 `{1}` 占位符 | 移除这两个 key，`LibraryView.tsx` 调用简化为 `t('library.subtitle', books.length)` |

**涉及文件**：
- `src/renderer/src/App.tsx` — `ReaderErrorFallback` 组件，需将 `useTranslation` hook 的 `t` 函数传入或在组件内调用
- `src/renderer/src/components/bookshelf/LibraryView.tsx` — 简化 `library.subtitle` 调用

### 1.3 修复 AddToLibraryCard 占位符

**当前状态**：`src/renderer/src/components/bookshelf/AddToLibraryCard.tsx` 中硬编码 "Placeholder" 文本。

**修复**：替换为 i18n 化的拖放提示文案（如"拖放 TXT/EPUB 文件到此处"），新增对应 i18n key。

### 1.4 禁用书架搜索输入框

**当前状态**：`src/renderer/src/components/bookshelf/LibraryView.tsx` 中渲染了搜索 input，无 `onChange` 处理。

**修复**：保留 UI 但添加 `disabled` 属性 + 视觉灰化样式，Phase 2 搜索体系时启用。

---

## 二、快捷键绑定

### 2.1 架构

- 创建 `useKeyboardShortcuts` hook（`src/renderer/src/hooks/useKeyboardShortcuts.ts`）
- 在 `App.tsx` 级别通过 `useEffect` 注册全局 `keydown` 监听器
- 根据当前页面上下文（书架 / 阅读器 / EPUB / TXT）分发操作
- 存在文字输入焦点时（`<input>`、`<textarea>`、`contentEditable`）跳过快捷键处理
- macOS 使用 `event.metaKey`，其他平台使用 `event.ctrlKey`

### 2.2 快捷键清单

| 快捷键 | 作用 | 上下文 | 备注 |
|--------|------|--------|------|
| `PageUp` / `PageDown` | 上下滚动一行 | 阅读器 | 原设置页已展示，需更新 i18n 文案 |
| `Escape` | 关闭设置面板 / 退出沉浸模式 | 全局 | 原设置页已展示 |
| `F11` | 切换沉浸模式 | 阅读器 | 原设置页已展示 |
| `ArrowLeft` / `ArrowRight` | 上一章 / 下一章 | 阅读器（仅 EPUB） | 新增 |
| `Cmd/Ctrl + [` | 返回书架 | 阅读器 | 新增 |
| `Cmd/Ctrl + =` / `Cmd/Ctrl + -` | 增大 / 减小字号 | 阅读器 | 新增 |

### 2.3 Hook 接口设计

```typescript
interface KeyboardShortcutsContext {
  // 当前页面状态，由 App 传入
  currentView: 'bookshelf' | 'reader'
  bookFormat: 'txt' | 'epub' | null
  isImmersive: boolean
  isSettingsOpen: boolean

  // 操作回调
  onScrollLine: (direction: 'up' | 'down') => void
  onToggleImmersive: () => void
  onCloseSettings: () => void
  onNavigateChapter: (direction: 'prev' | 'next') => void
  onBackToShelf: () => void
  onChangeFontSize: (delta: number) => void
}

function useKeyboardShortcuts(ctx: KeyboardShortcutsContext): void
```

### 2.4 设置面板更新

更新 `SettingsPanel.tsx` 中的快捷键展示区，增加新增的 3 组快捷键显示。同时更新已有快捷键的文案。

**修改已有 i18n key**：

| Key | 当前中文 | 改为 | 当前英文 | 改为 |
|-----|---------|------|---------|------|
| `settings.shortcutPage` | 翻页 | 逐行滚动 | Page Up / Down | Scroll line |

**新增 i18n key**：

| Key | 中文 | 英文 |
|-----|------|------|
| `settings.shortcutChapter` | 切换章节 | Switch chapter |
| `settings.shortcutBack` | 返回书架 | Back to shelf |
| `settings.shortcutFontSize` | 调整字号 | Adjust font size |

---

## 不做的事情

- 不实现快捷键自定义（YAGNI）
- 不使用 Electron `globalShortcut`（无需窗口外响应）
- 不处理书架页的搜索功能（Phase 2）
- 不修改拖放核心逻辑（已完整可用）

---

## 影响的文件

| 文件 | 变更类型 |
|------|---------|
| `src/shared/i18n/en.ts` | 删除 5 key + 新增 3 key + 新增拖放提示 key |
| `src/shared/i18n/zh.ts` | 同上 |
| `src/shared/i18n/zh-TW.ts` | 同上 |
| `src/renderer/src/App.tsx` | ErrorBoundary i18n 化 + 注册 keyboard hook |
| `src/renderer/src/components/bookshelf/AddToLibraryCard.tsx` | 替换 Placeholder 文本 |
| `src/renderer/src/components/bookshelf/LibraryView.tsx` | 禁用搜索 input + 简化 subtitle 调用 |
| `src/renderer/src/components/settings/SettingsPanel.tsx` | 新增快捷键展示行 |
| `src/renderer/src/hooks/useKeyboardShortcuts.ts` | **新建** |
