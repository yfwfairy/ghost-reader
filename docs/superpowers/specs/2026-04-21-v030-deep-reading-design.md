# Ghost Reader v0.3.0 — 深度阅读 + SQLite 全面迁移

## 概述

v0.3.0 聚焦两个主题：**深度阅读体验**（书签系统 + 高亮标注/笔记）和**存储层全面迁移**（electron-store → SQLite）。同时收尾 v0.2.0 遗留的两个性能优化项。PDF 支持延至 v0.4.0。

---

## 1. 存储层：SQLite 全面迁移

### 1.1 技术选型

- **库**：better-sqlite3（同步 API、高性能、Electron 桌面端标准选择）
- **编译**：配合 electron-rebuild 编译 native 模块
- **数据库位置**：`app.getPath('userData')/ghost-reader.db`（macOS: `~/Library/Application Support/Ghost Reader/`）
- **WAL 模式**：`initDatabase()` 首行执行 `db.pragma('journal_mode = WAL')`，提升并发读写性能

### 1.2 Schema

```sql
-- 配置（替代 electron-store 的 config）
CREATE TABLE config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL  -- JSON 序列化
);

-- 书籍（替代 electron-store 的 books[]）
CREATE TABLE books (
  id           TEXT PRIMARY KEY,  -- 格式: "{format}:{filePath}"
  title        TEXT NOT NULL,
  author       TEXT DEFAULT '',
  format       TEXT NOT NULL CHECK(format IN ('txt','epub')),
  file_path    TEXT NOT NULL,
  cover_path   TEXT,              -- 封面文件相对路径（如 "covers/abc.jpg"）
  word_count   INTEGER DEFAULT 0,
  is_missing   INTEGER DEFAULT 0, -- 源文件丢失标记
  imported_at  TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX idx_books_updated_at ON books(updated_at DESC);
CREATE INDEX idx_books_imported_at ON books(imported_at DESC);

-- 阅读进度（替代 electron-store 的 progress[]）
CREATE TABLE reading_progress (
  book_id          TEXT PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
  percentage       REAL DEFAULT 0,
  txt_scroll_top   REAL,
  epub_cfi         TEXT,
  chapter_progress TEXT,  -- JSON: Record<href, scrollPercent>
  updated_at       TEXT NOT NULL
);

-- EPUB locations 缓存（替代 electron-store 的 locations）
CREATE TABLE epub_locations (
  book_id   TEXT PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
  locations TEXT NOT NULL  -- JSON string
);

-- 书签（新功能）
CREATE TABLE bookmarks (
  id         TEXT PRIMARY KEY,  -- UUID
  book_id    TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  position   TEXT NOT NULL,     -- TXT: scrollTop, EPUB: CFI
  title      TEXT,              -- 用户自定义标题，可选
  created_at TEXT NOT NULL
);
CREATE INDEX idx_bookmarks_book ON bookmarks(book_id);

-- 高亮标注（新功能）
CREATE TABLE highlights (
  id          TEXT PRIMARY KEY,  -- UUID
  book_id     TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  position    TEXT NOT NULL,     -- EPUB: CFI range, TXT: {paragraphIndex, startOffset, endOffset} JSON
  text        TEXT NOT NULL,     -- 被高亮的原文内容
  color       TEXT NOT NULL,     -- 预设色名或 hex 值
  note        TEXT,              -- 附加笔记，可选
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
CREATE INDEX idx_highlights_book ON highlights(book_id);
```

### 1.3 封面存储优化

**方案：封面提取为独立文件**

- 提取封面时压缩至 300px 宽度，存为 `userData/covers/{bookId}.jpg`
- 数据库 `cover_path` 字段仅存储相对路径（如 `covers/abc.jpg`）
- 注册 Electron 自定义协议 `ghost-cover://`，渲染层通过 `ghost-cover://covers/{bookId}.jpg` 加载封面图
- 避免 base64 大文本拖慢 `SELECT * FROM books` 查询

### 1.4 文件丢失检测

- `books` 表增加 `is_missing INTEGER DEFAULT 0` 字段
- 主进程读取文件时若捕获 `ENOENT`，标记 `is_missing = 1`
- 渲染层对丢失书籍显示「文件丢失 / 重新定位」UI 提示
- 用户重新选择文件路径后更新 `file_path` 并重置 `is_missing = 0`

