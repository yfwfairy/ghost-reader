# v0.1.0 合并发布与版本规划

## 概述

将 `feat/ghost-reader-v1` 分支 squash 合并到 `main`，打 `v0.1.0` tag 触发自动发布，然后创建新分支开始 v0.2.0 开发。

## 当前状态

- `feat/ghost-reader-v1`：54 个提交，包含 v0.1.0 全部功能
- `main`：领先 feat 1 个提交（`4f1769b 删除多余文件`）
- 远程 HEAD 指向 `feat/ghost-reader-v1`（需改为 `main`）
- 已有 CI（`ci.yml`）和 Release（`release.yml`）两条 workflow

## 执行步骤

### 1. Squash 合并 feat → main

```bash
git checkout main
git merge --squash feat/ghost-reader-v1
git commit -m "feat: Ghost Reader v0.1.0"
```

54 个提交压缩为 1 个，main 历史保持干净。main 上多出的 `4f1769b` 提交在 squash 时自动处理。

### 2. 打 tag 并推送

```bash
git tag v0.1.0
git push origin main --tags
```

推送后 `release.yml` 自动触发：构建 macOS x64 + arm64 DMG，创建 GitHub Release。

### 3. 更新 CI 触发分支

修改 `.github/workflows/ci.yml`：

```yaml
on:
  push:
    branches: [main, feat/*]
  pull_request:
    branches: [main]
```

将硬编码的 `feat/ghost-reader-v1` 改为通配 `feat/*`，支持未来所有功能分支。

### 4. 设置远程默认分支

在 GitHub 仓库 Settings → Default branch 中将默认分支从 `feat/ghost-reader-v1` 改为 `main`。

### 5. 清理旧分支

```bash
git branch -d feat/ghost-reader-v1
git push origin --delete feat/ghost-reader-v1
```

### 6. 创建 v0.2.0 开发分支

```bash
git checkout -b feat/ghost-reader-v2
# 更新 package.json 版本号为 0.2.0
git push -u origin feat/ghost-reader-v2
```

## 版本工作流规范（后续适用）

```
main (稳定发布)
 └── feat/ghost-reader-vX (版本开发)
      ├── 日常提交...
      └── 完成后 squash merge → main → tag vX.Y.Z → 自动发布
```

- **main**：永远是最新的稳定发布版本，只通过 squash merge 接收代码
- **feat/ghost-reader-vX**：版本开发分支，完成后合并回 main
- **tag vX.Y.Z**：触发 release workflow 自动构建发布
- 每个版本发布后删除旧分支，创建新版本分支

## 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `.github/workflows/ci.yml` | 修改 | 触发分支改为 `main` + `feat/*` |
| `package.json` | 修改 | 版本号改为 `0.2.0`（在新分支上） |
