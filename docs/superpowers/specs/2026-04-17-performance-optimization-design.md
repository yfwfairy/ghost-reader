# 性能优化设计规范

> 日期：2026-04-17
> 状态：待实现

## 背景

Ghost Reader v0.2.0 存在三个体验瓶颈：
1. **启动慢**：8 个字体 CDN `<link>` 在 `index.html` head 中同步加载，全部阻塞首屏渲染；全部组件（含 epubjs ~6.5MB）打包进单一 bundle
2. **包体大**：无代码分割、无 manualChunks、图片未压缩（static-texture.png 520KB + error-illustration.png 336KB）
3. **大型 EPUB 加载慢**：`book.locations.generate(1600)` CPU 密集且结果未缓存、每次打开 EPUB 向 iframe 注入 7 个字体样式表

本规范按优先级分为 P0（必做）、P1（推荐）、P2（可选）三档。

---

## 现状数据

| 指标 | 当前值 |
|------|--------|
| 字体 CDN 请求（启动） | 8 个，全阻塞 |
| EPUB iframe 字体注入 | 7 个样式表 / 每次打开 |
| 代码分割 | 无（零 `React.lazy`、零 `import()`） |
| Vite manualChunks | 未配置 |
| global.css | 4593 行单文件 |
| static-texture.png | 520KB PNG |
| error-illustration.png | 336KB PNG |
| epubjs locations 缓存 | 无 |

---

## P0：字体按需加载

### 问题

`src/renderer/index.html` 第 7-14 行加载了 8 个字体样式表。用户在书架页不需要任何阅读字体，但每次启动都要等所有字体下载/超时。

### 方案

**index.html 只保留 2 个基础字体**：
- Material Symbols Outlined（图标，全局使用）
- Manrope（UI 字体，书架标题/按钮用）

**其余阅读字体改为 JS 动态注入**。创建 `src/renderer/src/utils/font-loader.ts`：

```ts
// 字体 → CDN URL 映射
const FONT_CDN_MAP: Record<string, string> = {
  'Noto Serif SC': 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;500;600;700&display=swap',
  'Noto Sans SC': 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700&display=swap',
  'LXGW WenKai': 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css',
  'ShangTuDongGuanTi-Xi': 'https://chinese-fonts-cdn.deno.dev/packages/stdgt/dist/...result.css',
  'Yozai': 'https://chinese-fonts-cdn.deno.dev/packages/yozai/dist/Yozai-Regular/result.css',
  'GuanKiapTsingKhai-W': 'https://chinese-fonts-cdn.deno.dev/packages/GuanKiapTsingKhai/dist/GuanKiapTsingKhai-W/result.css',
  'Moon Stars Kai T HW': 'https://chinese-fonts-cdn.deno.dev/packages/moon-stars-kai/dist/MoonStarsKaiTHW-Regular/result.css',
  'LXGW WenKai TC': 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-tc-webfont@1.7.0/style.css',
  'Lora': 'https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&display=swap',
  'Newsreader': 'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&display=swap',
  'Merriweather': 'https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,300;0,400;0,700;1,300;1,400;1,700&display=swap',
  // Inter 是 Google Fonts 系统字体，Manrope 已在 index.html 中
}

const loaded = new Set<string>()

// 向 document 注入字体样式表（幂等）
export function loadFont(family: string): void {
  const url = FONT_CDN_MAP[family]
  if (!url || loaded.has(family)) return
  loaded.add(family)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

// 向 EPUB iframe document 注入字体样式表
export function loadFontIntoDocument(doc: Document, family: string): void {
  const url = FONT_CDN_MAP[family]
  if (!url) return
  // 幂等：避免重复注入
  if (doc.querySelector(`link[href="${url}"]`)) return
  const link = doc.createElement('link')
  link.rel = 'stylesheet'
  link.href = url
  doc.head.appendChild(link)
}
```

### 触发时机

| 场景 | 触发 | 加载内容 |
|------|------|----------|
| 进入阅读器 | ReaderPage mount | `loadFont(config.fontFamily)` |
| 切换字体 | ReaderDrawer onClick | `loadFont(newFamily)` |
| EPUB iframe 渲染 | `hooks.content.register` | `loadFontIntoDocument(doc, fontFamily)` |
| 字体 picker 悬浮 | hover / 显示时 | 预加载该 tab 下所有字体 |