### 1.5 数据访问层

新增 `src/main/database.ts`，封装全部 SQLite 操作：

- `initDatabase()` — 建表、开启 WAL、执行迁移（如需）
- `configRepo` — get / set / patch
- `bookRepo` — getAll / getById / upsert / remove
- `progressRepo` — get / save / remove
- `locationsRepo` — get / set / remove
- `bookmarkRepo` — list / add / update / remove
- `highlightRepo` — list / add / update / remove

**最佳实践：**

- 各 Repo 在模块顶部缓存预编译语句（`db.prepare(...)`），避免运行时重复解析 SQL
- 批量操作使用 `db.transaction()` 包裹

### 1.6 迁移策略（electron-store → SQLite）

新增 `src/main/migration.ts`：

1. 应用启动时检测 `ghost-reader.db` 是否存在
2. 不存在 → 建表 → 读取旧 electron-store JSON → 事务写入 SQLite
3. 迁移完成后在 `config` 表写入 `migrated_from_v2 = true`
4. **不删除旧 JSON 文件**（作为备份）
5. 迁移用 `db.transaction()` 包裹，失败时回退到旧 JSON 继续使用
6. 封面 base64 → 解码为文件写入 `covers/` 目录

```typescript
const migrateData = db.transaction((oldBooks, oldProgress, oldConfig, oldLocations) => {
  for (const book of oldBooks) insertBookStmt.run(book)
  for (const prog of oldProgress) insertProgressStmt.run(prog)
  for (const [k, v] of Object.entries(oldConfig)) insertConfigStmt.run(k, JSON.stringify(v))
  for (const [bookId, data] of Object.entries(oldLocations)) insertLocationsStmt.run(bookId, data)
  insertConfigStmt.run('migrated_from_v2', 'true')
})
```

---

## 2. 书签系统

### 2.1 入口：「更多」菜单

- 阅读页顶部工具栏右侧新增「更多」按钮（`more_horiz` Material Symbol）
- 点击弹出下拉菜单：
  - `bookmark_add` 添加书签 — 在当前位置创建书签
  - `bookmarks` 书签列表 — 打开左侧面板 · 书签 Tab
  - `highlight` 高亮列表 — 打开左侧面板 · 高亮 Tab
- 点击外部区域自动关闭

### 2.2 添加书签

- 点击「添加书签」→ 在当前阅读位置创建书签
- 弹出轻量 Toast 提示「已添加书签」
- 书签自动命名（如「第 3 章 · 42%」），支持后续在面板中重命名

### 2.3 书签面板（AnnotationPanel · 书签 Tab）

**布局：**
- 从阅读内容区域**左侧推入**，向右挤压阅读内容（非覆盖式）
- 面板高度与阅读内容区域平齐（不含顶部工具栏）
- 宽度固定 280px，阅读内容自适应剩余空间
- 面板与内容之间 1px `border-right` 分隔
- 平滑展开/收起动画（`transition: width/margin`）

**与 ReaderDrawer 的关系：**
- 目录抽屉从右侧覆盖展开（现有行为不变）
- 书签/高亮面板从左侧推入
- 两者可同时打开，互不冲突

**面板内容：**
- 按时间倒序列出当前书籍的全部书签
- 每条显示：自定义标题（或自动标题）+ 创建时间 + 所在章节
- 点击书签 → 跳转到对应位置
- 鼠标悬停显示删除/重命名按钮

### 2.4 位置记录

- TXT 格式：存储 `scrollTop` 像素值
- EPUB 格式：存储 CFI（精确到段落级别）

### 2.5 数据流

```
用户点击「添加书签」
  → Renderer 调用 window.api.addBookmark({ bookId, position, title? })
  → Main 进程 bookmarkRepo.add() 写入 SQLite
  → 返回新书签对象
  → Renderer 更新面板列表 + Toast 提示
```

---

## 3. 高亮标注 + 笔记

### 3.1 创建高亮

- 用户在阅读内容中选中文本 → 选区上方弹出浮动工具栏（SelectionToolbar）
- 工具栏内容：4 个预设色圆点 + 1 个自定义色按钮（`palette` 图标，展开 hex 输入）
- 点击任意颜色 → 立即创建高亮，文本背景变色
- 工具栏消失，显示轻量 Toast「已添加高亮」

