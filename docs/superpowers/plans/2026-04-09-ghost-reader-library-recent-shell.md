# Ghost Reader Library + Recent Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将当前 Ghost Reader 主窗口重构为 Stitch 风格的双导航壳层，在右侧切换 `Library` 网格视图和 `Recent` 横向大卡片视图，并保持现有单窗口阅读流程可用。

**Architecture:** 保留现有 `App -> AppFrame -> 页面` 的总体结构，但把旧版单一书架页改成一个持久化左侧导航壳层。数据层通过新的 renderer hook 聚合书籍与阅读进度，再分别映射给 `Library` 和 `Recent` 两个内容面板；阅读器入口继续沿用 `currentBookId` 驱动的单窗口切换。

**Tech Stack:** Electron, React, TypeScript, Vitest, Testing Library, CSS

---

## Context

已确认的设计 spec 位于 `docs/superpowers/specs/2026-04-09-ghost-reader-library-recent-shell-design.md`。本计划只覆盖主窗口 `Recent / Library / Settings` 壳层与右侧内容区重构，不重做阅读器阅读体验本身。

## Scope Check

这次改造仍然是一个单一纵向切片：把现有书架首页升级为新的 Stitch 风格主窗口壳层，并接入真实本地书籍与阅读进度数据。因此不再拆成多份计划，而是在一个计划里按“壳层状态 -> 数据聚合 -> Library -> Recent -> 样式收口”的顺序执行。

## File Map

- `src/renderer/src/App.tsx`: 新增 `Recent / Library / Reader` 三态切换，保留 `currentBookId` 驱动阅读器逻辑。
- `src/renderer/src/components/chrome/AppFrame.tsx`: 保留顶层窗口容器与置顶按钮，调整内容容器以承载新的双栏主界面。
- `src/renderer/src/hooks/useBookshelfData.ts`: 聚合 `getAllBooks()` 与 `getProgress()`，产出 `libraryBooks`、`recentBooks`、导入/删除操作。
- `src/renderer/src/components/bookshelf/BookshelfPage.tsx`: 改造成新的主壳层入口，负责左侧导航与右侧视图切换。
- `src/renderer/src/components/bookshelf/SidebarNav.tsx`: 新增，承载品牌区、`Recent`、`Library`、`Settings` 入口。
- `src/renderer/src/components/bookshelf/LibraryView.tsx`: 新增，承载 `Library with Leading Import Button` 的右侧内容区。
- `src/renderer/src/components/bookshelf/AddToLibraryCard.tsx`: 新增，网格第一项导入卡片。
- `src/renderer/src/components/bookshelf/LibraryBookCard.tsx`: 新增或从旧 `BookCard` 拆分，承载 Stitch 风格封面卡片。
- `src/renderer/src/components/bookshelf/RecentView.tsx`: 新增，承载 `Recent Encounters - Selected State` 的右侧内容区。
- `src/renderer/src/components/bookshelf/RecentBookCard.tsx`: 新增，承载横向大卡片。
- `src/renderer/src/styles/global.css`: 增加左侧导航、Library 网格、Recent 大卡片、空状态与交互视觉样式。
- `tests/renderer/app-shell.test.tsx`: 更新主壳层导航与阅读器切换测试。
- `tests/renderer/bookshelf-page.test.tsx`: 更新为新壳层行为测试。
- `tests/renderer/use-bookshelf-data.test.tsx`: 新增，验证 recent 过滤和排序规则。
- `tests/renderer/recent-view.test.tsx`: 新增，验证 recent 空状态与卡片内容。

## Milestones

| Milestone | Result | Tasks |
| --- | --- | --- |
| M1 | 主窗口可以在 `Recent` 与 `Library` 间切换 | Task 1 |
| M2 | `Library` 基于真实数据显示 Stitch 风格网格与导入卡片 | Task 2-3 |
| M3 | `Recent` 只显示有进度的书，并按最近阅读排序 | Task 2, 4 |
| M4 | 样式和交互贴近 Stitch 基线，主窗口与阅读器流程打通 | Task 5 |