### index.html 变更

```html
<!-- 保留 -->
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@200;400;600;700;800&display=swap" rel="stylesheet" />
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
<!-- 删除其余 6 个 link -->
```

### EpubRenderer 变更

删除 `FONT_STYLESHEETS` 常量和 `hooks.content.register` 中批量注入 7 个样式表的逻辑，改为只注入当前 `fontFamily` 对应的 1 个：

```ts
import { loadFontIntoDocument, loadFont } from '../../utils/font-loader'

// 在 useEffect 中：
hooks.content.register((contents) => {
  loadFontIntoDocument(contents.document, fontFamilyRef.current)
})
```

字体切换时（主题热更新 useEffect）也需要重新注入到已存在的 iframe：

```ts
// 在 themes.default(...) 之后，获取 EPUB iframe document 并注入新字体
const iframe = mountRef.current?.querySelector('iframe')
if (iframe?.contentDocument) {
  loadFontIntoDocument(iframe.contentDocument, fontFamily)
}
```

### 预期效果

- 书架首屏：8 个字体请求 → 2 个（Material Symbols + Manrope）
- EPUB 打开：7 个注入 → 1 个
- 弱网下启动提速 2-4 秒

---

## P0：代码分割 + epubjs 动态导入

### 问题

所有组件和 epubjs（~6.5MB）打包进单一 renderer bundle。用户在书架页加载了完整阅读器代码。

### 方案

#### Vite manualChunks 配置

`electron.vite.config.ts` 的 renderer 部分：

```ts
renderer: {
  plugins: [react()],
  resolve: { /* 不变 */ },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'epub-engine': ['epubjs'],
        },
      },
    },
  },
}
```

#### React.lazy 分割

在 `ReaderPage.tsx` 中：

```tsx
import { lazy, Suspense } from 'react'

const EpubRenderer = lazy(() => import('./EpubRenderer'))
const TxtRenderer = lazy(() => import('./TxtRenderer'))
```

渲染处包裹 `<Suspense>`（无需 fallback，外层已有 loading 状态）：

```tsx
<Suspense fallback={null}>
  {book.format === 'epub' && epubData ? (
    <EpubRenderer ... />
  ) : book.format === 'txt' ? (
    <TxtRenderer ... />
  ) : null}
</Suspense>
```

`ReaderGuide` 也可 lazy 化（仅首次引导显示）：

```tsx
const ReaderGuide = lazy(() => import('./ReaderGuide'))
```

#### EpubRenderer 内部 epubjs 动态导入

将 `import ePub from 'epubjs'` 改为 useEffect 内动态导入：

```tsx
// 删除顶层 import ePub from 'epubjs'

useEffect(() => {
  let cancelled = false

  async function init() {
    const { default: ePub } = await import('epubjs')
    if (cancelled || !mountRef.current) return

    const book = ePub(bookData)
    // ... 后续逻辑不变
  }

  void init()
  return () => { cancelled = true; /* cleanup */ }
}, [bookData])
```

### 分割粒度预期

| Chunk | 包含 | 触发加载 |
|-------|------|----------|
| `index` | App, BookshelfPage, hooks | 默认加载 |
| `react-vendor` | react, react-dom | 默认加载（缓存友好） |
| `reader-core` | ReaderPage, ReaderLayout, ReaderDrawer | 进入阅读器 |
| `epub-engine` | epubjs | 打开 EPUB |
| `EpubRenderer` | EpubRenderer 组件 | 打开 EPUB |
| `TxtRenderer` | TxtRenderer 组件 | 打开 TXT |
| `ReaderGuide` | 新手引导 | 首次引导 |

### 预期效果

- 书架首屏 JS 体积减少 ~60%
- EPUB 引擎按需加载，TXT 用户永远不会下载 epubjs

---

## P1：EPUB locations 缓存

### 问题

`book.locations.generate(1600)` 对大型 EPUB（数百章节）是 CPU 密集操作，每次打开同一本书都要重新计算，耗时可达 3-8 秒。

### 方案

#### 新增 IPC 和 store

`src/shared/types.ts` 新增：

```ts
export interface GhostReaderApi {
  // 新增
  getLocations: (bookId: string) => Promise<string | null>
  saveLocations: (bookId: string, locations: string) => Promise<void>
}
```

`src/main/store.ts` 新增 `locationsStore`：

