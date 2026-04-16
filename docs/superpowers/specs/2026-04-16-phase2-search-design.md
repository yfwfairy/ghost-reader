# Phase 2：书架搜索功能

## Context

Phase 1 中搜索框被设为 `disabled` 状态（`opacity: 0.4, cursor: not-allowed`），等待 Phase 2 启用。现在需要实现完整的图书馆实时搜索过滤功能。

**现状**：
- 搜索框 UI 已存在于 `LibraryView.tsx:28-31`，有折叠/展开的 CSS 动画
- `BookRecord` 可搜索字段：`title`（书名）、`author`（作者）
- i18n 已有 `library.search` key（`'Filter archive...'`）
- 数据源：`useBookshelfData()` 返回的 `libraryBooks: BookshelfBook[]`

---

## 修改文件

### 步骤 1：LibraryView.tsx — 启用搜索 + 过滤逻辑

**文件**：`src/renderer/src/components/bookshelf/LibraryView.tsx`

1. **添加搜索状态**：`const [query, setQuery] = useState('')`
2. **移除 disabled**：去掉 `disabled style={{ opacity: 0.4, cursor: 'not-allowed' }}`，绑定 `value={query}` + `onChange`
3. **过滤逻辑**：在组件内计算过滤后的书籍列表

```tsx
const filteredBooks = useMemo(() => {
  const q = query.trim().toLowerCase()
  if (!q) return books
  return books.filter((book) =>
    book.title.toLowerCase().includes(q) ||
    book.author.toLowerCase().includes(q)
  )
}, [books, query])
```

4. **渲染过滤结果**：grid 中使用 `filteredBooks` 替代 `books`
5. **副标题联动**：`books.length` 部分改为显示过滤数量
   - 无搜索时：`{0} book(s) on shelf`
   - 搜索时：`{0} / {1}` 格式（如 `3 / 12`）
6. **空搜索结果状态**：搜索无匹配时显示空状态提示
7. **搜索时隐藏 AddToLibraryCard**：有搜索关键词时不显示添加卡片
8. **清除按钮**：输入框有内容时显示 `close` 图标，点击清空搜索

### 步骤 2：i18n — 新增搜索相关 key

**文件**：`src/shared/i18n/en.ts`、`zh.ts`、`zh-TW.ts`

| Key | en | zh | zh-TW |
|-----|----|----|-------|
| `library.searchResult` | `'Found {0} matching book(s)'` | `'找到匹配的 {0} 本书'` | `'找到匹配的 {0} 本書'` |
| `library.searchEmpty` | `'No books match your search'` | `'没有找到匹配的书籍'` | `'沒有找到匹配的書籍'` |

### 步骤 3：global.css — 搜索框样式调整

**文件**：`src/renderer/src/styles/global.css`

1. **移除禁用相关样式**（如有内联 style 已移除则无需额外操作）
2. **清除按钮样式**：搜索框内的 `close` 图标按钮
3. **搜索激活状态**：输入框有内容时保持展开（不依赖 hover）
4. **空状态样式**：搜索无结果时的提示布局

---

## 验证

1. `bun run typecheck && bun run lint` — 无错误
2. 手动验证：
   - 搜索框 hover 展开、点击聚焦、输入文字实时过滤
   - 按书名和作者都能搜到
   - 中英文搜索不区分大小写
   - 清除按钮一键清空搜索
   - 空搜索结果显示提示
   - 三种语言下文案正确
   - 暗色/浅色主题样式正常