### Task 1: Add the Persistent Shell Navigation

**Files:**
- Modify: `src/renderer/src/App.tsx`
- Modify: `src/renderer/src/components/bookshelf/BookshelfPage.tsx`
- Test: `tests/renderer/app-shell.test.tsx`
- Test: `tests/renderer/bookshelf-page.test.tsx`

- [ ] **Step 1: Write the failing shell navigation tests**

```tsx
it('keeps the bookshelf shell mounted while switching between library and recent', async () => {
  setupApi(null)

  render(<App />)

  expect(await screen.findByRole('button', { name: 'Open recent view' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
  expect(screen.getByRole('button', { name: 'Open library view' })).toHaveAttribute('aria-pressed', 'true')

  fireEvent.click(screen.getByRole('button', { name: 'Open recent view' }))

  expect(screen.getByRole('button', { name: 'Open recent view' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Open library view' })).toHaveAttribute('aria-pressed', 'false')
  expect(document.querySelector('.app-frame')).toBeInTheDocument()
})

it('returns from reader to the same shell instead of the legacy bookshelf header layout', async () => {
  setupApi('book-1')

  render(<App />)

  expect(await screen.findByText('第一段')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Back to bookshelf' }))

  expect(await screen.findByRole('button', { name: 'Open library view' })).toBeInTheDocument()
  expect(screen.queryByText('Bookshelf')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the renderer shell tests and verify they fail**

Run: `bunx vitest run tests/renderer/app-shell.test.tsx tests/renderer/bookshelf-page.test.tsx`

Expected: FAIL because `BookshelfPage` does not yet render `Open recent view` / `Open library view`, and the old bookshelf header is still present.

- [ ] **Step 3: Implement minimal shell state in `App.tsx` and `BookshelfPage.tsx`**

```tsx
export type HomeView = 'recent' | 'library'
export type AppPage = 'home' | 'reader'

const [page, setPage] = useState<AppPage>('home')
const [homeView, setHomeView] = useState<HomeView>('library')

<BookshelfPage
  activeView={homeView}
  onChangeView={setHomeView}
  onOpenReader={() => {
    setReaderTitle('Reading')
    setPage('reader')
  }}
/>
```

```tsx
type BookshelfPageProps = {
  activeView: 'recent' | 'library'
  onChangeView: (view: 'recent' | 'library') => void
  onOpenReader: () => void
}

<button
  type="button"
  aria-label="Open recent view"
  aria-pressed={activeView === 'recent'}
  onClick={() => onChangeView('recent')}
>
  Recent
</button>
<button
  type="button"
  aria-label="Open library view"
  aria-pressed={activeView === 'library'}
  onClick={() => onChangeView('library')}
>
  Library