```ts
type StoreShape = {
  config: AppConfig
  books: BookRecord[]
  progress: ReadingProgress[]
  locations: Record<string, string>  // bookId → JSON string
}

export const locationsStore = {
  get: (bookId: string): string | null => {
    const all = getStore().get('locations')
    return all[bookId] ?? null
  },
  set: (bookId: string, data: string): void => {
    const all = getStore().get('locations')
    getStore().set('locations', { ...all, [bookId]: data })
  },
  remove: (bookId: string): void => {
    const all = getStore().get('locations')
    const { [bookId]: _, ...rest } = all
    getStore().set('locations', rest)
  },
}
```

#### EpubRenderer 使用缓存

```ts
book.ready.then(async () => {
  // 收集 spine hrefs（不变）
  const spine = book.spine as unknown as { each: (fn: (item: { href: string }) => void) => void }
  const hrefs: string[] = []
  spine.each((item) => hrefs.push(item.href))
  handleSpineReady(hrefs)

  // 尝试加载缓存的 locations
  const bookId = /* 从 prop 或 context 获取 */
  const cached = await window.api.getLocations(bookId)

  if (cached) {
    book.locations.load(cached)
  } else {
    const locations = await book.locations.generate(1600)
    await window.api.saveLocations(bookId, JSON.stringify(locations))
  }

  if (!cancelled) {
    rendition.reportLocation()
  }
})
```

#### 清理时机

删除书籍时（`library:remove` handler）同步删除 locations 缓存：

```ts
locationsStore.remove(bookId)
```

### 预期效果

- 大型 EPUB 二次打开：locations 计算从 3-8s → 0s（直接加载缓存）
- 首次打开体验不变（仍需计算，但进度显示渐进可用）

---

## P1：EPUB 进度保存防抖

### 问题

`EpubRenderer` 的 `onProgressUpdate` 在 `relocated` 事件中直接调用 `void window.api.saveProgress()`，scrolled-doc 模式下滚动时频繁触发，产生大量 IPC 调用。而 `TxtRenderer` 已有 800ms 防抖。

### 方案

在 `ReaderPage.tsx` 中，将 EPUB 的 `onProgressUpdate` 也接入 `saveProgressLater` 防抖机制：

```tsx
// 当前实现（直接保存）
onProgressUpdate={(patch) => {
  const nextProgress = { bookId: book.id, ...patch, ... }
  setProgress(nextProgress)
  void window.api.saveProgress(nextProgress)  // 每次 relocated 都触发 IPC
}}

// 改为防抖
onProgressUpdate={(patch) => {
  const nextProgress = { bookId: book.id, ...patch, ... }
  saveProgressLater(nextProgress)  // 复用已有的 800ms 防抖
}}
```

需要调整 `saveProgressLater` 使其同时支持 TXT 和 EPUB 场景（目前已支持，只需移除 TXT 特有的命名约定）。

### 预期效果

- EPUB 滚动时 IPC 调用频率：~30次/秒 → 最多 1次/0.8秒
- 离开阅读器时 `flushPendingTxtProgress` 确保最终状态落盘

---

## P1：图片资源优化

### 问题

| 文件 | 大小 | 用途 |
|------|------|------|
| `static-texture.png` | 520KB | 阅读器 loading/error 背景噪点纹理 |
| `error-illustration.png` | 336KB | 未使用（已被内联 SVG 替代） |

### 方案

#### static-texture.png → CSS 实现

用 CSS SVG filter 替代 520KB 的噪点纹理图片：

```css
.reader-empty__static {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E");
  background-size: 256px 256px;
}
```

或压缩为 WebP（~80KB）。

#### error-illustration.png

确认是否还被引用。如果已无引用，直接删除。

### 预期效果

- 包体减少 ~520KB（如果用 CSS 替代）或 ~440KB（如果用 WebP）
- 如果 error-illustration.png 已无引用，额外减少 336KB

---

## P2：Vite 构建优化

### 方案

```ts
// electron.vite.config.ts renderer 部分补充
renderer: {
  build: {
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 生产环境移除 console.log
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
}
```

### 预期效果

- CSS 随组件 lazy 加载自动分割
- 生产包移除 console.log 输出

---

## P2：窗口启动优化

### 问题

`WindowManager.createBookshelfWindow` 创建窗口后立即 `loadURL/loadFile`，窗口可能在内容加载完成前闪白。