### 3.2 预设颜色

```typescript
const HIGHLIGHT_PRESETS = [
  { name: 'yellow', hex: '#fde68a' },  // amber-200
  { name: 'green',  hex: '#bbf7d0' },  // green-200
  { name: 'blue',   hex: '#bfdbfe' },  // blue-200
  { name: 'red',    hex: '#fecaca' },  // red-200
] as const
```

暗色主题下自动降低不透明度至 40%，保证文字可读性。自定义颜色通过 hex 输入框添加。

### 3.3 附加笔记

- 点击已有高亮文本 → 再次弹出浮动工具栏，增加「笔记」按钮（`edit_note` 图标）
- 点击「笔记」→ 工具栏下方展开小型文本输入框（最多 500 字）
- 输入后确认保存，高亮上出现小角标（`comment` 图标）表示有笔记

### 3.4 编辑 / 删除

- 点击已有高亮 → 浮动工具栏显示：换色圆点 + 笔记按钮 + 删除按钮（`delete` 图标）
- 换色：点击其他颜色即刻切换
- 删除：高亮和附属笔记一起移除

### 3.5 高亮列表（AnnotationPanel · 高亮 Tab）

- 与书签共享左侧推入面板，通过 Tab 切换
- 列表按章节分组
- 每条显示：高亮文本摘要（截断 80 字）+ 颜色标记 + 笔记预览（如有）+ 时间
- 点击条目 → 跳转到对应位置

### 3.6 TXT vs EPUB 差异处理

| | EPUB | TXT |
|--|------|-----|
| 选区获取 | epubjs `rendition.on('selected')` 事件，返回 CFI Range | 原生 `window.getSelection()`，计算段落 offset |
| 位置存储 | CFI Range 字符串 | `{ paragraphIndex, startOffset, endOffset }` JSON |
| 渲染高亮 | epubjs `rendition.annotations.highlight()` API | 自定义 `<mark>` 标签包裹对应文本范围 |
| 持久化恢复 | 打开时从 SQLite 读取 → 逐条调用 `annotations.highlight()` | 打开时读取 → 根据 offset 重建 `<mark>` 标签 |

---

## 4. 性能优化收尾

v0.2.0 遗留的两个尾巴：

### 4.1 SettingsPanel 懒加载

- `BookshelfPage.tsx` 中 `import { SettingsPanel }` 改为 `React.lazy(() => import(...))`
- 包裹 `<Suspense>` fallback

### 4.2 EPUB 进度保存防抖

- 当前 EPUB `relocated` 事件每次直接调用 `window.api.saveProgress()`（无防抖）
- 改为复用 ReaderPage 已有的 `saveProgressLater`（800ms debounce）
- 与 TXT 行为统一，IPC 调用从约 30次/秒 降至约 1次/0.8秒

---

## 5. 新手引导更新

现有 ReaderGuide 引导步骤不变，末尾追加一步：

- **target**：「更多」按钮
- **内容**：「点击这里管理书签和高亮标注」
- **位置**：按钮下方弹出

ReaderGuide 已是 React.lazy 加载，无额外性能影响。

---

## 6. IPC Channel 全景图

### 现有（迁移至 SQLite）

| Channel | 方向 | 说明 |
|---------|------|------|
| `config:get` | R→M | 获取全部配置 |
| `config:set` | R→M | 更新配置（patch） |
| `config:changed` | M→R | 配置变更广播 |
| `books:getAll` | R→M | 获取书籍列表 |
| `books:import` | R→M | 导入书籍文件 |
| `books:remove` | R→M | 删除书籍（级联删除进度/书签/高亮/locations/封面文件） |
| `progress:get` | R→M | 获取指定书籍进度 |
| `progress:save` | R→M | 保存阅读进度 |
| `locations:get` | R→M | 获取 EPUB locations 缓存 |
| `locations:set` | R→M | 保存 EPUB locations 缓存 |
| `file:read` | R→M | 读取文件内容 |
| `file:openDialog` | R→M | 打开文件选择对话框 |
| `window:*` | R→M | 窗口控制 |

