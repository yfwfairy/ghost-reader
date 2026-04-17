# Changelog

本项目所有重要变更记录。格式基于 [Keep a Changelog](https://keepachangelog.com/)。

## [Unreleased]

## [0.2.0] - 2026-04-17

### Added

- 拖放导入
- 键盘快捷键绑定（↑↓ 滚行、章节翻页、沉浸模式切换等）
- 书架搜索功能（实时过滤书名 / 作者）
- 阅读器沉浸式新手引导（首次打开书籍时展示操作提示）
- 字体选择器分组
- 阅读器加载 / 错误占位 UI（静态噪点动画卡片）
- 主题专属噪点纹理叠加层 + 外观面板纹理开关

### Performance

- 字体按需加载 + React.lazy 代码分割 + epubjs 动态导入
- EPUB locations 缓存 + 进度保存防抖
- Vite 构建优化（manualChunks）+ 窗口启动优化

## [0.1.0] - 2026-04-15

### Added

- 书架管理：最近阅读 + 书库双视图
- TXT 和 EPUB 格式阅读支持
- 8 款阅读主题（黑曜石、羊皮纸、午夜、缟玛瑙、余烬、森林、海洋、石板）
- 应用主题深浅切换
- 自动保存阅读进度（TXT 滚动位置 / EPUB 精确书签）
- EPUB 章节目录导航
- 沉浸式全屏阅读模式
- 自定义字体、字号、行高
- 多语言支持（English / 简体中文 / 繁體中文）
- macOS 双架构打包（Intel + Apple Silicon）
- GitHub Actions 自动化构建发布

[unreleased]: https://github.com/yfwfairy/ghost-reader/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/yfwfairy/ghost-reader/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/yfwfairy/ghost-reader/releases/tag/v0.1.0