</button>
```

- [ ] **Step 4: Re-run the shell tests and verify they pass**

Run: `bunx vitest run tests/renderer/app-shell.test.tsx tests/renderer/bookshelf-page.test.tsx`

Expected: PASS with the new shell navigation buttons present and reader back navigation returning to the shell.

- [ ] **Step 5: Commit the shell state changes**

```bash
git add src/renderer/src/App.tsx src/renderer/src/components/bookshelf/BookshelfPage.tsx tests/renderer/app-shell.test.tsx tests/renderer/bookshelf-page.test.tsx
git commit -m "feat: add recent and library shell navigation"
```

### Task 2: Build the Shared Bookshelf Data Source

**Files:**
- Create: `src/renderer/src/hooks/useBookshelfData.ts`
- Modify: `src/renderer/src/components/bookshelf/BookshelfPage.tsx`
- Test: `tests/renderer/use-bookshelf-data.test.tsx`

- [ ] **Step 1: Write the failing data hook tests**

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useBookshelfData } from '../../src/renderer/src/hooks/useBookshelfData'

it('filters recent books to entries with progress and sorts by progress.updatedAt desc', async () => {
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      getAllBooks: vi.fn().mockResolvedValue([
        { id: 'a', title: 'Alpha', author: 'A', format: 'txt', filePath: '/a', importedAt: 1, updatedAt: 1 },
        { id: 'b', title: 'Beta', author: 'B', format: 'txt', filePath: '/b', importedAt: 2, updatedAt: 2 },
        { id: 'c', title: 'Gamma', author: 'C', format: 'txt', filePath: '/c', importedAt: 3, updatedAt: 3 },
      ]),
      getProgress: vi
        .fn()
        .mockResolvedValueOnce({ bookId: 'a', percentage: 0.25, updatedAt: 10 })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ bookId: 'c', percentage: 0.6, updatedAt: 20 }),
      importBooks: vi.fn().mockResolvedValue([]),
      removeBook: vi.fn(),
    },
  })

  const { result } = renderHook(() => useBookshelfData())

  await waitFor(() => {
    expect(result.current.loading).toBe(false)
  })

  expect(result.current.recentBooks.map((book) => book.id)).toEqual(['c', 'a'])
  expect(result.current.libraryBooks.map((book) => book.id)).toEqual(['a', 'b', 'c'])
})
```

- [ ] **Step 2: Run the hook test to verify it fails**

Run: `bunx vitest run tests/renderer/use-bookshelf-data.test.tsx`

Expected: FAIL with `Cannot find module '../../src/renderer/src/hooks/useBookshelfData'`.

- [ ] **Step 3: Implement `useBookshelfData` with progress hydration**

```ts
import { useEffect, useState } from 'react'
import type { BookRecord, ReadingProgress } from '@shared/types'

export type BookshelfBook = BookRecord & {
  progress: ReadingProgress | null
}

export function useBookshelfData() {
  const [libraryBooks, setLibraryBooks] = useState<BookshelfBook[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    void (async () => {
      const books = await window.api.getAllBooks()
      const booksWithProgress = await Promise.all(
        books.map(async (book) => ({
          ...book,
          progress: await window.api.getProgress(book.id),
        })),
      )

      if (!active) {
        return
      }

      setLibraryBooks(booksWithProgress)
      setLoading(false)
    })()

    return () => {
      active = false
    }
  }, [])

  const recentBooks = [...libraryBooks]
    .filter((book) => book.progress !== null)
    .sort((left, right) => (right.progress?.updatedAt ?? 0) - (left.progress?.updatedAt ?? 0))

  return { libraryBooks, recentBooks, loading }
}
```

- [ ] **Step 4: Re-run the hook test and verify it passes**

Run: `bunx vitest run tests/renderer/use-bookshelf-data.test.tsx`

Expected: PASS with `recentBooks` equal to `['c', 'a']` and `libraryBooks` retaining all books.

- [ ] **Step 5: Commit the shared data hook**

```bash
git add src/renderer/src/hooks/useBookshelfData.ts src/renderer/src/components/bookshelf/BookshelfPage.tsx tests/renderer/use-bookshelf-data.test.tsx
git commit -m "feat: derive library and recent bookshelf data"
```

### Task 3: Implement the Stitch-Style Library View

**Files:**
- Create: `src/renderer/src/components/bookshelf/SidebarNav.tsx`
- Create: `src/renderer/src/components/bookshelf/LibraryView.tsx`
- Create: `src/renderer/src/components/bookshelf/AddToLibraryCard.tsx`
- Create: `src/renderer/src/components/bookshelf/LibraryBookCard.tsx`
- Modify: `src/renderer/src/components/bookshelf/BookshelfPage.tsx`
- Modify: `src/renderer/src/styles/global.css`
- Test: `tests/renderer/bookshelf-page.test.tsx`

- [ ] **Step 1: Write the failing Library layout tests**