### 新增

| Channel | 方向 | 说明 |
|---------|------|------|
| `bookmark:list` | R→M | 获取指定书籍的全部书签 |
| `bookmark:add` | R→M | 添加书签，返回新书签对象 |
| `bookmark:update` | R→M | 更新书签标题 |
| `bookmark:remove` | R→M | 删除书签 |
| `highlight:list` | R→M | 获取指定书籍的全部高亮 |
| `highlight:add` | R→M | 添加高亮（含可选笔记） |
| `highlight:update` | R→M | 更新高亮颜色/笔记 |
| `highlight:remove` | R→M | 删除高亮 |

---

## 7. 类型定义新增

`src/shared/types.ts`：

```typescript
interface Bookmark {
  id: string
  bookId: string
  position: string       // TXT: scrollTop, EPUB: CFI
  title: string | null
  createdAt: string
}

interface Highlight {
  id: string
  bookId: string
  position: string       // EPUB: CFI range, TXT: JSON offset
  text: string
  color: string
  note: string | null
  createdAt: string
  updatedAt: string
}

// 高亮预设色
const HIGHLIGHT_PRESETS = [
  { name: 'yellow', hex: '#fde68a' },
  { name: 'green',  hex: '#bbf7d0' },
  { name: 'blue',   hex: '#bfdbfe' },
  { name: 'red',    hex: '#fecaca' },
] as const
```

---

## 8. 文件变更清单

### 新增

| 文件 | 说明 |
|------|------|
| `src/main/database.ts` | SQLite 初始化 + 全部 Repo（WAL 模式、预编译语句） |
| `src/main/migration.ts` | electron-store → SQLite 事务迁移 |
| `src/renderer/src/components/reader/MoreMenu.tsx` | 「更多」下拉菜单 |
| `src/renderer/src/components/reader/AnnotationPanel.tsx` | 左侧推入面板（书签/高亮 Tab 切换） |
| `src/renderer/src/components/reader/SelectionToolbar.tsx` | 文本选中浮动工具栏 |
| `src/renderer/src/components/reader/ColorPicker.tsx` | 4 预设色 + hex 自定义 |
| `src/renderer/src/components/reader/HighlightRenderer.tsx` | TXT 模式高亮渲染（`<mark>` 管理） |

### 修改

| 文件 | 说明 |
|------|------|
| `src/main/ipc-handlers.ts` | 全部调用点切换至 database.ts + 新增 8 个 channel |
| `src/main/file-service.ts` | 封面提取改为写文件 + 压缩至 300px |
| `src/main/index.ts` | 启动时调 `initDatabase()`，注册 `ghost-cover://` 协议 |
| `src/preload/index.ts` | 新增 8 个 API 方法（bookmark/highlight CRUD） |
| `src/shared/types.ts` | 新增 Bookmark / Highlight 类型 |
| `src/shared/constants.ts` | 新增 HIGHLIGHT_PRESETS |
| `src/renderer/src/components/reader/ReaderLayout.tsx` | 接入 AnnotationPanel + MoreMenu 布局 |
| `src/renderer/src/components/reader/ReaderPage.tsx` | 书签/高亮状态管理 + EPUB 防抖修复 |
| `src/renderer/src/components/reader/EpubRenderer.tsx` | 接入选区事件 + 高亮渲染 |
| `src/renderer/src/components/reader/TxtRenderer.tsx` | 接入选区事件 + HighlightRenderer |
| `src/renderer/src/components/reader/ReaderGuide.tsx` | 追加「更多按钮」引导步骤 |
| `src/renderer/src/components/bookshelf/BookshelfPage.tsx` | SettingsPanel 改 React.lazy |
| `src/shared/i18n/en.ts` / `zh.ts` / `zh-TW.ts` | 新增翻译 key |

### 删除

| 文件 | 说明 |
|------|------|
| `src/main/store.ts` | 被 database.ts 完全取代 |

---

## 9. 不在 v0.3.0 范围内

- PDF 支持 → v0.4.0
- 笔记导出为 Markdown → v0.4.0
- 阅读统计（时长、完读册数、打卡）→ v0.4.0+
- 跨平台支持（Windows/Linux）→ 未规划
- 云同步 → 未规划
