# Changelog

本项目所有重要变更记录。格式基于 [Keep a Changelog](https://keepachangelog.com/)。

## [Unreleased]

## [0.3.0] - 2026-05-06

### Added

- 自定义主题色：ColorTheme 新增 custom 类型，支持自由选择背景色和文字色
- CustomThemePanel 取色面板组件（拾色器 + HEX 输入 + 系统取色器）
- resolveTheme / lerpColor 主题解析工具函数
- Ghost 设置面板：左右预览布局 + draft 状态 + Apply/Cancel 操作模式
- 窗口透明度控制（80%~100%），通过 BrowserWindow.setOpacity() 原生实现
- 沉浸模式隐藏 macOS 红绿灯按钮
- i18n 新增自定义主题色、透明度相关翻译

### Changed

- 外观面板重构为「基础设置」和「Ghost 设置」两大分区
- TxtRenderer / EpubRenderer 改用 themeTextColor prop 替代 THEME_MAP 查找
- ReaderPage 使用 resolveTheme 统一驱动 CSS 变量
- NOISE_MAP 类型改为 Partial，不含 custom 键
- AppConfig 新增 customThemeBg、customThemeText、fontWeight、pageMargin、opacity 字段

### Fixed

- 自定义色块背景覆盖 + 取色面板自适应布局
- 沉浸模式下章节导航按钮阻止冒泡，避免退出沉浸模式
- 阅读器最小窗口高度和内容区 padding

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

[unreleased]: https://github.com/yfwfairy/ghost-reader/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/yfwfairy/ghost-reader/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/yfwfairy/ghost-reader/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/yfwfairy/ghost-reader/releases/tag/v0.1.0