```tsx
it('renders the add-to-library tile as the first grid item even when the library is empty', async () => {
  setupApi({ books: [] })

  render(<BookshelfPage activeView="library" onChangeView={vi.fn()} onOpenReader={vi.fn()} />)

  expect(await screen.findByRole('button', { name: 'Add a book to your library' })).toBeInTheDocument()
  expect(screen.queryByText('Drop TXT / EPUB to start your shelf.')).not.toBeInTheDocument()
})

it('renders all imported books after the import tile', async () => {
  setupApi({
    books: [
      { id: 'book-1', title: 'Example Book', author: 'Ghost', format: 'txt', filePath: '/tmp/example.txt', importedAt: 1, updatedAt: 1 },
    ],
  })

  render(<BookshelfPage activeView="library" onChangeView={vi.fn()} onOpenReader={vi.fn()} />)

  expect(await screen.findByRole('button', { name: 'Add a book to your library' })).toBeInTheDocument()
  expect(screen.getByText('Example Book')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the Library tests and verify they fail**

Run: `bunx vitest run tests/renderer/bookshelf-page.test.tsx`

Expected: FAIL because the old header/grid layout still renders the old empty state copy.

- [ ] **Step 3: Implement Sidebar + Library view + import tile**

```tsx
<aside className="sidebar-nav">
  <div className="sidebar-nav__brand">
    <h1>Ghost Reader</h1>
    <p>Nocturnal Monolith</p>
  </div>
  <nav className="sidebar-nav__menu">
    <SidebarNavItem label="Recent" active={activeView === 'recent'} onClick={() => onChangeView('recent')} />
    <SidebarNavItem label="Library" active={activeView === 'library'} onClick={() => onChangeView('library')} />
  </nav>
  <button className="sidebar-nav__settings" type="button" onClick={() => setSettingsOpen(true)}>
    Settings
  </button>
</aside>
```

```tsx
<section className="library-view__grid">
  <button className="add-library-card" type="button" aria-label="Add a book to your library" onClick={() => void onImport()}>
    <span className="add-library-card__icon">+</span>
    <span className="add-library-card__label">Add to Library</span>
  </button>
  {books.map((book) => (
    <LibraryBookCard key={book.id} book={book} onOpen={onOpen} onRemove={onRemove} />
  ))}
</section>
```

```css
.add-library-card {
  aspect-ratio: 2 / 3;
  border-radius: 2rem;
  background: linear-gradient(180deg, rgba(24, 24, 24, 0.72), rgba(10, 10, 10, 0.92));
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(24px);
  transition: transform 300ms ease-out, background 300ms ease-out, border-color 300ms ease-out;
}

.add-library-card:hover {
  transform: scale(1.02);
  border-color: rgba(255, 255, 255, 0.14);
}
```

- [ ] **Step 4: Re-run the Library tests and verify they pass**

Run: `bunx vitest run tests/renderer/bookshelf-page.test.tsx`

Expected: PASS with the import tile visible in both empty and populated library states.

- [ ] **Step 5: Commit the Library view**

```bash
git add src/renderer/src/components/bookshelf/SidebarNav.tsx src/renderer/src/components/bookshelf/LibraryView.tsx src/renderer/src/components/bookshelf/AddToLibraryCard.tsx src/renderer/src/components/bookshelf/LibraryBookCard.tsx src/renderer/src/components/bookshelf/BookshelfPage.tsx src/renderer/src/styles/global.css tests/renderer/bookshelf-page.test.tsx
git commit -m "feat: rebuild library view with stitch grid shell"
```

### Task 4: Implement the Recent View and Empty State

**Files:**
- Create: `src/renderer/src/components/bookshelf/RecentView.tsx`
- Create: `src/renderer/src/components/bookshelf/RecentBookCard.tsx`
- Modify: `src/renderer/src/components/bookshelf/BookshelfPage.tsx`
- Modify: `src/renderer/src/styles/global.css`
- Create: `tests/renderer/recent-view.test.tsx`

- [ ] **Step 1: Write the failing Recent view tests**

```tsx
it('shows only books with progress in the recent view', async () => {
  setupApi({
    books: [
      { id: 'book-1', title: 'Example Book', author: 'Ghost', format: 'txt', filePath: '/tmp/example.txt', importedAt: 1, updatedAt: 1 },
      { id: 'book-2', title: 'Unread Book', author: 'Ghost', format: 'txt', filePath: '/tmp/unread.txt', importedAt: 2, updatedAt: 2 },
    ],
    progressByBookId: {
      'book-1': { bookId: 'book-1', percentage: 0.42, updatedAt: 20 },
      'book-2': null,
    },
  })

  render(<BookshelfPage activeView="recent" onChangeView={vi.fn()} onOpenReader={vi.fn()} />)

  expect(await screen.findByText('Example Book')).toBeInTheDocument()
  expect(screen.queryByText('Unread Book')).not.toBeInTheDocument()
})

