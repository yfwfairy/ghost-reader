# Phase 3：阅读器沉浸式新手引导设计规范

> 日期：2026-04-16
> 状态：已实现

## 背景

用户首次进入阅读器时，需要沉浸式引导体验。直接在界面上高亮（spotlight）各个按钮并附上引导词，让用户在真实 UI 上认识功能。

## 引导流程（两阶段）

### 阶段 1：聚光灯引导（步骤 0-5）

依次高亮界面按钮，附上下文 tooltip：

| 步骤 | 目标元素 | tooltip 位置 | 类型 | 内容 |
|------|---------|-------------|------|------|
| 0 | `.app-frame__pin` | 下方 | 普通 | 置顶窗口 — 点击后阅读窗口会始终显示在最前面～ |
| 1 | `.app-frame__back` | 下方 | 普通 | 返回书架 — 从这里回到书架，挑选下一本书。 |
| 2 | `.app-frame__fullscreen` | 下方 | 交互 | 沉浸模式 — 点击试试全屏沉浸阅读！ |
| 3 | *(全屏中，无目标)* | 屏幕中央 | 交互 | 退出沉浸 — 点击阅读区域或按 ESC 退出。 |
| 4 | `.reader-bottom-nav__btn:first-child` | 上方 | 普通 | 章节目录 — 点击打开目录，快速跳转章节。 |
| 5 | `.reader-bottom-nav__btn:last-child` | 上方 | 普通 | 外观设置 — 调整字体、字号、主题色等。 |

**自动衔接**：
- 步骤 2→3：用户点击全屏 → `immersive=true` → 自动推进
- 步骤 3→4：用户退出沉浸 → `immersive=false` → 自动推进

### 阶段 2：快捷键卡片（步骤 6）

居中弹出卡片，展示键盘快捷键（2 步）：
1. 翻页浏览：PGUP/PGDN + ←/→
2. 更多快捷键：⌘+B、⌘+=/−

## 技术方案

### 聚光灯机制

使用 `box-shadow: 0 0 0 200vmax rgba(0,0,0,0.55)` 创建暗色遮罩中的透明孔洞：
- 普通步骤：额外渲染全屏 click-blocker 阻止其他交互
- 交互步骤：不渲染 blocker，让点击穿透到真实按钮
- Tooltip 通过 `getBoundingClientRect()` 动态定位

### 数据层

- `AppConfig.onboardingCompleted: boolean`，默认 `false`
- 通过 `electron-store` 持久化

### z-index 层级

```
spotlight-blocker:  200
spotlight-hole:     201
spotlight-tooltip:  202
reader-guide:       203 (快捷键卡片)
```

### ESC 行为

- 聚光灯阶段（非沉浸退出步骤）：ESC 跳过引导，`stopPropagation`
- 沉浸退出步骤（步骤 3）：不拦截 ESC，让用户退出沉浸模式
- 快捷键卡片阶段：ESC 跳过引导，`stopPropagation`

## 修改文件清单

| 文件 | 操作 |
|------|------|
| `src/shared/types.ts` | AppConfig 新增 `onboardingCompleted` |
| `src/shared/constants.ts` | 默认值 `false` |
| `src/shared/i18n/en.ts` | 新增 `guide.*` 聚光灯 + 快捷键 key |
| `src/shared/i18n/zh.ts` | 同上（简体中文） |
| `src/shared/i18n/zh-TW.ts` | 同上（繁体中文） |
| `src/renderer/src/components/reader/ReaderGuide.tsx` | 两阶段引导组件 |
| `src/renderer/src/components/reader/ReaderPage.tsx` | 集成引导（传递 immersive prop） |
| `src/renderer/src/styles/global.css` | 聚光灯 + tooltip + 卡片样式 |

## i18n Key 清单

### 聚光灯引导

| Key | en | zh | zh-TW |
|-----|----|----|-------|
| `guide.pinTitle` | Pin Window | 置顶窗口 | 置頂視窗 |
| `guide.pinDesc` | Tap to keep the reader always on top~ | 点击后阅读窗口会始终显示在最前面～ | 點擊後閱讀視窗會始終顯示在最前面～ |
| `guide.backTitle` | Back to Bookshelf | 返回书架 | 返回書架 |
| `guide.backDesc` | Return here to pick your next book. | 从这里回到书架，挑选下一本书。 | 從這裡回到書架，挑選下一本書。 |
| `guide.fullscreenTitle` | Immersive Mode | 沉浸模式 | 沉浸模式 |
| `guide.fullscreenDesc` | Tap to try immersive reading! | 点击试试全屏沉浸阅读！ | 點擊試試全螢幕沉浸閱讀！ |
| `guide.immersiveExitTitle` | Exit Immersive | 退出沉浸 | 退出沉浸 |
| `guide.immersiveExitDesc` | Click the reading area or press ESC to exit. | 点击阅读区域或按 ESC 退出沉浸模式。 | 點擊閱讀區域或按 ESC 退出沉浸模式。 |
| `guide.chaptersTitle` | Table of Contents | 章节目录 | 章節目錄 |
| `guide.chaptersDesc` | Open the chapter list to jump to any chapter. | 点击打开目录，快速跳转章节。 | 點擊開啟目錄，快速跳轉章節。 |
| `guide.appearanceTitle` | Display Settings | 外观设置 | 外觀設定 |
| `guide.appearanceDesc` | Adjust font, size, theme, and more. | 调整字体、字号、主题色等阅读偏好。 | 調整字體、字號、主題色等閱讀偏好。 |

### 快捷键卡片

| Key | en | zh | zh-TW |
|-----|----|----|-------|
| `guide.step1Title` | Navigate Pages | 翻页浏览 | 翻頁瀏覽 |
| `guide.step1Desc` | Use Page Up / Page Down to scroll, and arrow keys to switch chapters. | 使用 Page Up / Down 逐行滚动，左右方向键切换章节。 | 使用 Page Up / Down 逐行捲動，左右方向鍵切換章節。 |
| `guide.step2Title` | More Shortcuts | 更多快捷键 | 更多快捷鍵 |
| `guide.step2Desc` | ⌘/Ctrl+B to return to bookshelf. ⌘/Ctrl+=/− to adjust font size. | ⌘/Ctrl+B 返回书架，⌘/Ctrl+=/- 调节字号。 | ⌘/Ctrl+B 返回書架，⌘/Ctrl+=/- 調整字號。 |

### 通用

| Key | en | zh | zh-TW |
|-----|----|----|-------|
| `guide.next` | Next | 下一步 | 下一步 |
| `guide.skip` | Skip | 跳过 | 跳過 |
| `guide.tryIt` | Try it | 试一试 | 試一試 |
| `guide.finish` | Start Reading | 开始阅读 | 開始閱讀 |