### 方案

```ts
// window-manager.ts
this.bookshelfWindow = new BrowserWindow({
  show: false,  // 初始不显示
  // ... 其余配置不变
})

this.bookshelfWindow.once('ready-to-show', () => {
  this.bookshelfWindow?.show()
})
```

### 预期效果

- 消除启动时白屏闪烁
- 视觉上感知更快（窗口出现即有内容）

---

## 修改文件清单

### P0 字体按需加载

| 文件 | 操作 |
|------|------|
| `src/renderer/index.html` | 删除 6 个字体 `<link>`，保留 Manrope + Material Symbols |
| `src/renderer/src/utils/font-loader.ts` | **新建**：字体 CDN 映射 + loadFont / loadFontIntoDocument |
| `src/renderer/src/components/reader/EpubRenderer.tsx` | 删除 `FONT_STYLESHEETS`，改用 `loadFontIntoDocument` 按需注入 |
| `src/renderer/src/components/reader/ReaderPage.tsx` | mount 时调用 `loadFont(config.fontFamily)` |
| `src/renderer/src/components/reader/ReaderDrawer.tsx` | 字体 picker 悬浮 / 切换时调用 `loadFont` |

### P0 代码分割

| 文件 | 操作 |
|------|------|
| `electron.vite.config.ts` | 新增 `manualChunks` 配置 |
| `src/renderer/src/components/reader/ReaderPage.tsx` | `React.lazy` 导入 EpubRenderer / TxtRenderer / ReaderGuide |
| `src/renderer/src/components/reader/EpubRenderer.tsx` | 顶层 `import ePub` 改为 useEffect 内 `await import('epubjs')` |

### P1 locations 缓存

| 文件 | 操作 |
|------|------|
| `src/shared/types.ts` | GhostReaderApi 新增 `getLocations` / `saveLocations` |
| `src/main/store.ts` | 新增 `locationsStore` |
| `src/main/ipc-handlers.ts` | 注册 `locations:get` / `locations:save` handler |
| `src/preload/index.ts` | 暴露 `getLocations` / `saveLocations` |
| `src/renderer/src/components/reader/EpubRenderer.tsx` | 使用缓存的 locations |
| `src/renderer/src/components/reader/ReaderPage.tsx` | 传递 `bookId` 给 EpubRenderer |

### P1 进度防抖

| 文件 | 操作 |
|------|------|
| `src/renderer/src/components/reader/ReaderPage.tsx` | EPUB onProgressUpdate 接入 `saveProgressLater` |

### P1 图片优化

| 文件 | 操作 |
|------|------|
| `src/renderer/src/assets/static-texture.png` | 删除或替换为 WebP |
| `src/renderer/src/styles/global.css` | CSS noise filter 替代 PNG 引用 |
| `src/renderer/src/assets/error-illustration.png` | 确认无引用后删除 |
| `src/renderer/src/components/reader/ReaderPage.tsx` | 移除 `import staticTexture` |

### P2 构建优化

| 文件 | 操作 |
|------|------|
| `electron.vite.config.ts` | 新增 cssCodeSplit / terser 配置 |

### P2 窗口启动

| 文件 | 操作 |
|------|------|
| `src/main/window-manager.ts` | `show: false` + `ready-to-show` |

---

## 不做的事情

- 不做 CSS Modules 迁移（改动面太大，收益有限）
- 不做 Service Worker 离线字体缓存（Electron 场景下 HTTP 缓存已足够）
- 不做 EPUB 流式传输 / SharedArrayBuffer（复杂度高，当前文件大小尚可）
- 不做 Web Worker locations 计算（缓存方案已解决二次加载问题）
- 不做 React 虚拟化（当前章节数规模不需要）

---

## 验证

1. `bun run typecheck && bun run lint` — 无错误
2. 书架页网络面板：仅 2 个字体请求（Manrope + Material Symbols）
3. 进入阅读器：按需加载当前字体（网络面板可见 1 个新请求）
4. 切换字体：对应字体 CSS 按需加载
5. EPUB 打开：iframe 仅注入 1 个字体样式表
6. 大型 EPUB 二次打开：无 locations.generate 调用（命中缓存）
7. EPUB 滚动：IPC 调用频率显著降低
8. `bun run build` 产物：确认 chunk 分割正确（react-vendor / epub-engine 独立 chunk）