it('renders a centered placeholder panel when recent is empty', async () => {
  setupApi({ books: [], progressByBookId: {} })

  render(<BookshelfPage activeView="recent" onChangeView={vi.fn()} onOpenReader={vi.fn()} />)

  expect(await screen.findByText('No recent reading yet')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Go to library' })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the Recent tests and verify they fail**

Run: `bunx vitest run tests/renderer/recent-view.test.tsx`

Expected: FAIL because `RecentView` does not exist and the current page cannot render the centered recent placeholder.

- [ ] **Step 3: Implement the Recent view using hydrated progress data**

```tsx
export function RecentView({ books, onOpen, onGoToLibrary }: RecentViewProps) {
  if (books.length === 0) {
    return (
      <section className="recent-view recent-view--empty">
        <div className="recent-empty-card">
          <h2>No recent reading yet</h2>
          <p>Open a book from your library to build a recent trail.</p>
          <button type="button" aria-label="Go to library" onClick={onGoToLibrary}>
            Go to Library
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="recent-view__list">
      {books.map((book) => (
        <RecentBookCard key={book.id} book={book} onOpen={onOpen} />
      ))}
    </section>
  )
}
```

```tsx
<article className="recent-book-card" onClick={() => void onOpen(book.id)}>
  <div className="recent-book-card__cover">{/* cover */}</div>
  <div className="recent-book-card__body">
    <p className="recent-book-card__progress">{Math.round((book.progress?.percentage ?? 0) * 100)}% read</p>
    <h2>{book.title}</h2>
    <p>{book.author}</p>
    <div className="recent-book-card__footer">
      <span>{formatRelativeTime(book.progress?.updatedAt ?? 0)}</span>
      <div className="recent-book-card__bar">
        <div style={{ width: `${Math.round((book.progress?.percentage ?? 0) * 100)}%` }} />
      </div>
    </div>
  </div>
</article>
```

- [ ] **Step 4: Re-run the Recent tests and verify they pass**

Run: `bunx vitest run tests/renderer/recent-view.test.tsx`

Expected: PASS with unread books filtered out and the empty placeholder visible when no progress-backed books exist.

- [ ] **Step 5: Commit the Recent view**

```bash
git add src/renderer/src/components/bookshelf/RecentView.tsx src/renderer/src/components/bookshelf/RecentBookCard.tsx src/renderer/src/components/bookshelf/BookshelfPage.tsx src/renderer/src/styles/global.css tests/renderer/recent-view.test.tsx
git commit -m "feat: add recent reading cards and empty state"
```

### Task 5: Match the Stitch Interaction Layer and Final Integration

**Files:**
- Modify: `src/renderer/src/components/chrome/AppFrame.tsx`
- Modify: `src/renderer/src/components/bookshelf/BookshelfPage.tsx`
- Modify: `src/renderer/src/styles/global.css`
- Modify: `tests/renderer/app-shell.test.tsx`
- Modify: `tests/renderer/bookshelf-page.test.tsx`
- Modify: `tests/renderer/recent-view.test.tsx`

- [ ] **Step 1: Write the failing integration assertions for final shell polish**

```tsx
it('keeps settings in the left rail and the pin control in the immersive frame chrome', async () => {
  setupApi(null)

  render(<App />)

  expect(await screen.findByRole('button', { name: 'Open settings' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Pin window' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Import Books' })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the full renderer suite for affected areas and verify a failure remains**

Run: `bunx vitest run tests/renderer/app-shell.test.tsx tests/renderer/bookshelf-page.test.tsx tests/renderer/recent-view.test.tsx tests/renderer/use-bookshelf-data.test.tsx`

Expected: FAIL until the final chrome labels and shell action placement match the new architecture.

- [ ] **Step 3: Finish the Stitch-level chrome and interaction styling**

```tsx
<header className="app-frame__titlebar">
  <div className="app-frame__spacer" />
  <div className="app-frame__actions no-drag">
    <button aria-label={pinAriaLabel} className={`app-frame__pin ${alwaysOnTop ? 'app-frame__pin--active' : ''}`}>
      {alwaysOnTop ? 'Pinned' : 'Pin'}
    </button>
  </div>
</header>
```

```css
.sidebar-nav__item {
  border-radius: 1.5rem;
  color: rgba(172, 171, 170, 0.82);
  transition:
    transform 300ms ease-out,
    background 300ms ease-out,
    color 300ms ease-out,
    box-shadow 300ms ease-out;
}

.sidebar-nav__item:hover {
  transform: scale(1.02);
  background: rgba(255, 255, 255, 0.05);
}

.sidebar-nav__item--active {
  background: linear-gradient(180deg, rgba(58, 58, 58, 0.52), rgba(26, 26, 26, 0.52));
  color: rgba(245, 245, 245, 0.96);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.recent-book-card:hover,
.library-book-card:hover {
  transform: scale(1.01);
}

.recent-book-card:active,
.add-library-card:active,
.library-book-card:active {
  transform: scale(0.99);
}
```

- [ ] **Step 4: Run full verification**

Run: `bunx vitest run tests/renderer/app-shell.test.tsx tests/renderer/bookshelf-page.test.tsx tests/renderer/recent-view.test.tsx tests/renderer/use-bookshelf-data.test.tsx`

Expected: PASS for all updated renderer tests.

Run: `bun run build`

Expected: PASS and Electron renderer bundle builds without type or import errors.

- [ ] **Step 5: Commit the integrated shell redesign**

```bash
git add src/renderer/src/components/chrome/AppFrame.tsx src/renderer/src/components/bookshelf/BookshelfPage.tsx src/renderer/src/styles/global.css tests/renderer/app-shell.test.tsx tests/renderer/bookshelf-page.test.tsx tests/renderer/recent-view.test.tsx tests/renderer/use-bookshelf-data.test.tsx
git commit -m "feat: ship stitch-inspired library and recent shell"
```

## Self-Review

### Spec coverage

- 左侧导航只保留 `Recent / Library / Settings`：Task 1, Task 3, Task 5
- `Library` 使用网格首卡 `Add to Library`：Task 3
- `Recent` 只显示有进度的书并按最后阅读时间排序：Task 2, Task 4
- `Recent` 空状态显示居中占位面板：Task 4
- 移除 `Store`、用户信息和侧边栏导入按钮：Task 1, Task 3, Task 5
- 尽量贴近 Stitch 样式与交互：Task 3, Task 4, Task 5
- 保持阅读器入口与返回路径：Task 1, Task 5

### Placeholder scan

- 没有使用 `TBD`、`TODO` 或“类似上一任务”之类的占位描述。
- 每个任务都给出了明确文件、测试入口、命令和实现代码片段。

### Type consistency

- 壳层视图统一使用 `'recent' | 'library'`
- 阅读器页面仍然由 `currentBookId` 与 `AppPage = 'home' | 'reader'` 驱动
- `Recent` 排序统一以 `ReadingProgress.updatedAt` 为准

