# Settings App Version Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the settings panel display the real packaged app version instead of a hard-coded string.

**Architecture:** Add a small `app:get-version` IPC handler in the main process, expose it through `preload`, and let `SettingsPanel` load the version on mount. Keep the renderer unaware of Electron internals and follow the existing `window.api` bridge pattern.

**Tech Stack:** Electron 35 + React 19 + TypeScript + Vitest

---

## File Structure

| File | Responsibility |
|------|------|
| `src/main/ipc-handlers.ts` | Register `app:get-version` and return `app.getVersion()` |
| `src/preload/index.ts` | Expose `getAppVersion()` on `window.api` |
| `src/shared/types.ts` | Extend `GhostReaderApi` with `getAppVersion()` |
| `src/renderer/src/components/settings/SettingsPanel.tsx` | Load and render app version instead of a hard-coded label |
| `tests/main/ipc-handlers.test.ts` | Verify `app:get-version` returns the Electron app version |
| `tests/renderer/settings-panel.test.tsx` | Verify the panel reads and renders the bridged version |
| `tests/renderer/bookshelf-page.test.tsx` | Keep the page-level API mock aligned with the new bridge method |

---

### Task 1: Add failing tests

**Files:**
- Modify: `tests/main/ipc-handlers.test.ts`
- Modify: `tests/renderer/settings-panel.test.tsx`
- Modify: `tests/renderer/bookshelf-page.test.tsx`

- [ ] **Step 1: Add a renderer test for version loading**

Write a test that mounts `SettingsPanel`, mocks `window.api.getAppVersion()` to resolve a version string, and expects that version to appear in the footer.

- [ ] **Step 2: Run the renderer test to verify it fails**

Run: `bunx vitest run tests/renderer/settings-panel.test.tsx`
Expected: FAIL because `SettingsPanel` still renders a hard-coded version or never calls `window.api.getAppVersion()`.

- [ ] **Step 3: Add a main-process test for IPC**

Write a test that registers IPC handlers, invokes `app:get-version`, and expects it to return the mocked Electron app version.

- [ ] **Step 4: Run the main-process test to verify it fails**

Run: `bunx vitest run tests/main/ipc-handlers.test.ts`
Expected: FAIL because `app:get-version` is not registered yet.

---

### Task 2: Implement the version bridge

**Files:**
- Modify: `src/main/ipc-handlers.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/shared/types.ts`
- Modify: `src/renderer/src/components/settings/SettingsPanel.tsx`

- [ ] **Step 1: Add `app:get-version` in the main process**

Return `app.getVersion()` from a new IPC handler near the existing config and window handlers.

- [ ] **Step 2: Expose `getAppVersion()` from preload**

Add a `window.api.getAppVersion()` method that invokes `app:get-version`.

- [ ] **Step 3: Update the shared API type**

Extend `GhostReaderApi` so the renderer bridge stays typed.

- [ ] **Step 4: Read the version in `SettingsPanel`**

Load the version during mount, keep a local state string, and render the resolved value instead of the hard-coded `v0.1.0-obsidian`.

---

### Task 3: Verify

**Files:**
- No additional code changes required

- [ ] **Step 1: Re-run targeted tests**

Run: `bunx vitest run tests/main/ipc-handlers.test.ts tests/renderer/settings-panel.test.tsx tests/renderer/bookshelf-page.test.tsx`
Expected: PASS

- [ ] **Step 2: Sanity-check for type fallout**

Run: `bunx vitest run tests/renderer/settings-panel.test.tsx`
Expected: PASS with the footer showing the resolved version.
