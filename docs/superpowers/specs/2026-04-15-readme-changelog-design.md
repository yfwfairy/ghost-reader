# Ghost Reader 开源文档设计

## 概述

为 Ghost Reader 项目创建 README.md 和 CHANGELOG.md，使其具备开源发布的基本文档标准。

## 范围

| 文件 | 操作 | 格式 |
|------|------|------|
| README.md | 新建 | 混合型（用户面 + 开发者面） |
| CHANGELOG.md | 新建 | Keep a Changelog 标准 |

不包含：CONTRIBUTING.md、LICENSE（已有或暂不需要）。

---

## README.md 结构

### 用户面（上半部分）

1. **标题 + 一句话介绍**
   - `# Ghost Reader 👻`
   - 副标题：`> A ghostly reading companion for TXT and EPUB books.`
   - Badge：Release 版本、License

2. **功能特色**（`## ✨ 功能特色`）
   - 8 个要点，带 emoji 前缀
   - TXT/EPUB 支持、8 款主题、书架管理、阅读进度、章节导航、沉浸模式、自定义排版、多语言

3. **截图**（`## 📸 截图`）
   - 占位 TODO 注释，后续补充书架界面和阅读界面截图

4. **下载安装**（`## 📦 下载安装`）
   - 指向 GitHub Releases
   - 表格列出 macOS Intel / Apple Silicon 两种架构的 DMG 文件

### 分隔线

用 `---` 分隔用户面和开发者面。

### 开发者面（下半部分）

5. **本地开发**（`## 🛠 本地开发`）
   - 环境要求：Node.js 22+, Bun
   - 命令：`bun install` → `bun run dev` → `bun run lint` / `bun run typecheck` / `bun run test`

6. **技术栈**（`## 🏗 技术栈`）
   - 表格形式：框架（Electron 35 + electron-vite）、前端（React 19 + TypeScript 5）、EPUB 解析（epub.js）、编码检测（chardet + iconv-lite）、包管理（Bun）、打包（electron-builder）

7. **项目结构**（`## 📁 项目结构`）
   - `src/` 一级目录树：main、preload、renderer（含 components、hooks、i18n、stores、styles）

8. **License**（`## 📄 License`）
   - MIT

---

## CHANGELOG.md 结构

采用 [Keep a Changelog](https://keepachangelog.com/) 标准格式。

### 文件头

- 标题：`# Changelog`
- 说明：格式基于 Keep a Changelog

### 版本条目

1. **[Unreleased]** — 空段落，用于后续开发记录
2. **[0.1.0] - 2025-xx-xx** — 首个版本
   - `### Added` 分类下列出所有初始功能：
     - 书架管理（最近阅读 + 书库双视图）
     - TXT 和 EPUB 格式阅读支持
     - 8 款阅读主题
     - 自动保存阅读进度
     - EPUB 章节目录导航
     - 沉浸式全屏阅读模式
     - 自定义字体、字号、行高
     - 多语言支持
     - macOS 双架构打包
     - GitHub Actions 自动化构建发布

### 底部链接

```markdown
[unreleased]: https://github.com/user/ghost-reader/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/user/ghost-reader/releases/tag/v0.1.0
```

---

## 设计决策

1. **混合型 README** — 上半用户面 + 下半开发者面，用分隔线区分，两类读者各取所需
2. **截图占位** — 先 TODO 标记，不阻塞文档发布，后续补充实际截图
3. **Keep a Changelog** — 国际通用标准，分类清晰，便于后续版本维护
4. **中文 CHANGELOG 内容** — 与项目的中文注释风格一致，功能描述用中文
